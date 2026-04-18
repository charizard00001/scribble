export default function WordHint({ hint }) {
  if (!hint || hint.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {hint.map((char, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center font-mono text-lg font-bold transition-all duration-300 ${
            char === ' '
              ? 'w-3'
              : char === '_'
              ? 'w-6 h-8 border-b-2 border-text-muted/50 text-transparent'
              : 'w-6 h-8 border-b-2 border-primary text-primary animate-confetti-pop'
          }`}
        >
          {char === ' ' ? '' : char === '_' ? '\u00A0' : char.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
