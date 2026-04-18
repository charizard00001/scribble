export default function VoiceControls({ voiceActive, isMuted, onToggleVoice, onToggleMute, micError, compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleVoice}
          className={`p-1.5 rounded-lg transition-colors ${
            voiceActive
              ? 'text-success bg-success/10'
              : 'text-text-muted hover:text-text'
          }`}
          title={voiceActive ? 'Leave voice chat' : 'Join voice chat'}
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
        {voiceActive && (
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted ? 'text-danger bg-danger/10' : 'text-text-muted hover:text-text'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        )}
        {micError && (
          <span className="text-[10px] text-danger">Mic denied</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
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
              <span className="text-sm font-medium">Voice On</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
              <span className="text-sm font-medium">Enable Voice</span>
            </>
          )}
        </button>
        {voiceActive && (
          <button
            onClick={onToggleMute}
            className={`px-3 py-2 rounded-xl transition-all active:scale-95 ${
              isMuted
                ? 'bg-danger/20 text-danger border border-danger/30'
                : 'bg-surface-light text-text-muted hover:bg-surface-lighter'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="text-sm font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>
        )}
      </div>
      {micError && (
        <p className="text-xs text-danger text-center max-w-xs">{micError}</p>
      )}
    </div>
  );
}
