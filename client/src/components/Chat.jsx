import { useState, useRef, useEffect } from 'react';

export default function Chat({ messages, onGuess, isDrawer, hasGuessed, gameStatus, voiceButton }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onGuess(trimmed);
    setInput('');
  };

  const isInputDisabled = isDrawer || hasGuessed || gameStatus !== 'drawing';

  const getPlaceholder = () => {
    if (isDrawer) return "You're drawing!";
    if (hasGuessed) return 'You guessed it!';
    if (gameStatus !== 'drawing') return 'Waiting...';
    return 'Type your guess...';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm animate-fade-in ${getMessageClass(msg.type)}`}>
            {msg.type === 'system' ? (
              <span className="italic">{msg.text}</span>
            ) : msg.type === 'correct' ? (
              <span className="font-semibold">{msg.text}</span>
            ) : msg.type === 'roast' ? (
              <span className="italic">🤖 {msg.text}</span>
            ) : msg.type === 'close' ? (
              <>
                <span className="font-semibold">{msg.playerName}: </span>
                <span>{msg.text}</span>
                <span className="ml-1 text-warning text-xs">(close!)</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-text-muted">{msg.playerName}: </span>
                <span>{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 p-2 border-t border-surface-lighter">
        <div className="flex gap-2 items-center">
          {voiceButton}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            maxLength={100}
            className="flex-1 px-3 py-2 bg-surface-light rounded-lg text-sm text-text placeholder-text-muted/50 border border-surface-lighter focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isInputDisabled || !input.trim()}
            className="px-3 py-2 bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function getMessageClass(type) {
  switch (type) {
    case 'correct':
      return 'text-success bg-success/10 px-2 py-1 rounded-lg';
    case 'roast':
      return 'text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg';
    case 'close':
      return 'text-warning';
    case 'system':
      return 'text-text-muted/60';
    default:
      return 'text-text';
  }
}
