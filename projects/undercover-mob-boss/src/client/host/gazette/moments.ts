// ── Key Moment Detection ───────────────────────────────────────────
// Scans game history for narrative turning points.

import type { GameAnalysis, KeyMoment } from './types';

/** Detect key narrative moments from game data. Returns 3-6 moments, sorted by round. */
export function detectKeyMoments(game: GameAnalysis): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const playerName = (id: string) => game.players.find(p => p.id === id)?.name ?? 'Unknown';

  // ── Mob Boss nearly elected ──────────────────────────────────
  for (const gov of game.governments) {
    if (gov.passed && gov.nomineeId === game.mobBossId && game.totalBadPolicies >= 3) {
      // Mob boss WAS elected — this is the game-ending event, not a "near miss"
      continue;
    }
    if (gov.passed && gov.nomineeId === game.mobBossId) {
      moments.push({
        type: 'mob-boss-nearly-elected',
        round: gov.round,
        mayorName: playerName(gov.mayorId),
      });
    }
  }

  // ── Decisive vote (1-vote margin) ────────────────────────────
  for (const gov of game.governments) {
    const approves = Object.values(gov.votes).filter(v => v === 'approve').length;
    const blocks = Object.values(gov.votes).filter(v => v === 'block').length;
    const margin = Math.abs(approves - blocks);
    if (margin === 1) {
      // Find the "swing voter" — the last person who tipped the balance
      const winningVote = approves > blocks ? 'approve' : 'block';
      const voters = Object.entries(gov.votes).filter(([, v]) => v === winningVote);
      const swingVoter = voters[voters.length - 1];
      if (swingVoter) {
        moments.push({
          type: 'decisive-vote',
          round: gov.round,
          playerName: playerName(swingVoter[0]),
          margin: 1,
        });
      }
    }
  }

  // ── Policy streak (3+ consecutive same type) ─────────────────
  if (game.policies.length >= 3) {
    let streakStart = 0;
    for (let i = 1; i <= game.policies.length; i++) {
      if (i === game.policies.length || game.policies[i].card.type !== game.policies[streakStart].card.type) {
        const length = i - streakStart;
        if (length >= 3) {
          moments.push({
            type: 'policy-streak',
            startRound: game.policies[streakStart].round,
            length,
            policyType: game.policies[streakStart].card.type,
          });
        }
        streakStart = i;
      }
    }
  }

  // ── Execution hit / miss ─────────────────────────────────────
  // Derive from events — player-executed events now include wasMobBoss at game-over
  for (const event of (game as unknown as { events?: Array<{ type: string; playerId?: string; wasMobBoss?: boolean }> }).events ?? []) {
    if (event.type === 'player-executed' && event.playerId) {
      if (event.wasMobBoss) {
        const policy = game.policies.find(p => p.round === game.totalRounds);
        moments.push({ type: 'execution-hit', round: policy?.round ?? game.totalRounds });
      } else {
        moments.push({
          type: 'execution-miss',
          round: game.totalRounds, // approximate
          targetName: playerName(event.playerId),
        });
      }
    }
  }

  // ── Investigation reveals ────────────────────────────────────
  for (const inv of game.investigations) {
    if (inv.result === 'mob') {
      moments.push({
        type: 'investigation-reveal',
        round: game.totalRounds, // approximate — events don't carry round numbers
        investigatorName: playerName(inv.investigatorId),
        targetName: playerName(inv.targetId),
        result: inv.result,
      });
    }
  }

  // Sort by round, take top 5
  moments.sort((a, b) => {
    const roundA = 'round' in a ? a.round : ('startRound' in a ? a.startRound : 0);
    const roundB = 'round' in b ? b.round : ('startRound' in b ? b.startRound : 0);
    return roundA - roundB;
  });

  return moments.slice(0, 5);
}

/** Format a key moment into narrative copy. */
export function formatMoment(moment: KeyMoment): string {
  switch (moment.type) {
    case 'mob-boss-nearly-elected':
      return `Round ${moment.round}: Mayor ${moment.mayorName} nominated the Mob Boss as Commissioner. The government was approved. The city had no idea.`;
    case 'decisive-vote':
      return `Round ${moment.round}: ${moment.playerName}'s vote was the tiebreaker. One vote... changed everything.`;
    case 'policy-streak':
      return `${moment.length} consecutive ${moment.policyType === 'bad' ? 'corrupt' : 'virtuous'} policies starting round ${moment.startRound}. ${moment.policyType === 'bad' ? 'The mob was on a roll.' : 'The citizens held the line.'}`;
    case 'execution-miss':
      return `${moment.targetName} was executed — a loyal citizen. The mob lived to fight another day.`;
    case 'execution-hit':
      return `Round ${moment.round}: The Mob Boss was found and eliminated. Justice, swift and final.`;
    case 'investigation-reveal':
      return `${moment.investigatorName} investigated ${moment.targetName} and found... ${moment.result === 'mob' ? 'a member of the mob.' : 'an innocent citizen.'}`;
    case 'veto-drama':
      return `Round ${moment.round}: A veto was proposed. The tension in the room was thick enough to cut.`;
  }
}
