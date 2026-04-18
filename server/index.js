import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  joinRoom,
  handleDisconnect,
  kickPlayer,
  getRoom,
  getRoomCode,
  setCustomWords,
  serializeRoom,
  removePlayer,
} from './roomManager.js';
import {
  startGame,
  startTurn,
  selectWord,
  handleGuess,
  endTurn,
  resetGame,
} from './gameLogic.js';
import { generateRoast } from './aiRoast.js';

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'Scribble server running' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // --- Lobby Events ---

  socket.on('create-room', ({ username, avatar }, callback) => {
    if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 15) {
      return callback({ error: 'Username must be 2-15 characters' });
    }

    const room = createRoom(socket.id, username.trim(), avatar);
    socket.playerId = socket.id;
    socket.roomCode = room.code;
    socket.playerName = username.trim();
    socket.join(room.code);

    callback({ room: serializeRoom(room) });
    console.log(`Room ${room.code} created by ${username.trim()}`);
  });

  socket.on('join-room', ({ roomCode, username, avatar }, callback) => {
    if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 15) {
      return callback({ error: 'Username must be 2-15 characters' });
    }
    if (!roomCode || typeof roomCode !== 'string') {
      return callback({ error: 'Invalid room code' });
    }

    const code = roomCode.toUpperCase().trim();
    const result = joinRoom(code, socket.id, username.trim(), avatar);

    if (result.error) {
      return callback({ error: result.error });
    }

    const room = result.room;
    socket.playerId = socket.id;
    socket.roomCode = code;
    socket.playerName = username.trim();
    socket.join(code);

    callback({ room: serializeRoom(room) });

    const serialized = serializeRoom(room);
    socket.to(code).emit('player-joined', {
      player: serialized.players.find((p) => p.id === socket.id),
      players: serialized.players,
    });

    io.to(code).emit('system-message', {
      text: `${username.trim()} joined the room`,
    });

    console.log(`${username.trim()} joined room ${code}`);
  });

  // --- Game Events ---

  socket.on('start-game', async (callback) => {
    const room = getRoom(socket.roomCode);
    if (!room) return callback?.({ error: 'Room not found' });
    if (room.hostId !== socket.playerId) return callback?.({ error: 'Only the host can start the game' });

    const result = await startGame(room);
    if (result.error) return callback?.({ error: result.error });

    const turnInfo = startTurn(room, io);

    io.to(room.code).emit('game-started', {
      gameState: serializeRoom(room).gameState,
      players: serializeRoom(room).players,
    });

    io.to(room.code).emit('new-turn', {
      drawerId: turnInfo.drawerId,
      round: room.gameState.currentRound,
      totalRounds: room.gameState.totalRounds,
      isSpeedRound: turnInfo.isSpeedRound,
    });

    const drawerSocket = findSocketByPlayerId(turnInfo.drawerId, room.code);
    if (drawerSocket) {
      drawerSocket.emit('word-choices', { choices: turnInfo.choices });
    }

    callback?.({ success: true });
    console.log(`Game started in room ${room.code}`);
  });

  socket.on('select-word', ({ word }) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.gameState) return;
    if (socket.playerId !== room.gameState.currentDrawer) return;
    if (room.gameState.status !== 'choosing') return;

    const choices = room.gameState.wordChoices || [];
    if (!choices.includes(word)) return;

    const turnData = selectWord(room, word, io);

    io.to(room.code).emit('turn-started', {
      drawerId: room.gameState.currentDrawer,
      hint: turnData.hint,
      drawTime: turnData.drawTime,
    });

    const drawerSocket = findSocketByPlayerId(room.gameState.currentDrawer, room.code);
    if (drawerSocket) {
      drawerSocket.emit('your-word', { word });
    }
  });

  socket.on('draw', (data) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.gameState) return;
    if (socket.playerId !== room.gameState.currentDrawer) return;
    if (room.gameState.status !== 'drawing') return;

    socket.to(socket.roomCode).emit('draw', data);
  });

  socket.on('clear-canvas', () => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.gameState) return;
    if (socket.playerId !== room.gameState.currentDrawer) return;

    socket.to(socket.roomCode).emit('clear-canvas');
  });

  socket.on('guess', ({ message }, callback) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.gameState) return;

    if (typeof message !== 'string' || message.trim().length === 0 || message.trim().length > 100) return;

    const result = handleGuess(room, socket.playerId, message.trim());

    if (result.type === 'correct') {
      io.to(room.code).emit('correct-guess', {
        playerId: result.playerId,
        playerName: result.playerName,
        score: result.score,
        players: serializeRoom(room).players,
      });

      if (result.allGuessed) {
        setTimeout(() => endTurn(room, io), 1500);
      }
    } else if (result.type === 'close') {
      socket.emit('chat-message', {
        type: 'close',
        playerName: result.playerName,
        text: result.guess,
      });

      socket.to(room.code).emit('chat-message', {
        type: 'guess',
        playerName: result.playerName,
        text: result.guess,
      });
    } else if (result.type === 'wrong') {
      io.to(room.code).emit('chat-message', {
        type: 'guess',
        playerName: result.playerName,
        text: result.guess,
      });
    }
  });

  // --- Admin Events ---

  socket.on('kick-player', ({ targetId }, callback) => {
    const result = kickPlayer(socket.roomCode, socket.playerId, targetId);
    if (result?.error) return callback?.({ error: result.error });

    const targetSocket = findSocketByPlayerId(targetId, socket.roomCode);
    if (targetSocket) {
      targetSocket.emit('kicked');
      targetSocket.leave(socket.roomCode);
      targetSocket.roomCode = null;
      targetSocket.playerId = null;
    }

    if (result?.room) {
      io.to(socket.roomCode).emit('player-kicked', {
        kickedId: targetId,
        players: serializeRoom(result.room).players,
      });

      io.to(socket.roomCode).emit('system-message', {
        text: 'A player was kicked from the room',
      });
    }

    callback?.({ success: true });
  });

  socket.on('add-custom-words', ({ words: wordList }, callback) => {
    if (!Array.isArray(wordList)) return callback?.({ error: 'Invalid word list' });

    const result = setCustomWords(socket.roomCode, socket.playerId, wordList);
    if (result.error) return callback?.({ error: result.error });

    callback?.({ success: true, count: result.room.settings.customWords.length });
  });

  socket.on('play-again', (callback) => {
    const room = getRoom(socket.roomCode);
    if (!room) return callback?.({ error: 'Room not found' });
    if (room.hostId !== socket.playerId) return callback?.({ error: 'Only the host can restart' });

    resetGame(room);

    io.to(room.code).emit('game-reset', {
      room: serializeRoom(room),
    });

    callback?.({ success: true });
  });

  // --- Voice Chat (Socket.IO audio relay) ---

  socket.on('voice-join', () => {
    if (!socket.roomCode) return;
    socket.join(`${socket.roomCode}-voice`);
    socket.to(socket.roomCode).emit('voice-peer-joined', { peerId: socket.playerId });
  });

  socket.on('voice-leave', () => {
    if (!socket.roomCode) return;
    socket.leave(`${socket.roomCode}-voice`);
    socket.to(socket.roomCode).emit('voice-peer-left', { peerId: socket.playerId });
  });

  socket.on('voice-data', (data) => {
    if (!socket.roomCode) return;
    if (!(data instanceof Buffer || data instanceof ArrayBuffer)) return;
    if (data.byteLength > 16000) return; // sanity limit
    socket.to(`${socket.roomCode}-voice`).emit('voice-data', {
      from: socket.playerId,
      data,
    });
  });

  // --- Canvas Snapshot (for AI Roast) ---

  socket.on('canvas-snapshot', (data) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    if (typeof data !== 'string' || data.length > 2000000) return;
    room.lastCanvasSnapshot = data;
  });

  // --- AI Roast (triggered after turn ends) ---

  socket.on('request-roast', async () => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.lastCanvasSnapshot) return;
    if (!room.gameState) return;

    const snapshot = room.lastCanvasSnapshot;
    const word = room.gameState._lastWord;
    room.lastCanvasSnapshot = null;

    if (!word || !process.env.GROQ_API_KEY) return;

    try {
      const roastResult = await generateRoast(snapshot, word);
      if (roastResult) {
        io.to(room.code).emit('roast-message', { text: roastResult.text, theme: roastResult.theme, word });
      }
    } catch (err) {
      console.error('Roast generation failed:', err.message);
    }
  });

  // --- Reactions ---

  const reactionCooldowns = new Map();
  const ALLOWED_REACTIONS = ['😂', '🔥', '💀', '👏', '🤯', '💩'];

  socket.on('reaction', ({ emoji }) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    if (!ALLOWED_REACTIONS.includes(emoji)) return;

    // Rate limit: max 10 per 2 seconds
    const now = Date.now();
    const key = socket.id;
    const history = reactionCooldowns.get(key) || [];
    const recent = history.filter((t) => now - t < 2000);
    if (recent.length >= 10) return;
    recent.push(now);
    reactionCooldowns.set(key, recent);

    io.to(room.code).emit('reaction', {
      emoji,
      playerId: socket.playerId,
      playerName: socket.playerName,
    });

    // Track reactions received by the current drawer
    if (room.gameState?.playerStats && room.gameState.currentDrawer) {
      const drawerStats = room.gameState.playerStats[room.gameState.currentDrawer];
      if (drawerStats) drawerStats.reactionsReceived++;
    }
  });

  // --- Soundboard ---

  const soundCooldowns = new Map();
  const ALLOWED_SOUNDS = ['airhorn', 'bruh', 'sadtrombone', 'vineboom', 'wow', 'fart', 'drumroll', 'crickets'];

  socket.on('play-sound', ({ sound }) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    if (!ALLOWED_SOUNDS.includes(sound)) return;

    // Rate limit: max 1 per 200ms
    const now = Date.now();
    const lastTime = soundCooldowns.get(socket.id) || 0;
    if (now - lastTime < 200) return;
    soundCooldowns.set(socket.id, now);

    io.to(room.code).emit('play-sound', {
      sound,
      playerName: socket.playerName,
    });
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);

    if (!socket.roomCode) return;

    const result = handleDisconnect(socket.playerId);
    if (!result) return;

    const { room, destroyed, wasDrawer } = result;

    if (destroyed) {
      console.log(`Room ${socket.roomCode} destroyed (empty)`);
      return;
    }

    io.to(room.code).emit('player-left', {
      playerId: socket.playerId,
      playerName: socket.playerName,
      players: serializeRoom(room).players,
      newHostId: room.hostId,
    });

    io.to(room.code).emit('system-message', {
      text: `${socket.playerName} left the room`,
    });

    io.to(room.code).emit('voice-peer-left', {
      peerId: socket.playerId,
    });

    if (wasDrawer && room.gameState) {
      endTurn(room, io);
    }
  });
});

function findSocketByPlayerId(playerId, roomCode) {
  if (!roomCode) return null;
  const sockets = io.sockets.adapter.rooms.get(roomCode);
  if (!sockets) return null;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.playerId === playerId) return s;
  }
  return null;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Scribble server listening on port ${PORT}`);
  console.log(`CORS origin: ${FRONTEND_URL}`);
});
