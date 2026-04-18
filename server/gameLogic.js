import words, { easyWords } from './words.js';
import { computeTitles } from './titleEngine.js';
import { generateAIWords } from './aiRoast.js';

export async function startGame(room) {
  const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
  if (connectedPlayers.length < 2) {
    return { error: 'Need at least 2 players to start' };
  }

  const drawOrder = connectedPlayers.map((p) => p.id);
  shuffleArray(drawOrder);

  // Generate AI words for this game
  let aiWordPool = null;
  try {
    const aiResult = await generateAIWords();
    if (aiResult) {
      aiWordPool = aiResult.words;
      console.log(`AI generated ${aiResult.words.length} mixed words`);
    }
  } catch (err) {
    console.error('AI word generation failed, using static words:', err.message);
  }

  room.gameState = {
    status: 'playing',
    currentRound: 1,
    totalRounds: room.settings.rounds,
    drawOrder,
    drawIndex: 0,
    currentDrawer: null,
    currentWord: null,
    hint: null,
    timeLeft: 0,
    drawTime: room.settings.drawTime,
    turnTimer: null,
    hintTimer: null,
    tickInterval: null,
    wordChoices: null,
    turnStartTime: null,
    usedWords: new Set(),
    isSpeedRound: false,
    turnCount: 0,
    playerStats: {},
    aiWordPool,
  };

  for (const player of room.players.values()) {
    player.score = 0;
    player.hasGuessed = false;
    room.gameState.playerStats[player.id] = {
      firstGuessCount: 0,
      correctGuesses: 0,
      totalGuesses: 0,
      guessStreak: 0,
      maxStreak: 0,
      totalGuessTime: 0,
      drawingPointsEarned: 0,
      reactionsReceived: 0,
    };
  }

  return { success: true };
}

export function getWordChoices(room, useEasy = false) {
  // Speed round always uses easy static words
  if (useEasy) {
    const allWords = [...easyWords, ...room.settings.customWords];
    const available = allWords.filter((w) => !room.gameState.usedWords.has(w));
    const pool = available.length >= 3 ? available : allWords;
    return pickRandom(pool, 3);
  }

  // Use AI-generated words if available, fall back to static
  const gs = room.gameState;
  const baseWords = gs.aiWordPool && gs.aiWordPool.length > 0 ? gs.aiWordPool : words;
  const allWords = [...baseWords, ...room.settings.customWords];
  const available = allWords.filter((w) => !gs.usedWords.has(w));
  const pool = available.length >= 3 ? available : allWords;
  return pickRandom(pool, 3);
}

function pickRandom(pool, count) {
  const choices = [];
  const used = new Set();
  while (choices.length < count && choices.length < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    const word = pool[idx];
    if (!used.has(word)) {
      used.add(word);
      choices.push(word);
    }
  }
  return choices;
}

export function startTurn(room, io) {
  const gs = room.gameState;
  gs.currentDrawer = gs.drawOrder[gs.drawIndex];
  gs.turnCount++;

  // Detect speed round (last round)
  gs.isSpeedRound = gs.currentRound === gs.totalRounds;

  if (gs.isSpeedRound) {
    gs.drawTime = 15;
  } else {
    gs.drawTime = room.settings.drawTime;
  }

  for (const player of room.players.values()) {
    player.hasGuessed = false;
  }

  // Snapshot scores before this turn for delta calculation
  gs.scoresBeforeTurn = {};
  for (const player of room.players.values()) {
    gs.scoresBeforeTurn[player.id] = player.score;
  }

  const choices = getWordChoices(room, gs.isSpeedRound);
  gs.wordChoices = choices;
  gs.status = 'choosing';

  const choosingTime = gs.isSpeedRound ? 8000 : 15000;
  const choosingTimer = setTimeout(() => {
    if (gs.status === 'choosing') {
      selectWord(room, choices[0], io);
    }
  }, choosingTime);

  gs.turnTimer = choosingTimer;

  return { drawerId: gs.currentDrawer, choices, isSpeedRound: gs.isSpeedRound };
}

export function selectWord(room, word, io) {
  const gs = room.gameState;
  if (gs.turnTimer) clearTimeout(gs.turnTimer);

  gs.currentWord = word;
  gs.usedWords.add(word);
  gs.wordChoices = null;
  gs.status = 'drawing';
  gs.timeLeft = gs.drawTime;
  gs.turnStartTime = Date.now();
  gs.hint = generateHint(word, []);

  const hintTime = gs.isSpeedRound ? 7 : Math.floor(gs.drawTime / 2);

  gs.hintTimer = setTimeout(() => {
    const revealed = revealHintLetters(word, gs.hint);
    gs.hint = revealed;
    io.to(room.code).emit('hint-update', { hint: revealed });
  }, hintTime * 1000);

  gs.tickInterval = setInterval(() => {
    gs.timeLeft--;
    io.to(room.code).emit('timer-sync', { timeLeft: gs.timeLeft });

    if (gs.timeLeft <= 0) {
      endTurn(room, io);
    }
  }, 1000);

  gs.turnTimer = setTimeout(() => {
    endTurn(room, io);
  }, gs.drawTime * 1000 + 500);

  return {
    word,
    hint: gs.hint,
    drawTime: gs.drawTime,
  };
}

export function handleGuess(room, playerId, guess) {
  const gs = room.gameState;
  if (!gs || gs.status !== 'drawing') return { type: 'invalid' };
  if (playerId === gs.currentDrawer) return { type: 'invalid' };

  const player = room.players.get(playerId);
  if (!player || player.hasGuessed) return { type: 'already-guessed' };

  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedWord = gs.currentWord.toLowerCase();

  if (normalizedGuess === normalizedWord) {
    player.hasGuessed = true;

    const elapsed = (Date.now() - gs.turnStartTime) / 1000;
    let guessScore = Math.max(50, Math.round(300 - elapsed * (250 / gs.drawTime)));

    // 2x multiplier for speed round
    if (gs.isSpeedRound) guessScore *= 2;

    player.score += guessScore;

    const drawer = room.players.get(gs.currentDrawer);
    const guessedCount = Array.from(room.players.values()).filter((p) => p.hasGuessed).length;
    let drawerBonus = Math.round(100 / guessedCount);
    if (gs.isSpeedRound) drawerBonus *= 2;

    if (drawer) {
      drawer.score += drawerBonus;
      // Track drawer stat
      const drawerStats = gs.playerStats?.[gs.currentDrawer];
      if (drawerStats) drawerStats.drawingPointsEarned += drawerBonus;
    }

    // Track guesser stats
    const pStats = gs.playerStats?.[playerId];
    if (pStats) {
      pStats.totalGuesses++;
      pStats.correctGuesses++;
      pStats.guessStreak++;
      if (pStats.guessStreak > pStats.maxStreak) pStats.maxStreak = pStats.guessStreak;
      pStats.totalGuessTime += elapsed;
      // First to guess this turn?
      if (guessedCount === 1) pStats.firstGuessCount++;
    }

    const allGuessed = Array.from(room.players.values())
      .filter((p) => p.isConnected && p.id !== gs.currentDrawer)
      .every((p) => p.hasGuessed);

    return {
      type: 'correct',
      playerId,
      playerName: player.name,
      score: guessScore,
      allGuessed,
    };
  }

  // Wrong guess — reset streak
  const pStats = gs.playerStats?.[playerId];
  if (pStats) {
    pStats.totalGuesses++;
    pStats.guessStreak = 0;
  }

  if (isCloseGuess(normalizedGuess, normalizedWord)) {
    return {
      type: 'close',
      playerId,
      playerName: player.name,
      guess,
    };
  }

  return {
    type: 'wrong',
    playerId,
    playerName: player.name,
    guess,
  };
}

export function endTurn(room, io) {
  const gs = room.gameState;
  if (!gs || gs.status === 'waiting' || gs.status === 'gameover') return;

  if (gs.turnTimer) clearTimeout(gs.turnTimer);
  if (gs.hintTimer) clearTimeout(gs.hintTimer);
  if (gs.tickInterval) clearInterval(gs.tickInterval);
  gs.turnTimer = null;
  gs.hintTimer = null;
  gs.tickInterval = null;

  const revealedWord = gs.currentWord;
  gs.status = 'turn-end';
  gs.timeLeft = 0;
  gs._lastWord = revealedWord;

  // Compute per-turn score deltas
  const scoresBeforeTurn = gs.scoresBeforeTurn || {};
  const scoreSummary = Array.from(room.players.values()).map((p) => {
    const before = scoresBeforeTurn[p.id] || 0;
    const earned = p.score - before;
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      earned,
      total: p.score,
      hasGuessed: p.hasGuessed,
      isDrawer: p.id === gs.currentDrawer,
      isConnected: p.isConnected,
    };
  });

  io.to(room.code).emit('turn-ended', {
    word: revealedWord,
    players: getPlayerScores(room),
    scoreSummary,
    isSpeedRound: gs.isSpeedRound || false,
  });

  setTimeout(() => {
    advanceTurn(room, io);
  }, 5000);
}

function advanceTurn(room, io) {
  const gs = room.gameState;

  gs.drawIndex++;

  const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
  while (gs.drawIndex < gs.drawOrder.length) {
    const nextDrawer = gs.drawOrder[gs.drawIndex];
    if (room.players.has(nextDrawer) && room.players.get(nextDrawer).isConnected) {
      break;
    }
    gs.drawIndex++;
  }

  if (gs.drawIndex >= gs.drawOrder.length) {
    gs.currentRound++;

    if (gs.currentRound > gs.totalRounds) {
      endGame(room, io);
      return;
    }

    const newOrder = connectedPlayers.map((p) => p.id);
    shuffleArray(newOrder);
    gs.drawOrder = newOrder;
    gs.drawIndex = 0;

    io.to(room.code).emit('new-round', {
      round: gs.currentRound,
      totalRounds: gs.totalRounds,
    });

    setTimeout(() => {
      const turnInfo = startTurn(room, io);
      io.to(room.code).emit('clear-canvas');
      io.to(room.code).emit('new-turn', {
        drawerId: turnInfo.drawerId,
        round: gs.currentRound,
        totalRounds: gs.totalRounds,
        isSpeedRound: turnInfo.isSpeedRound,
      });

      const drawerSocket = getSocketByPlayerId(io, turnInfo.drawerId, room.code);
      if (drawerSocket) {
        drawerSocket.emit('word-choices', { choices: turnInfo.choices });
      }
    }, 3000);

    return;
  }

  const turnInfo = startTurn(room, io);
  io.to(room.code).emit('clear-canvas');
  io.to(room.code).emit('new-turn', {
    drawerId: turnInfo.drawerId,
    round: gs.currentRound,
    totalRounds: gs.totalRounds,
    isSpeedRound: turnInfo.isSpeedRound,
  });

  const drawerSocket = getSocketByPlayerId(io, turnInfo.drawerId, room.code);
  if (drawerSocket) {
    drawerSocket.emit('word-choices', { choices: turnInfo.choices });
  }
}

export function endGame(room, io) {
  const gs = room.gameState;

  if (gs.turnTimer) clearTimeout(gs.turnTimer);
  if (gs.hintTimer) clearTimeout(gs.hintTimer);
  if (gs.tickInterval) clearInterval(gs.tickInterval);

  gs.status = 'gameover';

  const finalScores = getPlayerScores(room).sort((a, b) => b.score - a.score);
  const titles = computeTitles(room);

  io.to(room.code).emit('game-over', { players: finalScores, titles });
}

export function resetGame(room) {
  if (room.gameState) {
    if (room.gameState.turnTimer) clearTimeout(room.gameState.turnTimer);
    if (room.gameState.hintTimer) clearTimeout(room.gameState.hintTimer);
    if (room.gameState.tickInterval) clearInterval(room.gameState.tickInterval);
  }
  room.gameState = null;
  room.lastCanvasSnapshot = null;
  for (const player of room.players.values()) {
    player.score = 0;
    player.hasGuessed = false;
  }
}

// --- Utilities ---

function generateHint(word, revealedIndices) {
  return word.split('').map((char, i) => {
    if (char === ' ') return ' ';
    if (revealedIndices.includes(i)) return char;
    return '_';
  });
}

function revealHintLetters(word, currentHint) {
  const hiddenIndices = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ' && currentHint[i] === '_') {
      hiddenIndices.push(i);
    }
  }

  const count = Math.min(2, hiddenIndices.length);
  shuffleArray(hiddenIndices);
  const toReveal = hiddenIndices.slice(0, count);

  const newHint = [...currentHint];
  for (const idx of toReveal) {
    newHint[idx] = word[idx];
  }
  return newHint;
}

function isCloseGuess(guess, word) {
  if (guess.length < 3 || word.length < 3) return false;
  if (Math.abs(guess.length - word.length) > 2) return false;

  let matches = 0;
  const shorter = guess.length <= word.length ? guess : word;
  const longer = guess.length > word.length ? guess : word;

  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) matches++;
  }

  return matches / longer.length >= 0.6 && matches / longer.length < 1;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getPlayerScores(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: p.score,
    isConnected: p.isConnected,
    hasGuessed: p.hasGuessed,
  }));
}

function getSocketByPlayerId(io, playerId, roomCode) {
  const sockets = io.sockets.adapter.rooms.get(roomCode);
  if (!sockets) return null;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.playerId === playerId) return s;
  }
  return null;
}
