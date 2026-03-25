// ── Superlative System ─────────────────────────────────────────────
// 15+ noir-humor templates scored per player, greedy unique assignment.

import type { PlayerAnalysis, GameAnalysis, SuperlativeResult } from './types';

interface SuperlativeTemplate {
  id: string;
  detect: (player: PlayerAnalysis, game: GameAnalysis) => number;
  format: (player: PlayerAnalysis, game: GameAnalysis) => { nickname: string; description: string };
}

const TEMPLATES: SuperlativeTemplate[] = [
  {
    id: 'rubber-stamp',
    detect: (p) => p.totalVotes >= 3 && p.approveCount === p.totalVotes ? 10 : 0,
    format: (p) => ({
      nickname: 'The Rubber Stamp',
      description: `Voted YES on every single government. ${p.role === 'citizen' ? 'Trusting soul... or just not paying attention.' : 'The mob appreciates your cooperation.'}`,
    }),
  },
  {
    id: 'contrarian',
    detect: (p) => p.totalVotes >= 3 && p.blockCount === p.totalVotes ? 10 : 0,
    format: () => ({
      nickname: 'The Contrarian',
      description: 'Voted NO on every government. Trust issues? In this city? Shocking.',
    }),
  },
  {
    id: 'mob-sympathizer',
    detect: (p) => p.totalVotes >= 4 && p.votedSameAsMobBoss / p.totalVotes >= 0.8 && p.role === 'citizen' ? 8 : 0,
    format: (p) => ({
      nickname: 'The Sympathizer',
      description: `Voted the same way as the Mob Boss ${Math.round(p.votedSameAsMobBoss / p.totalVotes * 100)}% of the time. Coincidence? The Gazette thinks not.`,
    }),
  },
  {
    id: 'kingmaker',
    detect: (p) => p.timesAsMayor >= 3 ? p.timesAsMayor : 0,
    format: (p) => ({
      nickname: 'The Kingmaker',
      description: `Served as Mayor ${p.timesAsMayor} times. The city's most frequent dealmaker.`,
    }),
  },
  {
    id: 'commissioner-regular',
    detect: (p) => p.timesAsCommissioner >= 3 ? p.timesAsCommissioner : 0,
    format: (p) => ({
      nickname: 'The Commissioner Regular',
      description: `Nominated as Commissioner ${p.timesAsCommissioner} times. Everyone's favorite partner — or everyone's favorite puppet.`,
    }),
  },
  {
    id: 'clean-hands',
    detect: (p) => p.timesAsMayor === 0 && p.timesAsCommissioner === 0 && p.isAlive ? 5 : 0,
    format: () => ({
      nickname: 'Clean Hands',
      description: 'Never served as Mayor or Commissioner. Just an innocent bystander. That\'s what the mob WANTS you to think.',
    }),
  },
  {
    id: 'policy-machine',
    detect: (p) => p.policiesEnactedAsGovernment.length >= 3 ? p.policiesEnactedAsGovernment.length : 0,
    format: (p) => {
      const bad = p.policiesEnactedAsGovernment.filter(x => x.type === 'bad').length;
      return {
        nickname: bad > p.policiesEnactedAsGovernment.length / 2 ? 'The Fixer' : 'The Legislator',
        description: `Enacted ${p.policiesEnactedAsGovernment.length} policies. ${bad > 0 ? `${bad} of them corrupt. Suspicious.` : 'All virtuous. A true public servant.'}`,
      };
    },
  },
  {
    id: 'first-blood',
    detect: (p) => p.wasExecuted && p.executedRound !== null ? 7 : 0,
    format: (p) => ({
      nickname: 'First Blood',
      description: `Eliminated in round ${p.executedRound}. ${p.role === 'mob-boss' ? 'The city got lucky.' : 'Wrong place, wrong time.'}`,
    }),
  },
  {
    id: 'survivor',
    detect: (p, g) => p.isAlive && g.totalRounds >= 8 ? 6 : 0,
    format: (_, g) => ({
      nickname: 'The Survivor',
      description: `Made it through all ${g.totalRounds} rounds without a scratch. Lucky? Or just that forgettable?`,
    }),
  },
  {
    id: 'mob-boss-disguise',
    detect: (p, g) => p.role === 'mob-boss' && g.winner === 'mob' ? 9 : 0,
    format: () => ({
      nickname: 'The Shadow',
      description: 'The Mob Boss. Pulled the strings from the dark and the city never saw it coming.',
    }),
  },
  {
    id: 'mob-boss-caught',
    detect: (p, g) => p.role === 'mob-boss' && g.winner === 'citizens' ? 9 : 0,
    format: () => ({
      nickname: 'Caught Red-Handed',
      description: 'The Mob Boss. Tried to hide in plain sight... but Millbrook City saw through the disguise.',
    }),
  },
  {
    id: 'loyal-soldier',
    detect: (p, g) => p.role === 'mob-soldier' && g.winner === 'mob' ? 7 : 0,
    format: () => ({
      nickname: 'The Loyal Soldier',
      description: 'A faithful member of the mob. Did the dirty work while the Boss stayed clean.',
    }),
  },
  {
    id: 'failed-soldier',
    detect: (p, g) => p.role === 'mob-soldier' && g.winner === 'citizens' ? 6 : 0,
    format: () => ({
      nickname: 'The Fall Guy',
      description: 'Mob soldier. Took the heat, took the blame, and the citizens still won.',
    }),
  },
  {
    id: 'hawk-eye',
    detect: (p, g) => {
      const investigated = g.investigations.filter(i => i.investigatorId === p.playerId && i.result === 'mob');
      return investigated.length > 0 ? 8 : 0;
    },
    format: () => ({
      nickname: 'Hawk-Eye',
      description: 'Investigated a mob member and lived to tell about it. Sharp instincts in a city of liars.',
    }),
  },
  {
    id: 'flip-flopper',
    detect: (p, g) => {
      if (p.totalVotes < 4) return 0;
      let flips = 0;
      const govs = g.governments.filter(gov => p.playerId in gov.votes);
      for (let i = 1; i < govs.length; i++) {
        if (govs[i].votes[p.playerId] !== govs[i - 1].votes[p.playerId]) flips++;
      }
      return flips >= 3 ? flips : 0;
    },
    format: () => ({
      nickname: 'The Weathervane',
      description: 'Flip-flopped votes like a politician in an election year. Whose side are they really on?',
    }),
  },
];

/** Fallback superlative for players with no template match. */
const FALLBACK: { nickname: string; description: string } = {
  nickname: 'The Quiet One',
  description: 'Kept their head down and their cards close. In this city, that\'s either wisdom... or guilt.',
};

/**
 * Assign one unique superlative per player. Greedy best-match.
 */
export function assignSuperlatives(
  players: PlayerAnalysis[],
  game: GameAnalysis,
): SuperlativeResult[] {
  const results: SuperlativeResult[] = [];
  const usedTemplates = new Set<string>();
  const unassigned: PlayerAnalysis[] = [];

  // Score all templates for all players
  const scores: Array<{ player: PlayerAnalysis; template: SuperlativeTemplate; score: number }> = [];
  for (const player of players) {
    for (const template of TEMPLATES) {
      const score = template.detect(player, game);
      if (score > 0) {
        scores.push({ player, template, score });
      }
    }
  }

  // Sort by score descending (greedy best-match)
  scores.sort((a, b) => b.score - a.score);

  const assignedPlayers = new Set<string>();

  for (const { player, template } of scores) {
    if (assignedPlayers.has(player.playerId) || usedTemplates.has(template.id)) continue;

    const { nickname, description } = template.format(player, game);
    results.push({ playerId: player.playerId, playerName: player.playerName, nickname, description });
    assignedPlayers.add(player.playerId);
    usedTemplates.add(template.id);
  }

  // Fallback for unmatched players
  for (const player of players) {
    if (!assignedPlayers.has(player.playerId)) {
      results.push({
        playerId: player.playerId,
        playerName: player.playerName,
        ...FALLBACK,
      });
    }
  }

  return results;
}
