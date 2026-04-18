import { useState } from 'react';
import AVATARS from '../avatars.js';

export default function Lobby({ socket, onJoinRoom }) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [customWords, setCustomWords] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomWords, setShowCustomWords] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(Math.floor(Math.random() * AVATARS.length));

  const validateUsername = () => {
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 15) {
      setError('Username must be 2-15 characters');
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!validateUsername()) return;
    setError('');
    setIsLoading(true);

    socket.emit('create-room', { username: username.trim(), avatar: AVATARS[avatarIndex] }, (res) => {
      setIsLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }

      if (customWords.trim()) {
        const words = customWords.split(',').map((w) => w.trim()).filter(Boolean);
        socket.emit('add-custom-words', { words }, () => {});
      }

      onJoinRoom(res.room, username.trim());
    });
  };

  const handleJoin = () => {
    if (!validateUsername()) return;
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setError('');
    setIsLoading(true);

    socket.emit('join-room', { roomCode: roomCode.trim(), username: username.trim(), avatar: AVATARS[avatarIndex] }, (res) => {
      setIsLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      onJoinRoom(res.room, username.trim());
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (roomCode.trim()) {
        handleJoin();
      } else {
        handleCreate();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-primary">S</span>
            <span className="text-accent">c</span>
            <span className="text-warning">r</span>
            <span className="text-success">i</span>
            <span className="text-danger">b</span>
            <span className="text-primary-light">b</span>
            <span className="text-accent-light">l</span>
            <span className="text-warning">e</span>
          </h1>
          <p className="text-text-muted text-lg">Draw, Guess & Have Fun!</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl p-6 shadow-xl border border-surface-lighter">
          {/* Avatar Picker */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <button
              onClick={() => setAvatarIndex((prev) => (prev - 1 + AVATARS.length) % AVATARS.length)}
              className="w-8 h-8 rounded-full bg-surface-light hover:bg-surface-lighter flex items-center justify-center text-text-muted transition-colors"
            >
              ‹
            </button>
            <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center text-4xl border-2 border-primary/40 shadow">
              {AVATARS[avatarIndex]}
            </div>
            <button
              onClick={() => setAvatarIndex((prev) => (prev + 1) % AVATARS.length)}
              className="w-8 h-8 rounded-full bg-surface-light hover:bg-surface-lighter flex items-center justify-center text-text-muted transition-colors"
            >
              ›
            </button>
          </div>

          {/* Username */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-muted mb-1.5">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name..."
              maxLength={15}
              className="w-full px-4 py-3 bg-surface-light rounded-xl text-text placeholder-text-muted/50 border border-surface-lighter focus:border-primary transition-colors"
            />
          </div>

          {/* Room Code */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-text-muted mb-1.5">Room Code (optional)</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Enter code to join..."
              maxLength={6}
              className="w-full px-4 py-3 bg-surface-light rounded-xl text-text placeholder-text-muted/50 border border-surface-lighter focus:border-primary transition-colors uppercase tracking-widest text-center font-mono text-lg"
            />
          </div>

          {/* Custom Words Toggle */}
          {!roomCode.trim() && (
            <div className="mb-5">
              <button
                onClick={() => setShowCustomWords(!showCustomWords)}
                className="text-sm text-primary-light hover:text-primary transition-colors flex items-center gap-1"
              >
                <svg className={`w-4 h-4 transition-transform ${showCustomWords ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Add custom words
              </button>
              {showCustomWords && (
                <textarea
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder="Enter words separated by commas... (e.g., pizza, guitar, rainbow)"
                  rows={3}
                  className="mt-2 w-full px-4 py-3 bg-surface-light rounded-xl text-text placeholder-text-muted/50 border border-surface-lighter focus:border-primary transition-colors resize-none text-sm"
                />
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm animate-shake">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
            <button
              onClick={handleJoin}
              disabled={isLoading || !roomCode.trim()}
              className="flex-1 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted/50 text-xs mt-6">
          Share the room code with friends to play together
        </p>
      </div>
    </div>
  );
}
