import { useState, useEffect, useCallback } from 'react';
import Canvas from './Canvas.jsx';
import Chat from './Chat.jsx';
import Scoreboard from './Scoreboard.jsx';
import WordHint from './WordHint.jsx';
import VoiceControls from './VoiceControls.jsx';
import FloatingReactions from './FloatingReactions.jsx';
import ReactionBar from './ReactionBar.jsx';
import Soundboard from './Soundboard.jsx';
import useVoiceChat from '../hooks/useVoiceChat.js';
import useSoundboard from '../hooks/useSoundboard.js';

export default function GameRoom({ socket, room: initialRoom, username, onLeave }) {
  const [players, setPlayers] = useState(initialRoom.players);
  const [gameState, setGameState] = useState(initialRoom.gameState);
  const [hostId, setHostId] = useState(initialRoom.hostId);
  const [currentWord, setCurrentWord] = useState(null);
  const [hint, setHint] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [drawTime, setDrawTime] = useState(80);
  const [wordChoices, setWordChoices] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roundTransition, setRoundTransition] = useState(null);
  const [turnEndData, setTurnEndData] = useState(null);
  const [scoreSummary, setScoreSummary] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [isSpeedRound, setIsSpeedRound] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [titles, setTitles] = useState(null);

  const myId = socket?.id;
  const isHost = myId === hostId;
  const isDrawer = gameState?.currentDrawer === myId;
  const isPlaying = gameState?.status === 'drawing' || gameState?.status === 'choosing';

  const { voiceActive, isMuted: voiceMuted, toggleVoice, toggleMute: voiceToggleMute, speakingPeers, micError } = useVoiceChat(socket, initialRoom.code, myId);
  const { playSound, volume, setVolume, isMuted, toggleMute } = useSoundboard(socket);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev.slice(-200), { ...msg, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlers = {
      'player-joined': ({ players: p }) => setPlayers(p),
      'player-left': ({ players: p, newHostId }) => {
        setPlayers(p);
        if (newHostId) setHostId(newHostId);
      },
      'player-kicked': ({ players: p }) => setPlayers(p),
      'player-disconnected': ({ players: p }) => setPlayers(p),
      'player-reconnected': ({ players: p }) => setPlayers(p),

      'game-started': ({ gameState: gs, players: p }) => {
        setGameState(gs);
        setPlayers(p);
        setMessages([]);
        setGameOverData(null);
      },

      'new-turn': ({ drawerId, round, totalRounds, isSpeedRound: speed }) => {
        setGameState((prev) => ({
          ...prev,
          status: 'choosing',
          currentDrawer: drawerId,
          currentRound: round,
          totalRounds,
        }));
        setIsSpeedRound(speed || false);
        setCurrentWord(null);
        setHint(null);
        setTurnEndData(null);
        setScoreSummary(null);
        setPlayers((prev) => prev.map((p) => ({ ...p, hasGuessed: false })));
      },

      'word-choices': ({ choices }) => {
        setWordChoices(choices);
      },

      'turn-started': ({ drawerId, hint: h, drawTime: dt }) => {
        setGameState((prev) => ({ ...prev, status: 'drawing', currentDrawer: drawerId }));
        setHint(h);
        setDrawTime(dt);
        setTimeLeft(dt);
        setWordChoices(null);
      },

      'your-word': ({ word }) => {
        setCurrentWord(word);
      },

      'hint-update': ({ hint: h }) => {
        setHint(h);
      },

      'timer-sync': ({ timeLeft: tl }) => {
        setTimeLeft(tl);
      },

      'correct-guess': ({ playerName, players: p }) => {
        setPlayers(p);
        addMessage({ type: 'correct', text: `${playerName} guessed the word!`, playerName });
      },

      'chat-message': (msg) => {
        addMessage(msg);
      },

      'system-message': ({ text }) => {
        addMessage({ type: 'system', text });
      },

      'turn-ended': ({ word, players: p, scoreSummary: ss }) => {
        setPlayers(p);
        setTurnEndData({ word });
        setScoreSummary(ss || null);
        setGameState((prev) => ({ ...prev, status: 'turn-end' }));
        setCurrentWord(null);
        setHint(null);
        setTimeLeft(0);
      },

      'new-round': ({ round, totalRounds }) => {
        setRoundTransition({ round, totalRounds });
        setTimeout(() => setRoundTransition(null), 3000);
      },

      'game-over': ({ players: p, titles: t }) => {
        setGameOverData({ players: p });
        setTitles(t || null);
        setGameState((prev) => ({ ...prev, status: 'gameover' }));
      },

      'game-reset': ({ room }) => {
        setPlayers(room.players);
        setGameState(room.gameState);
        setHostId(room.hostId);
        setGameOverData(null);
        setTurnEndData(null);
        setScoreSummary(null);
        setMessages([]);
        setCurrentWord(null);
        setHint(null);
        setTimeLeft(0);
        setWordChoices(null);
        setIsSpeedRound(false);
        setTitles(null);
        setReactions([]);
      },

      'kicked': () => {
        onLeave();
      },

      'reaction': ({ emoji }) => {
        setReactions((prev) => [...prev, { emoji, left: 10 + Math.random() * 80 }]);
      },

      'roast-message': ({ text, theme: roastTheme }) => {
        addMessage({ type: 'roast', text, roastTheme: roastTheme || '🤖 AI' });
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, [socket, addMessage, onLeave]);

  const handleStartGame = () => {
    socket.emit('start-game', (res) => {
      if (res?.error) {
        addMessage({ type: 'system', text: res.error });
      }
    });
  };

  const handleSelectWord = (word) => {
    socket.emit('select-word', { word });
    setWordChoices(null);
  };

  const handleGuess = (message) => {
    socket.emit('guess', { message });
  };

  const handleKick = (targetId) => {
    socket.emit('kick-player', { targetId }, () => {});
  };

  const handlePlayAgain = () => {
    socket.emit('play-again', () => {});
  };

  const handleReaction = (emoji) => {
    socket.emit('reaction', { emoji });
  };

  const handlePlaySound = (sound) => {
    socket.emit('play-sound', { sound });
  };

  const connectedCount = players.filter((p) => p.isConnected).length;
  const canStart = isHost && connectedCount >= 2 && (!gameState || gameState.status === 'waiting');

  // Waiting / Lobby state
  if (!gameState || gameState.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 border border-surface-lighter shadow-xl">
            {/* Room Code */}
            <div className="text-center mb-6">
              <p className="text-text-muted text-sm mb-1">Room Code</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-primary">
                {initialRoom.code}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(initialRoom.code)}
                className="mt-2 text-xs text-text-muted hover:text-primary transition-colors"
              >
                Click to copy
              </button>
            </div>

            {/* Players */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-muted mb-3">
                Players ({connectedCount}/8)
              </h3>
              <div className="space-y-2">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-surface-light rounded-xl px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                        {p.avatar || p.name[0].toUpperCase()}
                      </div>
                      <span className={p.isConnected ? 'text-text' : 'text-text-muted line-through'}>
                        {p.name}
                      </span>
                      {p.id === hostId && (
                        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                    {isHost && p.id !== myId && (
                      <button
                        onClick={() => handleKick(p.id)}
                        className="text-text-muted hover:text-danger transition-colors p-1"
                        title="Kick player"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Controls */}
            <div className="mb-6">
              <VoiceControls
                voiceActive={voiceActive}
                isMuted={voiceMuted}
                onToggleVoice={toggleVoice}
                onToggleMute={voiceToggleMute}
                micError={micError}
              />
            </div>

            {/* Status */}
            {connectedCount < 2 && (
              <p className="text-center text-text-muted text-sm mb-4 animate-pulse">
                Waiting for more players... (min 2 to start)
              </p>
            )}

            {/* Start button (host only) */}
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className="w-full py-3 bg-success hover:bg-success/80 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectedCount < 2 ? 'Need more players...' : 'Start Game'}
              </button>
            ) : (
              <p className="text-center text-text-muted text-sm">
                Waiting for the host to start the game...
              </p>
            )}
          </div>

          <button
            onClick={onLeave}
            className="mt-4 w-full py-2 text-text-muted hover:text-danger text-sm transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // Game Over screen
  if (gameOverData) {
    const sorted = [...gameOverData.players].sort((a, b) => b.score - a.score);
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="bg-surface rounded-2xl p-6 border border-surface-lighter shadow-xl">
            <h2 className="text-3xl font-bold text-center mb-6">Game Over!</h2>

            <div className="space-y-3 mb-6">
              {sorted.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl animate-slide-up ${
                    i === 0
                      ? 'bg-warning/10 border border-warning/30'
                      : 'bg-surface-light'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{medals[i] || `#${i + 1}`}</span>
                    <span className="text-lg">{p.avatar || ''}</span>
                    <div className="flex flex-col">
                      <span className="font-semibold">{p.name}</span>
                      {titles?.[p.id] && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary-light font-medium animate-title-pop w-fit"
                          style={{ animationDelay: `${i * 100 + 300}ms` }}
                        >
                          {titles[p.id].emoji} {titles[p.id].title}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-primary text-lg">{p.score}</span>
                </div>
              ))}
            </div>

            {isHost && (
              <button
                onClick={handlePlayAgain}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all active:scale-95"
              >
                Play Again
              </button>
            )}

            <button
              onClick={onLeave}
              className="mt-3 w-full py-2 text-text-muted hover:text-danger text-sm transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Layout
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-surface-lighter shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-text-muted">Room: {initialRoom.code}</span>
          {isSpeedRound ? (
            <span className="text-sm font-bold text-warning bg-warning/15 px-2.5 py-0.5 rounded-full animate-speed-pulse">
              ⚡ SPEED ROUND
            </span>
          ) : (
            <span className="text-sm text-text-muted">
              Round {gameState.currentRound}/{gameState.totalRounds}
            </span>
          )}
        </div>
      </div>

      {/* Timer Bar */}
      {gameState.status === 'drawing' && (
        <div className="h-1.5 bg-surface-light shrink-0">
          <div
            className={`h-full timer-bar rounded-r-full ${isSpeedRound ? 'animate-speed-bar-pulse' : ''}`}
            style={{
              width: `${(timeLeft / drawTime) * 100}%`,
              backgroundColor: isSpeedRound
                ? 'var(--color-warning)'
                : timeLeft > drawTime * 0.5
                  ? 'var(--color-success)'
                  : timeLeft > drawTime * 0.25
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scoreboard - Left */}
        <div className="hidden lg:block w-60 shrink-0 overflow-y-auto border-r border-surface-lighter">
          <Scoreboard
            players={players}
            hostId={hostId}
            myId={myId}
            currentDrawer={gameState.currentDrawer}
            isHost={isHost}
            onKick={handleKick}
            speakingPeers={speakingPeers}
          />
        </div>

        {/* Canvas - Center */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Word Hint / Drawing indicator */}
          <div className="flex items-center justify-center px-4 py-2 bg-surface shrink-0">
            {isDrawer && currentWord ? (
              <p className="text-sm">
                You are drawing:{' '}
                <span className="font-bold text-primary text-lg">{currentWord}</span>
              </p>
            ) : hint ? (
              <WordHint hint={hint} />
            ) : (
              <p className="text-sm text-text-muted">
                {gameState.status === 'choosing'
                  ? `${players.find((p) => p.id === gameState.currentDrawer)?.name || 'Drawer'} is choosing a word...`
                  : ''}
              </p>
            )}
            {gameState.status === 'drawing' && (
              <span className="ml-4 font-mono text-lg font-bold text-warning">{timeLeft}s</span>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative min-h-0">
            <Canvas socket={socket} isDrawer={isDrawer} />

            {/* Floating Reactions */}
            <FloatingReactions reactions={reactions} />

            {/* Overlays */}
            {/* Word selection */}
            {wordChoices && isDrawer && (
              <div className="absolute inset-0 bg-bg/80 flex items-center justify-center z-20">
                <div className="bg-surface rounded-2xl p-6 border border-surface-lighter shadow-xl animate-slide-up max-w-sm w-full mx-4">
                  <h3 className="text-lg font-bold text-center mb-4">Choose a word to draw</h3>
                  <div className="space-y-2">
                    {wordChoices.map((word) => (
                      <button
                        key={word}
                        onClick={() => handleSelectWord(word)}
                        className="w-full py-3 px-4 bg-surface-light hover:bg-primary/20 border border-surface-lighter hover:border-primary rounded-xl transition-all text-lg font-medium"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Turn end — Score Summary overlay */}
            {turnEndData && scoreSummary && (
              <div className="absolute inset-0 bg-bg/85 flex items-center justify-center z-20">
                <div className="bg-surface rounded-2xl p-5 border border-surface-lighter shadow-xl animate-slide-up w-full max-w-md mx-4">
                  <p className="text-text-muted text-xs text-center mb-1">The word was</p>
                  <p className="text-2xl font-bold text-primary text-center mb-4">{turnEndData.word}</p>

                  <div className="space-y-1.5 mb-3 max-h-60 overflow-y-auto">
                    {[...scoreSummary]
                      .sort((a, b) => b.earned - a.earned)
                      .map((p, i) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm animate-fade-in ${
                            p.isDrawer
                              ? 'bg-primary/10 border border-primary/20'
                              : p.hasGuessed
                              ? 'bg-success/10 border border-success/20'
                              : 'bg-surface-light border border-transparent'
                          }`}
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 ${
                              p.hasGuessed || p.isDrawer
                                ? 'bg-success/20'
                                : 'bg-surface-lighter'
                            }`}>
                              {p.avatar || p.name[0].toUpperCase()}
                            </div>
                            <span className="truncate">{p.name}</span>
                            {p.isDrawer && (
                              <span className="text-[10px] text-primary-light bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                drawer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-mono font-bold text-sm ${
                              p.earned > 0 ? 'text-success' : 'text-text-muted/50'
                            }`}>
                              {p.earned > 0 ? `+${p.earned}` : '+0'}
                            </span>
                            <span className="font-mono text-xs text-text-muted w-12 text-right">
                              {p.total} pts
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  <p className="text-text-muted/50 text-xs text-center">Next turn starting soon...</p>
                </div>
              </div>
            )}

            {/* Fallback turn end if no scoreSummary */}
            {turnEndData && !scoreSummary && (
              <div className="absolute inset-0 bg-bg/80 flex items-center justify-center z-20">
                <div className="bg-surface rounded-2xl p-6 border border-surface-lighter shadow-xl animate-slide-up text-center">
                  <p className="text-text-muted text-sm mb-1">The word was</p>
                  <p className="text-3xl font-bold text-primary mb-4">{turnEndData.word}</p>
                  <p className="text-text-muted text-sm">Next turn starting soon...</p>
                </div>
              </div>
            )}

            {/* Round transition */}
            {roundTransition && (
              <div className="absolute inset-0 bg-bg/80 flex items-center justify-center z-30">
                <div className="animate-slide-up text-center">
                  {roundTransition.round === roundTransition.totalRounds ? (
                    <>
                      <p className="text-5xl font-bold text-warning mb-2 animate-speed-pulse">⚡ SPEED ROUND ⚡</p>
                      <p className="text-text-muted">15 seconds · 2x points · Easy words</p>
                    </>
                  ) : (
                    <>
                      <p className="text-5xl font-bold text-primary mb-2">Round {roundTransition.round}</p>
                      <p className="text-text-muted">of {roundTransition.totalRounds}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reaction Bar — below canvas, visible when game is active and not drawing */}
          {gameState.status === 'drawing' && !isDrawer && (
            <div className="shrink-0 border-t border-surface-lighter bg-surface">
              <ReactionBar onReaction={handleReaction} disabled={false} />
            </div>
          )}
        </div>

        {/* Chat - Right */}
        <div className="h-48 lg:h-auto lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-lighter flex flex-col">
          {/* Mobile Scoreboard Toggle */}
          <div className="lg:hidden overflow-x-auto border-b border-surface-lighter">
            <div className="flex gap-2 p-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 ${
                    p.id === gameState.currentDrawer
                      ? 'bg-primary/20 text-primary'
                      : p.hasGuessed
                      ? 'bg-success/20 text-success'
                      : 'bg-surface-light text-text-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-sm ${
                      speakingPeers[p.id]
                        ? 'ring-2 ring-success animate-pulse-ring'
                        : ''
                    }`}
                  >
                    {p.avatar || p.name[0].toUpperCase()}
                  </div>
                  <span>{p.name}</span>
                  <span className="font-mono">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <Soundboard
            onPlaySound={handlePlaySound}
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onToggleMute={toggleMute}
          />

          <Chat
            messages={messages}
            onGuess={handleGuess}
            isDrawer={isDrawer}
            hasGuessed={players.find((p) => p.id === myId)?.hasGuessed}
            gameStatus={gameState.status}
            voiceButton={
              <VoiceControls
                voiceActive={voiceActive}
                isMuted={voiceMuted}
                onToggleVoice={toggleVoice}
                onToggleMute={voiceToggleMute}
                micError={micError}
                compact
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
