import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Web Audio API synthesizer for meme sound effects.
 * No external files needed — generates sounds from oscillators and noise.
 */
export default function useSoundboard(socket) {
  const ctxRef = useRef(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const gainRef = useRef(null);

  // Lazy-init AudioContext on first interaction
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AudioCtx();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Update gain when volume/mute changes
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const createNoise = useCallback((ctx, duration) => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }, []);

  const sounds = useMemo(() => ({
    airhorn: (ctx, output) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(500, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      osc.connect(g).connect(output);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    },

    bruh: (ctx, output) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.4);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(g).connect(output);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    },

    sadtrombone: (ctx, output) => {
      const notes = [350, 330, 310, 233];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        const t = ctx.currentTime + i * 0.35;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * 0.95, t + 0.3);
        g.gain.setValueAtTime(0.25, t);
        g.gain.linearRampToValueAtTime(0, t + 0.32);
        osc.connect(g).connect(output);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    },

    vineboom: (ctx, output) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      g.gain.setValueAtTime(0.7, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(g).connect(output);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },

    wow: (ctx, output) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.8);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc.connect(g).connect(output);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    },

    fart: (ctx, output) => {
      const noise = createNoise(ctx, 0.5);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      noise.connect(filter).connect(g).connect(output);
      noise.start();
      noise.stop(ctx.currentTime + 0.5);

      const osc = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.4);
      g2.gain.setValueAtTime(0.15, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(g2).connect(output);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    },

    drumroll: (ctx, output) => {
      for (let i = 0; i < 20; i++) {
        const noise = createNoise(ctx, 0.06);
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.05;
        g.gain.setValueAtTime(0.15 + (i / 20) * 0.2, t);
        g.gain.linearRampToValueAtTime(0, t + 0.06);
        noise.connect(g).connect(output);
        noise.start(t);
        noise.stop(t + 0.06);
      }
      // Final hit
      const finalNoise = createNoise(ctx, 0.15);
      const fg = ctx.createGain();
      const ft = ctx.currentTime + 1.0;
      fg.gain.setValueAtTime(0.5, ft);
      fg.gain.exponentialRampToValueAtTime(0.01, ft + 0.2);
      finalNoise.connect(fg).connect(output);
      finalNoise.start(ft);
      finalNoise.stop(ft + 0.2);
    },

    crickets: (ctx, output) => {
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.2;
        osc.frequency.setValueAtTime(4000 + Math.random() * 500, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.08);
        g.gain.linearRampToValueAtTime(0.15, t + 0.1);
        g.gain.linearRampToValueAtTime(0, t + 0.16);
        osc.connect(g).connect(output);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    },
  }), [createNoise]);

  const playSound = useCallback((soundName) => {
    try {
      const ctx = getCtx();
      const fn = sounds[soundName];
      if (fn) fn(ctx, gainRef.current);
    } catch (err) {
      console.warn('Sound playback error:', err);
    }
  }, [getCtx, sounds]);

  // Listen for remote play-sound events
  useEffect(() => {
    if (!socket) return;

    const handleRemoteSound = ({ sound }) => {
      playSound(sound);
    };

    socket.on('play-sound', handleRemoteSound);
    return () => socket.off('play-sound', handleRemoteSound);
  }, [socket, playSound]);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

  return { playSound, volume, setVolume, isMuted, toggleMute };
}
