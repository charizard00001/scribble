export default function VoiceControls({ voiceActive, onToggleVoice, micError, compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleVoice}
          className={`p-1.5 rounded-lg transition-colors ${
            voiceActive
              ? 'text-success bg-success/10'
              : 'text-text-muted hover:text-text'
          }`}
          title={voiceActive ? 'Turn off mic' : 'Turn on mic'}
        >
          {voiceActive ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </svg>
          )}
        </button>
        {micError && (
          <span className="text-[10px] text-danger">Mic denied</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onToggleVoice}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 ${
          voiceActive
            ? 'bg-success/20 text-success border border-success/30'
            : 'bg-surface-light text-text-muted hover:bg-surface-lighter'
        }`}
      >
        {voiceActive ? (
          <>
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm font-medium">Mic On</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </svg>
            <span className="text-sm font-medium">Enable Mic</span>
          </>
        )}
      </button>
      {micError && (
        <p className="text-xs text-danger text-center max-w-xs">{micError}</p>
      )}
    </div>
  );
}
