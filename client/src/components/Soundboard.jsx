import { useState } from 'react';

const SOUNDS = [
  { id: 'airhorn', emoji: '📯', label: 'Airhorn' },
  { id: 'bruh', emoji: '🗿', label: 'Bruh' },
  { id: 'sadtrombone', emoji: '😢', label: 'Sad Trombone' },
  { id: 'vineboom', emoji: '💥', label: 'Vine Boom' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'fart', emoji: '💨', label: 'Fart' },
  { id: 'drumroll', emoji: '🥁', label: 'Drumroll' },
  { id: 'crickets', emoji: '🦗', label: 'Crickets' },
];

export default function Soundboard({ onPlaySound, volume, onVolumeChange, isMuted, onToggleMute }) {
  const [open, setOpen] = useState(false);

  const handlePlay = (soundId) => {
    onPlaySound(soundId);
  };

  return (
    <div className="border-b border-surface-lighter">
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
      >
        <span className="flex items-center gap-1.5">
          🔊 Soundboard
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-2 animate-fade-in">
          {/* Sounds grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handlePlay(s.id)}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs transition-all active:scale-90 bg-surface-light hover:bg-surface-lighter"
                  title={s.label}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-[10px] text-text-muted truncate w-full text-center">{s.label}</span>
                </button>
            ))}
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                isMuted ? 'text-danger' : 'text-text-muted hover:text-text'
              }`}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="flex-1 h-1 accent-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
