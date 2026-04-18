import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let SimplePeerModule = null;
async function getSimplePeer() {
  if (!SimplePeerModule) {
    const mod = await import('simple-peer');
    SimplePeerModule = mod.default || mod;
  }
  return SimplePeerModule;
}

export default function useVoiceChat(socket, roomCode, playerId) {
  const [voiceActive, setVoiceActive] = useState(false); // whether user has opted into voice
  const [isMuted, setIsMuted] = useState(true);
  const [speakingPeers, setSpeakingPeers] = useState({});
  const [micError, setMicError] = useState(null);

  const peersRef = useRef({});
  const streamRef = useRef(null);
  const analyserMapRef = useRef({});
  const animFrameRef = useRef(null);
  const voiceActiveRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    voiceActiveRef.current = voiceActive;
  }, [voiceActive]);

  const getStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      // Start with mic enabled (user just opted in)
      stream.getAudioTracks().forEach((t) => (t.enabled = true));
      setMicError(null);
      return stream;
    } catch (err) {
      setMicError('Microphone access denied. Please allow mic access to use voice chat.');
      return null;
    }
  }, []);

  const cleanupPeer = useCallback((peerId) => {
    const peer = peersRef.current[peerId];
    if (peer) {
      peer.destroy();
      delete peersRef.current[peerId];
    }
    if (analyserMapRef.current[peerId]) {
      delete analyserMapRef.current[peerId];
    }
    setSpeakingPeers((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const setupSpeakingDetection = useCallback((peerId, stream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserMapRef.current[peerId] = analyser;
    } catch {
      // AudioContext not available
    }
  }, []);

  const createPeer = useCallback(
    async (targetId, initiator, stream) => {
      const SimplePeer = await getSimplePeer();
      const peer = new SimplePeer({
        initiator,
        stream,
        trickle: true,
        config: { iceServers: ICE_SERVERS },
      });

      peer.on('signal', (signal) => {
        socket?.emit('voice-signal', { to: targetId, signal });
      });

      peer.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(() => {});
        setupSpeakingDetection(targetId, remoteStream);
      });

      peer.on('close', () => cleanupPeer(targetId));
      peer.on('error', (err) => {
        console.warn(`Peer error with ${targetId}:`, err.message);
        cleanupPeer(targetId);
      });

      peersRef.current[targetId] = peer;
      return peer;
    },
    [socket, setupSpeakingDetection, cleanupPeer]
  );

  // Speaking detection loop — only runs when voice is active
  useEffect(() => {
    if (!voiceActive) return;

    const detect = () => {
      const updates = {};
      for (const [peerId, analyser] of Object.entries(analyserMapRef.current)) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        updates[peerId] = avg > 15;
      }
      setSpeakingPeers(updates);
      animFrameRef.current = requestAnimationFrame(detect);
    };
    animFrameRef.current = requestAnimationFrame(detect);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voiceActive]);

  // Voice signaling — only respond to signals when voice is active
  useEffect(() => {
    if (!socket || !roomCode) return;

    const handleVoiceSignal = async ({ from, signal }) => {
      if (!voiceActiveRef.current) return;

      let peer = peersRef.current[from];
      if (!peer) {
        const stream = streamRef.current;
        if (!stream) return;
        peer = await createPeer(from, false, stream);
      }
      try {
        peer.signal(signal);
      } catch (err) {
        console.warn('Signal error:', err.message);
      }
    };

    const handlePeerJoined = async ({ peerId }) => {
      if (!voiceActiveRef.current) return;
      if (peerId === playerId) return;
      if (peersRef.current[peerId]) return;

      const stream = streamRef.current;
      if (!stream) return;
      await createPeer(peerId, true, stream);
    };

    const handlePeerLeft = ({ peerId }) => {
      cleanupPeer(peerId);
    };

    socket.on('voice-signal', handleVoiceSignal);
    socket.on('voice-peer-joined', handlePeerJoined);
    socket.on('voice-peer-left', handlePeerLeft);

    return () => {
      socket.off('voice-signal', handleVoiceSignal);
      socket.off('voice-peer-joined', handlePeerJoined);
      socket.off('voice-peer-left', handlePeerLeft);
    };
  }, [socket, roomCode, playerId, createPeer, cleanupPeer]);

  const cleanupAllPeers = useCallback(() => {
    for (const peerId of Object.keys(peersRef.current)) {
      cleanupPeer(peerId);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setSpeakingPeers({});
  }, [cleanupPeer]);

  // Toggle voice on/off (the main control)
  const toggleVoice = useCallback(async () => {
    if (voiceActive) {
      // Turn voice OFF — cleanup everything
      cleanupAllPeers();
      setVoiceActive(false);
      setIsMuted(true);
      voiceActiveRef.current = false;
    } else {
      // Turn voice ON — request mic, join voice mesh
      const stream = await getStream();
      if (!stream) return;
      stream.getAudioTracks().forEach((t) => (t.enabled = true));
      setIsMuted(false);
      setVoiceActive(true);
      voiceActiveRef.current = true;
      // Announce to other peers
      socket?.emit('voice-ready');
    }
  }, [voiceActive, getStream, cleanupAllPeers, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllPeers();
    };
  }, [cleanupAllPeers]);

  return {
    voiceActive,
    isMuted,
    toggleVoice,
    speakingPeers,
    micError,
  };
}
