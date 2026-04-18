import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Socket.IO audio relay voice chat ───
// No WebRTC / simple-peer needed. Audio is captured via Web Audio API,
// down-sampled to 8 kHz mono, and relayed through the server.
// Works behind any NAT / firewall and scales to 9+ players.

const TARGET_SAMPLE_RATE = 8000;
const CHUNK_SAMPLES = 1600; // 200 ms at 8 kHz
const VAD_THRESHOLD = 0.008;

export default function useVoiceChat(socket, roomCode, playerId) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState({});
  const [micError, setMicError] = useState(null);

  const streamRef = useRef(null);
  const captureCtxRef = useRef(null);
  const captureNodeRef = useRef(null);
  const playbackCtxRef = useRef(null);
  const peerPlaybackRef = useRef({}); // { peerId: { nextPlayTime } }
  const speakTimersRef = useRef({});
  const voiceActiveRef = useRef(false);
  const isMutedRef = useRef(false);

  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // ── helpers ──

  const downsample = useCallback((buffer, fromRate) => {
    if (fromRate === TARGET_SAMPLE_RATE) return buffer;
    const ratio = fromRate / TARGET_SAMPLE_RATE;
    const len = Math.floor(buffer.length / ratio);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) out[i] = buffer[Math.floor(i * ratio)];
    return out;
  }, []);

  const float32ToInt16 = useCallback((f32) => {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return i16;
  }, []);

  const int16ToFloat32 = useCallback((i16) => {
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) {
      f32[i] = i16[i] / (i16[i] < 0 ? 0x8000 : 0x7fff);
    }
    return f32;
  }, []);

  const hasVoice = useCallback((samples) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length) > VAD_THRESHOLD;
  }, []);

  // ── mark peer as speaking (auto-clears after 300 ms of silence) ──

  const markSpeaking = useCallback((peerId) => {
    setSpeakingPeers((prev) => ({ ...prev, [peerId]: true }));
    if (speakTimersRef.current[peerId]) clearTimeout(speakTimersRef.current[peerId]);
    speakTimersRef.current[peerId] = setTimeout(() => {
      setSpeakingPeers((prev) => ({ ...prev, [peerId]: false }));
    }, 300);
  }, []);

  // ── playback: schedule received PCM via AudioBufferSourceNode ──

  const playChunk = useCallback((float32, peerId) => {
    let ctx = playbackCtxRef.current;
    if (!ctx) {
      ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      playbackCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') ctx.resume();

    const buf = ctx.createBuffer(1, float32.length, TARGET_SAMPLE_RATE);
    buf.copyToChannel(float32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const state = peerPlaybackRef.current[peerId];
    const now = ctx.currentTime;

    if (!state || state.nextPlayTime < now) {
      const start = now + 0.05;
      src.start(start);
      peerPlaybackRef.current[peerId] = { nextPlayTime: start + buf.duration };
    } else {
      src.start(state.nextPlayTime);
      state.nextPlayTime += buf.duration;
    }
  }, []);

  // ── capture: mic → downsample → VAD → socket emit ──

  const setupCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      streamRef.current = stream;
      setMicError(null);

      const ctx = new AudioContext();
      captureCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      let sampleBuf = new Float32Array(0);

      processor.onaudioprocess = (e) => {
        if (!voiceActiveRef.current || isMutedRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const ds = downsample(input, ctx.sampleRate);

        const merged = new Float32Array(sampleBuf.length + ds.length);
        merged.set(sampleBuf);
        merged.set(ds, sampleBuf.length);
        sampleBuf = merged;

        while (sampleBuf.length >= CHUNK_SAMPLES) {
          const chunk = sampleBuf.slice(0, CHUNK_SAMPLES);
          sampleBuf = sampleBuf.slice(CHUNK_SAMPLES);
          if (hasVoice(chunk)) {
            socket?.emit('voice-data', float32ToInt16(chunk).buffer);
          }
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination); // needed for ScriptProcessor to fire
      captureNodeRef.current = processor;
      return true;
    } catch {
      setMicError('Microphone access denied. Please allow mic access to use voice chat.');
      return false;
    }
  }, [socket, downsample, float32ToInt16, hasVoice]);

  // ── receive audio from server ──

  useEffect(() => {
    if (!socket) return;

    const handleVoiceData = ({ from, data }) => {
      if (!voiceActiveRef.current || from === playerId) return;
      const f32 = int16ToFloat32(new Int16Array(data));
      playChunk(f32, from);
      markSpeaking(from);
    };

    const handlePeerLeft = ({ peerId }) => {
      delete peerPlaybackRef.current[peerId];
      setSpeakingPeers((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };

    socket.on('voice-data', handleVoiceData);
    socket.on('voice-peer-left', handlePeerLeft);
    return () => {
      socket.off('voice-data', handleVoiceData);
      socket.off('voice-peer-left', handlePeerLeft);
    };
  }, [socket, playerId, int16ToFloat32, playChunk, markSpeaking]);

  // ── cleanup ──

  const cleanupAll = useCallback(() => {
    if (captureNodeRef.current) { captureNodeRef.current.disconnect(); captureNodeRef.current = null; }
    if (captureCtxRef.current) { captureCtxRef.current.close().catch(() => {}); captureCtxRef.current = null; }
    if (playbackCtxRef.current) { playbackCtxRef.current.close().catch(() => {}); playbackCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    peerPlaybackRef.current = {};
    for (const t of Object.values(speakTimersRef.current)) clearTimeout(t);
    speakTimersRef.current = {};
    setSpeakingPeers({});
  }, []);

  // ── public controls ──

  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      cleanupAll();
      setVoiceActive(false);
      setIsMuted(false);
      voiceActiveRef.current = false;
      socket?.emit('voice-leave');
    } else {
      const ok = await setupCapture();
      if (!ok) return;
      setVoiceActive(true);
      setIsMuted(false);
      voiceActiveRef.current = true;
      socket?.emit('voice-join');
    }
  }, [voiceActive, setupCapture, cleanupAll, socket]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  return { voiceActive, isMuted, toggleVoice, toggleMute, speakingPeers, micError };
}
