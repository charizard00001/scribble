/**
 * Compute end-of-game titles for each player based on their stats.
 * Each player gets at most one title, assigned by priority order.
 */
export function computeTitles(room) {
  const gs = room.gameState;
  if (!gs || !gs.playerStats) return {};

  const players = Array.from(room.players.values()).filter((p) => p.isConnected);
  if (players.length === 0) return {};

  const stats = gs.playerStats;
  const titles = {};
  const assigned = new Set();

  const titleChecks = [
    {
      emoji: '👑',
      title: 'MVP',
      pick: () => {
        const best = players.reduce((a, b) => (a.score > b.score ? a : b));
        return best.score > 0 ? best.id : null;
      },
    },
    {
      emoji: '🎨',
      title: 'Picasso',
      pick: () => {
        let bestId = null;
        let bestVal = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.drawingPointsEarned > bestVal) {
            bestVal = s.drawingPointsEarned;
            bestId = p.id;
          }
        }
        return bestVal > 0 ? bestId : null;
      },
    },
    {
      emoji: '⚡',
      title: 'Speed Demon',
      pick: () => {
        let bestId = null;
        let bestVal = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.firstGuessCount > bestVal) {
            bestVal = s.firstGuessCount;
            bestId = p.id;
          }
        }
        return bestVal > 0 ? bestId : null;
      },
    },
    {
      emoji: '🔥',
      title: 'On Fire',
      pick: () => {
        let bestId = null;
        let bestVal = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.maxStreak > bestVal) {
            bestVal = s.maxStreak;
            bestId = p.id;
          }
        }
        return bestVal >= 2 ? bestId : null;
      },
    },
    {
      emoji: '🎯',
      title: 'Sharpshooter',
      pick: () => {
        let bestId = null;
        let bestRatio = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.totalGuesses >= 3) {
            const ratio = s.correctGuesses / s.totalGuesses;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = p.id;
            }
          }
        }
        return bestRatio > 0.5 ? bestId : null;
      },
    },
    {
      emoji: '🐢',
      title: 'Slowpoke',
      pick: () => {
        let bestId = null;
        let bestAvg = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.correctGuesses > 0) {
            const avg = s.totalGuessTime / s.correctGuesses;
            if (avg > bestAvg) {
              bestAvg = avg;
              bestId = p.id;
            }
          }
        }
        return bestAvg > 0 ? bestId : null;
      },
    },
    {
      emoji: '🧱',
      title: 'Brick Wall',
      pick: () => {
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.totalGuesses > 0 && s.correctGuesses === 0) {
            return p.id;
          }
        }
        return null;
      },
    },
    {
      emoji: '🤡',
      title: 'Class Clown',
      pick: () => {
        let bestId = null;
        let bestVal = 0;
        for (const p of players) {
          const s = stats[p.id];
          if (s && s.reactionsReceived > bestVal) {
            bestVal = s.reactionsReceived;
            bestId = p.id;
          }
        }
        return bestVal >= 3 ? bestId : null;
      },
    },
  ];

  for (const check of titleChecks) {
    const playerId = check.pick();
    if (playerId && !assigned.has(playerId)) {
      titles[playerId] = { emoji: check.emoji, title: check.title };
      assigned.add(playerId);
    }
  }

  return titles;
}
