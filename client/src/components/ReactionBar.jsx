import { useRef } from 'react';

const REACTIONS = ['😂', '🔥', '💀', '👏', '🤯', '💩'];

export default function ReactionBar({ onReaction, disabled }) {
  const lastClickRef = useRef(0);

  const handleClick = (emoji) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    lastClickRef.current = now;
    onReaction(emoji);
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-1.5">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          disabled={disabled}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-light hover:bg-surface-lighter active:scale-90 transition-all text-lg disabled:opacity-30 disabled:cursor-not-allowed"
          title={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
