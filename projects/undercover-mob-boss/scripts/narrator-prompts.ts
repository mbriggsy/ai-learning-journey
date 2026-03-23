import type { NarratorPrompt } from './types.js';

/**
 * All narrator lines for Undercover Mob Boss.
 *
 * Voice direction: 1940s noir detective narrator — gravelly, deliberate,
 * theatrical. Think Raymond Chandler audiobook meets Rod Serling.
 * Pauses indicated by ellipsis (...) in the script text.
 *
 * Total: 38 lines (15 round-start variants + 23 unique event lines)
 */
export const NARRATOR_PROMPTS = [
  // --- Game Start ---
  {
    id: 'intro',
    trigger: 'Game start',
    script: 'Citizens of Millbrook City... your fate has been sealed. Check your phone. Know your allegiance. And whatever you do... don\'t let it show.',
  },

  // --- Round Start (15 pre-generated variants) ---
  {
    id: 'round-start-1',
    trigger: 'Round 1',
    script: 'Round one. The city holds its breath.',
  },
  {
    id: 'round-start-2',
    trigger: 'Round 2',
    script: 'Round two. The city holds its breath.',
  },
  {
    id: 'round-start-3',
    trigger: 'Round 3',
    script: 'Round three. The city holds its breath.',
  },
  {
    id: 'round-start-4',
    trigger: 'Round 4',
    script: 'Round four. The city holds its breath.',
  },
  {
    id: 'round-start-5',
    trigger: 'Round 5',
    script: 'Round five. The city holds its breath.',
  },
  {
    id: 'round-start-6',
    trigger: 'Round 6',
    script: 'Round six. The tension builds.',
  },
  {
    id: 'round-start-7',
    trigger: 'Round 7',
    script: 'Round seven. Alliances are fracturing.',
  },
  {
    id: 'round-start-8',
    trigger: 'Round 8',
    script: 'Round eight. Trust is a luxury no one can afford.',
  },
  {
    id: 'round-start-9',
    trigger: 'Round 9',
    script: 'Round nine. The city is running out of time.',
  },
  {
    id: 'round-start-10',
    trigger: 'Round 10',
    script: 'Round ten. The walls are closing in.',
  },
  {
    id: 'round-start-11',
    trigger: 'Round 11',
    script: 'Round eleven. Every vote could be the last.',
  },
  {
    id: 'round-start-12',
    trigger: 'Round 12',
    script: 'Round twelve. The city teeters on the edge.',
  },
  {
    id: 'round-start-13',
    trigger: 'Round 13',
    script: 'Round thirteen. Unlucky for someone.',
  },
  {
    id: 'round-start-14',
    trigger: 'Round 14',
    script: 'Round fourteen. The end is near... for someone.',
  },
  {
    id: 'round-start-15',
    trigger: 'Round 15',
    script: 'Round fifteen. If this city survives the night... it\'ll be a miracle.',
  },

  // --- Election Phase ---
  {
    id: 'nomination',
    trigger: 'Mayor nominates Police Chief',
    script: 'The gavel passes. A new Mayor takes the seat. Choose wisely... the wrong partner could cost the city everything.',
  },
  {
    id: 'vote-open',
    trigger: 'Voting begins',
    script: 'Cast your vote. Approve... or deny. No one will know. Until everyone knows.',
  },
  {
    id: 'vote-reveal',
    trigger: 'Votes revealed',
    script: 'The votes are in. Democracy... has spoken. Or has it?',
  },
  {
    id: 'approved',
    trigger: 'Nomination passes',
    script: 'The vote carries. A new government takes power. For better... or for worse.',
  },
  {
    id: 'blocked',
    trigger: 'Nomination fails',
    script: 'Denied. The people have spoken. For now.',
  },

  // --- Election Tracker ---
  {
    id: 'tracker-advance',
    trigger: 'Election tracker moves',
    script: 'Three failed nominations. The city cannot afford indecision.',
  },
  {
    id: 'auto-enact',
    trigger: 'Tracker hits 3',
    script: 'The deadlock ends. A policy is enacted without a vote.',
  },

  // --- Policy Enactment ---
  {
    id: 'good-policy',
    trigger: 'Good policy enacted',
    script: 'A good policy for Millbrook City. The citizens breathe a little easier.',
  },
  {
    id: 'bad-policy',
    trigger: 'Bad policy enacted',
    script: 'Another bad policy. The mob smiles.',
  },

  // --- Executive Powers ---
  {
    id: 'investigate',
    trigger: 'Investigate power activated',
    script: 'The Police Chief has demanded an investigation. Someone\'s cover is about to get a little thinner.',
  },
  {
    id: 'special-nomination',
    trigger: 'Special nomination power activated',
    script: 'The Police Chief will choose the next Mayor. Democracy takes a back seat.',
  },
  {
    id: 'execution',
    trigger: 'Execution power activated',
    script: 'One player will be eliminated. Choose carefully. The mob is counting on your mistakes.',
  },
  {
    id: 'executed',
    trigger: 'Player eliminated',
    script: 'A player has been eliminated. Whether they were friend or foe... you\'ll find out soon enough.',
  },

  // --- Game End: Citizens Win ---
  {
    id: 'mob-boss-executed',
    trigger: 'Mob Boss eliminated by execution',
    script: 'The Mob Boss is dead. Millbrook City is saved.',
  },
  {
    id: 'citizens-win-policy',
    trigger: '5 good policies enacted',
    script: 'Five good policies enacted. Millbrook City is saved. The mob has lost.',
  },
  {
    id: 'citizens-win-execution',
    trigger: 'Mob Boss found and executed',
    script: 'The Mob Boss has been found and eliminated. The city is free.',
  },

  // --- Game End: Mob Wins ---
  {
    id: 'mob-wins-policy',
    trigger: '6 bad policies enacted',
    script: 'Six bad policies enacted. Millbrook City belongs to the mob. Game over.',
  },
  {
    id: 'mob-wins-election',
    trigger: 'Mob Boss elected Police Chief after 3+ bad policies',
    script: 'The Mob Boss has taken office. The city never saw it coming. Game over.',
  },

  // --- Executive Powers (continued) ---
  {
    id: 'policy-peek',
    trigger: 'Policy peek power activated',
    script: 'The Police Chief takes a long look at the top of the deck. Three cards... and the truth of what\'s coming.',
  },

  // --- Deck & Veto Mechanics ---
  {
    id: 'deck-reshuffle',
    trigger: 'Policy deck reshuffled (random threshold 3-7)',
    script: 'The policy deck has been reshuffled. The city\'s memory... is short.',
  },
  {
    id: 'veto-proposed',
    trigger: 'Police Chief proposes veto (after 5 bad policies)',
    script: 'The Police Chief has proposed a veto. The Mayor must decide.',
  },
  {
    id: 'veto-approved',
    trigger: 'Mayor agrees to veto',
    script: 'The veto stands. Both policies are discarded. The clock ticks.',
  },
  {
    id: 'veto-rejected',
    trigger: 'Mayor refuses veto',
    script: 'The Mayor refuses the veto. A policy must be enacted.',
  },
] as const satisfies readonly NarratorPrompt[];

/** Union of all valid narrator IDs — used to validate --only CLI arg. */
export type NarratorId = (typeof NARRATOR_PROMPTS)[number]['id'];

/** Set of valid narrator IDs for runtime validation. */
export const NARRATOR_IDS: Set<string> = new Set(NARRATOR_PROMPTS.map((p) => p.id));
