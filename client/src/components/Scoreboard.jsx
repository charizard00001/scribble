export default function Scoreboard({
  players,
  hostId,
  myId,
  currentDrawer,
  isHost,
  onKick,
  speakingPeers,
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
        Players
      </h3>
      {sorted.map((player) => {
        const isDrawing = player.id === currentDrawer;
        const isSpeaking = speakingPeers[player.id];

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
              isDrawing
                ? 'bg-primary/10 border border-primary/30'
                : player.hasGuessed
                ? 'bg-success/10 border border-success/30'
                : 'bg-surface-light border border-transparent'
            } ${!player.isConnected ? 'opacity-50' : ''}`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  isDrawing
                    ? 'bg-primary/30 text-primary'
                    : player.hasGuessed
                    ? 'bg-success/30 text-success'
                    : 'bg-surface-lighter text-text-muted'
                } ${isSpeaking ? 'ring-2 ring-success animate-pulse-ring' : ''}`}
              >
                {player.avatar || player.name[0].toUpperCase()}
              </div>
              {/* Status icons */}
              {isDrawing && (
                <div className="absolute -bottom-0.5 -right-0.5 text-xs">✏️</div>
              )}
              {player.hasGuessed && !isDrawing && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name & Score */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`text-sm font-medium truncate ${
                  !player.isConnected ? 'line-through' : ''
                }`}>
                  {player.name}
                </span>
                {player.id === myId && (
                  <span className="text-[10px] text-text-muted">(you)</span>
                )}
                {player.id === hostId && (
                  <span className="text-[10px] text-warning">★</span>
                )}
              </div>
              <span className="text-xs font-mono text-text-muted animate-count-up">
                {player.score} pts
              </span>
            </div>

            {/* Kick button */}
            {isHost && player.id !== myId && (
              <button
                onClick={() => onKick(player.id)}
                className="shrink-0 p-1 text-text-muted/30 hover:text-danger transition-colors"
                title="Kick player"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
