import { useState, useCallback } from 'react';
import useSocket from './hooks/useSocket.js';
import Lobby from './components/Lobby.jsx';
import GameRoom from './components/GameRoom.jsx';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState('');

  const handleJoinRoom = useCallback((roomData, name) => {
    setRoom(roomData);
    setUsername(name);
    setScreen('game');
  }, []);

  const handleLeave = useCallback(() => {
    setScreen('lobby');
    setRoom(null);
    setUsername('');
    window.location.reload();
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#13131f' }}>
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-bold mb-6">
            <span className="text-primary">S</span>
            <span className="text-accent">c</span>
            <span className="text-warning">r</span>
            <span className="text-success">i</span>
            <span className="text-danger">b</span>
            <span className="text-primary-light">b</span>
            <span className="text-accent-light">l</span>
            <span className="text-warning">e</span>
          </h1>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (screen === 'game' && room) {
    return (
      <GameRoom
        socket={socket}
        room={room}
        username={username}
        onLeave={handleLeave}
      />
    );
  }

  return <Lobby socket={socket} onJoinRoom={handleJoinRoom} />;
}
