import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map();
const playerRoomMap = new Map();

export function createRoom(hostId, hostName, avatar) {
  const code = nanoid();
  const room = {
    code,
    hostId,
    players: new Map(),
    gameState: null,
    settings: {
      customWords: [],
      maxPlayers: 8,
      rounds: 4,
      drawTime: 80,
    },
  };

  room.players.set(hostId, {
    id: hostId,
    name: hostName,
    avatar: avatar || '🐼',
    score: 0,
    isConnected: true,
    hasGuessed: false,
  });

  rooms.set(code, room);
  playerRoomMap.set(hostId, code);
  return room;
}

export function joinRoom(roomCode, playerId, playerName, avatar) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.players.size >= room.settings.maxPlayers) return { error: 'Room is full' };

  if (room.gameState && room.gameState.status !== 'waiting') {
    return { error: 'Game already in progress' };
  }

  room.players.set(playerId, {
    id: playerId,
    name: playerName,
    avatar: avatar || '🐼',
    score: 0,
    isConnected: true,
    hasGuessed: false,
  });

  playerRoomMap.set(playerId, roomCode);
  return { room };
}

export function handleDisconnect(playerId) {
  const roomCode = playerRoomMap.get(playerId);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  if (!room) {
    playerRoomMap.delete(playerId);
    return null;
  }

  const player = room.players.get(playerId);
  if (!player) return null;

  const wasDrawer = room.gameState && room.gameState.currentDrawer === playerId;
  const result = removePlayer(roomCode, playerId);
  if (result) {
    result.wasDrawer = wasDrawer;
  }
  return result;
}

export function removePlayer(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);
  playerRoomMap.delete(playerId);

  if (room.players.size === 0) {
    destroyRoom(roomCode);
    return { room, destroyed: true };
  }

  if (room.hostId === playerId) {
    const firstConnected = Array.from(room.players.values()).find((p) => p.isConnected);
    if (firstConnected) {
      room.hostId = firstConnected.id;
    }
  }

  return { room, removed: true };
}

export function kickPlayer(roomCode, hostId, targetId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.hostId !== hostId) return { error: 'Only host can kick players' };
  if (targetId === hostId) return { error: 'Cannot kick yourself' };

  return removePlayer(roomCode, targetId);
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function getRoomByPlayerId(playerId) {
  const roomCode = playerRoomMap.get(playerId);
  if (!roomCode) return null;
  return rooms.get(roomCode);
}

export function getRoomCode(playerId) {
  return playerRoomMap.get(playerId);
}

export function destroyRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    for (const playerId of room.players.keys()) {
      playerRoomMap.delete(playerId);
    }
    if (room.gameState) {
      if (room.gameState.turnTimer) clearTimeout(room.gameState.turnTimer);
      if (room.gameState.hintTimer) clearTimeout(room.gameState.hintTimer);
      if (room.gameState.tickInterval) clearInterval(room.gameState.tickInterval);
    }
  }
  rooms.delete(roomCode);
}

export function setCustomWords(roomCode, hostId, wordList) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.hostId !== hostId) return { error: 'Only host can set custom words' };

  room.settings.customWords = wordList
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && w.length <= 30);

  return { room };
}

export function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      isConnected: p.isConnected,
      hasGuessed: p.hasGuessed,
    })),
    settings: room.settings,
    gameState: room.gameState
      ? {
          status: room.gameState.status,
          currentRound: room.gameState.currentRound,
          totalRounds: room.gameState.totalRounds,
          currentDrawer: room.gameState.currentDrawer,
          hint: room.gameState.hint,
          timeLeft: room.gameState.timeLeft,
          drawTime: room.gameState.drawTime,
        }
      : null,
  };
}
