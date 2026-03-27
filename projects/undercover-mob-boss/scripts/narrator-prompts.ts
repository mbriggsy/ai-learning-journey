import type { NarratorPrompt, NarratorVariant } from './types.js';

/**
 * V2 Narrator Variant Pool — Tiered Variants Per Trigger.
 *
 * Voice direction: 1940s noir detective narrator — gravelly, deliberate,
 * theatrical. Think Raymond Chandler audiobook meets Rod Serling.
 * Pauses indicated by ellipsis (...) in the script text.
 *
 * Variant tiers:
 *   High (5-6): nomination, vote-open, vote-reveal, approved, blocked
 *   Medium (3-4): good-policy, bad-policy, tracker-advance, auto-enact
 *   Low (2-3): intro, execution, executed, investigate, game-over states
 *   Rare (2): veto-*, deck-reshuffle, special-nomination, policy-peek
 *
 * V1 originals are always variant #1 — preserved, never deleted.
 */

// ── Game Event Variants ───────────────────────────────────────────
// Used by the narrator pool selection system.

export const NARRATOR_VARIANTS: NarratorVariant[] = [
  // ── intro (3 variants) ──────────────────────────────────────────
  {
    triggerId: 'intro',
    variantNum: 1,
    description: 'Game start — role reveal begins',
    category: 'game',
    script: 'Citizens of Millbrook City... your fate has been sealed. Check your phone. Know your allegiance. And whatever you do... don\'t let it show.',
  },
  {
    triggerId: 'intro',
    variantNum: 2,
    description: 'Game start — role reveal begins',
    category: 'game',
    script: 'Welcome to Millbrook City. A place where everyone smiles... and nobody trusts a soul. Check your phone. The truth is waiting.',
  },
  {
    triggerId: 'intro',
    variantNum: 3,
    description: 'Game start — role reveal begins',
    category: 'game',
    script: 'The cards have been dealt. The roles... assigned. Look at your phone. And remember... in this city, secrets don\'t stay buried for long.',
  },

  // ── nomination (6 variants) ─────────────────────────────────────
  {
    triggerId: 'nomination',
    variantNum: 1,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'The gavel passes. A new Mayor takes the seat. Choose wisely... the wrong partner could cost the city everything.',
  },
  {
    triggerId: 'nomination',
    variantNum: 2,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'Another round, another Mayor. Now comes the real question... who do you trust?',
  },
  {
    triggerId: 'nomination',
    variantNum: 3,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'The Mayor\'s chair is warm. Pick your Commissioner... and pray you picked right.',
  },
  {
    triggerId: 'nomination',
    variantNum: 4,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'A new name on the office door. The Mayor has a choice to make... and the city is watching.',
  },
  {
    triggerId: 'nomination',
    variantNum: 5,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'Power changes hands in this city like cards in a crooked game. The Mayor will now nominate.',
  },
  {
    triggerId: 'nomination',
    variantNum: 6,
    description: 'Mayor nominates Commissioner',
    category: 'game',
    script: 'Every government needs a partner. The Mayor steps forward... and chooses their Commissioner.',
  },

  // ── vote-open (6 variants) ──────────────────────────────────────
  {
    triggerId: 'vote-open',
    variantNum: 1,
    description: 'Voting begins',
    category: 'game',
    script: 'Cast your vote. Approve... or deny. No one will know. Until everyone knows.',
  },
  {
    triggerId: 'vote-open',
    variantNum: 2,
    description: 'Voting begins',
    category: 'game',
    script: 'The ballot is open. Ja... or Nein. Choose carefully... there are no take-backs in this town.',
  },
  {
    triggerId: 'vote-open',
    variantNum: 3,
    description: 'Voting begins',
    category: 'game',
    script: 'Time to vote. A simple yes or no... but nothing in this city is ever simple.',
  },
  {
    triggerId: 'vote-open',
    variantNum: 4,
    description: 'Voting begins',
    category: 'game',
    script: 'The people will decide. Approve this government... or tear it down. Vote now.',
  },
  {
    triggerId: 'vote-open',
    variantNum: 5,
    description: 'Voting begins',
    category: 'game',
    script: 'Democracy in action. Or is it? Cast your vote... and hope the truth survives.',
  },
  {
    triggerId: 'vote-open',
    variantNum: 6,
    description: 'Voting begins',
    category: 'game',
    script: 'Phones out. Thumbs ready. The city demands your verdict.',
  },

  // ── vote-reveal (6 variants) ────────────────────────────────────
  {
    triggerId: 'vote-reveal',
    variantNum: 1,
    description: 'Votes revealed',
    category: 'game',
    script: 'The votes are in. Democracy... has spoken. Or has it?',
  },
  {
    triggerId: 'vote-reveal',
    variantNum: 2,
    description: 'Votes revealed',
    category: 'game',
    script: 'Every hand has been played. Time to see who\'s bluffing.',
  },
  {
    triggerId: 'vote-reveal',
    variantNum: 3,
    description: 'Votes revealed',
    category: 'game',
    script: 'The ballots are counted. The truth... is on the table.',
  },
  {
    triggerId: 'vote-reveal',
    variantNum: 4,
    description: 'Votes revealed',
    category: 'game',
    script: 'And there it is. The will of the people... for what it\'s worth.',
  },
  {
    triggerId: 'vote-reveal',
    variantNum: 5,
    description: 'Votes revealed',
    category: 'game',
    script: 'The results are in. Someone\'s smiling... and someone\'s sweating.',
  },
  {
    triggerId: 'vote-reveal',
    variantNum: 6,
    description: 'Votes revealed',
    category: 'game',
    script: 'Votes tallied. Secrets exposed. Let\'s see where this city stands.',
  },

  // ── approved (5 variants) ───────────────────────────────────────
  {
    triggerId: 'approved',
    variantNum: 1,
    description: 'Nomination passes',
    category: 'game',
    script: 'The vote carries. A new government takes power. For better... or for worse.',
  },
  {
    triggerId: 'approved',
    variantNum: 2,
    description: 'Nomination passes',
    category: 'game',
    script: 'Approved. The people have placed their trust. Whether it\'s deserved... remains to be seen.',
  },
  {
    triggerId: 'approved',
    variantNum: 3,
    description: 'Nomination passes',
    category: 'game',
    script: 'The government stands. A new chapter begins... and the mob takes notes.',
  },
  {
    triggerId: 'approved',
    variantNum: 4,
    description: 'Nomination passes',
    category: 'game',
    script: 'Motion carried. The Mayor and Commissioner take office... with all eyes on them.',
  },
  {
    triggerId: 'approved',
    variantNum: 5,
    description: 'Nomination passes',
    category: 'game',
    script: 'The city has spoken. This government... will govern. The question is... for whom?',
  },

  // ── blocked (5 variants) ────────────────────────────────────────
  {
    triggerId: 'blocked',
    variantNum: 1,
    description: 'Nomination fails',
    category: 'game',
    script: 'Denied. The people have spoken. For now.',
  },
  {
    triggerId: 'blocked',
    variantNum: 2,
    description: 'Nomination fails',
    category: 'game',
    script: 'Rejected. The city doesn\'t trust this ticket. Next.',
  },
  {
    triggerId: 'blocked',
    variantNum: 3,
    description: 'Nomination fails',
    category: 'game',
    script: 'No deal. The people want different leadership... or at least, some of them do.',
  },
  {
    triggerId: 'blocked',
    variantNum: 4,
    description: 'Nomination fails',
    category: 'game',
    script: 'Struck down. The government falls before it even starts. Back to the drawing board.',
  },
  {
    triggerId: 'blocked',
    variantNum: 5,
    description: 'Nomination fails',
    category: 'game',
    script: 'Vetoed by the people. Trust... is in short supply tonight.',
  },

  // ── good-policy (4 variants) ────────────────────────────────────
  {
    triggerId: 'good-policy',
    variantNum: 1,
    description: 'Good policy enacted',
    category: 'game',
    script: 'A virtuous policy for Millbrook City. The citizens breathe a little easier.',
  },
  {
    triggerId: 'good-policy',
    variantNum: 2,
    description: 'Good policy enacted',
    category: 'game',
    script: 'A win for the people. One step closer... to a city worth saving.',
  },
  {
    triggerId: 'good-policy',
    variantNum: 3,
    description: 'Good policy enacted',
    category: 'game',
    script: 'Good news in Millbrook City. That\'s rare enough to make the front page.',
  },
  {
    triggerId: 'good-policy',
    variantNum: 4,
    description: 'Good policy enacted',
    category: 'game',
    script: 'The city gets a lifeline. The citizens cheer... the mob grits its teeth.',
  },

  // ── bad-policy (4 variants) ─────────────────────────────────────
  {
    triggerId: 'bad-policy',
    variantNum: 1,
    description: 'Bad policy enacted',
    category: 'game',
    script: 'Another corrupt policy. The mob smiles.',
  },
  {
    triggerId: 'bad-policy',
    variantNum: 2,
    description: 'Bad policy enacted',
    category: 'game',
    script: 'Darkness creeps through City Hall. Another corrupt policy... and the mob tightens its grip.',
  },
  {
    triggerId: 'bad-policy',
    variantNum: 3,
    description: 'Bad policy enacted',
    category: 'game',
    script: 'The wrong side wins again. Millbrook City slips a little further into shadow.',
  },
  {
    triggerId: 'bad-policy',
    variantNum: 4,
    description: 'Bad policy enacted',
    category: 'game',
    script: 'Another blow to the people. Someone in that room... is not who they claim to be.',
  },

  // ── tracker-advance (3 variants) ────────────────────────────────
  {
    triggerId: 'tracker-advance',
    variantNum: 1,
    description: 'Election tracker moves forward',
    category: 'game',
    script: 'Three failed nominations. The city cannot afford indecision.',
  },
  {
    triggerId: 'tracker-advance',
    variantNum: 2,
    description: 'Election tracker moves forward',
    category: 'game',
    script: 'The election tracker advances. Deadlock... is a luxury this city can\'t afford.',
  },
  {
    triggerId: 'tracker-advance',
    variantNum: 3,
    description: 'Election tracker moves forward',
    category: 'game',
    script: 'Another failed government. The clock is ticking... and chaos waits for no one.',
  },

  // ── auto-enact (3 variants) ─────────────────────────────────────
  {
    triggerId: 'auto-enact',
    variantNum: 1,
    description: 'Tracker hits 3 — policy auto-enacted',
    category: 'game',
    script: 'The deadlock ends. A policy is enacted without a vote.',
  },
  {
    triggerId: 'auto-enact',
    variantNum: 2,
    description: 'Tracker hits 3 — policy auto-enacted',
    category: 'game',
    script: 'Too much indecision. The top card is flipped... and fate decides.',
  },
  {
    triggerId: 'auto-enact',
    variantNum: 3,
    description: 'Tracker hits 3 — policy auto-enacted',
    category: 'game',
    script: 'Democracy failed. The deck speaks instead. A policy enacted... by default.',
  },

  // ── investigate (3 variants) ────────────────────────────────────
  {
    triggerId: 'investigate',
    variantNum: 1,
    description: 'Investigation power activated',
    category: 'game',
    script: 'The Mayor has called for an investigation. Someone\'s cover is about to get a little thinner.',
  },
  {
    triggerId: 'investigate',
    variantNum: 2,
    description: 'Investigation power activated',
    category: 'game',
    script: 'An investigation is underway. One player\'s loyalty... is about to be put under the microscope.',
  },
  {
    triggerId: 'investigate',
    variantNum: 3,
    description: 'Investigation power activated',
    category: 'game',
    script: 'The Mayor digs into the files. Someone\'s secret... is about to surface.',
  },

  // ── special-nomination (2 variants) ─────────────────────────────
  {
    triggerId: 'special-nomination',
    variantNum: 1,
    description: 'Special nomination power activated',
    category: 'game',
    script: 'The Mayor will choose the next Mayor. Democracy takes a back seat.',
  },
  {
    triggerId: 'special-nomination',
    variantNum: 2,
    description: 'Special nomination power activated',
    category: 'game',
    script: 'A special appointment. The Mayor bypasses the vote... and handpicks the next Mayor.',
  },

  // ── execution (3 variants) ──────────────────────────────────────
  {
    triggerId: 'execution',
    variantNum: 1,
    description: 'Execution power activated',
    category: 'game',
    script: 'One player will be eliminated. Choose carefully. The mob is counting on your mistakes.',
  },
  {
    triggerId: 'execution',
    variantNum: 2,
    description: 'Execution power activated',
    category: 'game',
    script: 'The Mayor draws the line. One player... leaves the table tonight.',
  },
  {
    triggerId: 'execution',
    variantNum: 3,
    description: 'Execution power activated',
    category: 'game',
    script: 'An execution order has been signed. One citizen will be removed... permanently.',
  },

  // ── executed (3 variants) ───────────────────────────────────────
  {
    triggerId: 'executed',
    variantNum: 1,
    description: 'Player has been eliminated',
    category: 'game',
    script: 'A player has been eliminated. Whether they were friend or foe... you\'ll find out soon enough.',
  },
  {
    triggerId: 'executed',
    variantNum: 2,
    description: 'Player has been eliminated',
    category: 'game',
    script: 'One fewer voice at the table. The city moves on... but the ghost remains.',
  },
  {
    triggerId: 'executed',
    variantNum: 3,
    description: 'Player has been eliminated',
    category: 'game',
    script: 'The deed is done. One player is gone. The question lingers... was it the right call?',
  },

  // ── policy-peek (2 variants) ────────────────────────────────────
  {
    triggerId: 'policy-peek',
    variantNum: 1,
    description: 'Policy peek power activated',
    category: 'game',
    script: 'The Mayor takes a long look at the top of the deck. Three cards... and the truth of what\'s coming.',
  },
  {
    triggerId: 'policy-peek',
    variantNum: 2,
    description: 'Policy peek power activated',
    category: 'game',
    script: 'A glimpse behind the curtain. The Mayor sees what the deck has in store... and must decide what to share.',
  },

  // ── mob-boss-executed (2 variants) ──────────────────────────────
  {
    triggerId: 'mob-boss-executed',
    variantNum: 1,
    description: 'Mob Boss eliminated by execution',
    category: 'game',
    script: 'The Mob Boss is dead. Millbrook City is saved.',
  },
  {
    triggerId: 'mob-boss-executed',
    variantNum: 2,
    description: 'Mob Boss eliminated by execution',
    category: 'game',
    script: 'They found the Mob Boss. One bullet... and Millbrook City breathes again.',
  },

  // ── citizens-win-policy (2 variants) ────────────────────────────
  {
    triggerId: 'citizens-win-policy',
    variantNum: 1,
    description: '5 good policies enacted — citizens win',
    category: 'game',
    script: 'Five virtuous policies enacted. Millbrook City is saved. The mob has lost.',
  },
  {
    triggerId: 'citizens-win-policy',
    variantNum: 2,
    description: '5 good policies enacted — citizens win',
    category: 'game',
    script: 'Five policies for the people. The city stands. The mob... retreats into the shadows.',
  },

  // ── citizens-win-execution (2 variants) ─────────────────────────
  {
    triggerId: 'citizens-win-execution',
    variantNum: 1,
    description: 'Mob Boss found and executed — citizens win',
    category: 'game',
    script: 'The Mob Boss has been found and eliminated. The city is free.',
  },
  {
    triggerId: 'citizens-win-execution',
    variantNum: 2,
    description: 'Mob Boss found and executed — citizens win',
    category: 'game',
    script: 'Justice... swift and final. The Mob Boss is gone. Millbrook City belongs to its people once more.',
  },

  // ── mob-wins-policy (2 variants) ────────────────────────────────
  {
    triggerId: 'mob-wins-policy',
    variantNum: 1,
    description: '6 bad policies enacted — mob wins',
    category: 'game',
    script: 'Six corrupt policies enacted. Millbrook City belongs to the mob. Game over.',
  },
  {
    triggerId: 'mob-wins-policy',
    variantNum: 2,
    description: '6 bad policies enacted — mob wins',
    category: 'game',
    script: 'The sixth corrupt policy drops. Millbrook City goes dark. The mob... owns everything.',
  },

  // ── mob-wins-election (2 variants) ──────────────────────────────
  {
    triggerId: 'mob-wins-election',
    variantNum: 1,
    description: 'Mob Boss elected Commissioner after 3+ bad policies',
    category: 'game',
    script: 'The Mob Boss has taken office. The city never saw it coming. Game over.',
  },
  {
    triggerId: 'mob-wins-election',
    variantNum: 2,
    description: 'Mob Boss elected Commissioner after 3+ bad policies',
    category: 'game',
    script: 'You elected the Mob Boss... Commissioner. The fox is running the henhouse. Game over.',
  },

  // ── deck-reshuffle (2 variants) ─────────────────────────────────
  {
    triggerId: 'deck-reshuffle',
    variantNum: 1,
    description: 'Policy deck reshuffled',
    category: 'game',
    script: 'The policy deck has been reshuffled. The city\'s memory... is short.',
  },
  {
    triggerId: 'deck-reshuffle',
    variantNum: 2,
    description: 'Policy deck reshuffled',
    category: 'game',
    script: 'The deck is reshuffled. New cards... same old city.',
  },

  // ── veto-proposed (2 variants) ──────────────────────────────────
  {
    triggerId: 'veto-proposed',
    variantNum: 1,
    description: 'Commissioner proposes veto',
    category: 'game',
    script: 'The Commissioner has proposed a veto. The Mayor must decide.',
  },
  {
    triggerId: 'veto-proposed',
    variantNum: 2,
    description: 'Commissioner proposes veto',
    category: 'game',
    script: 'A veto on the table. The Commissioner says no... but does the Mayor agree?',
  },

  // ── veto-approved (2 variants) ──────────────────────────────────
  {
    triggerId: 'veto-approved',
    variantNum: 1,
    description: 'Mayor agrees to veto',
    category: 'game',
    script: 'The veto stands. Both policies are discarded. The clock ticks.',
  },
  {
    triggerId: 'veto-approved',
    variantNum: 2,
    description: 'Mayor agrees to veto',
    category: 'game',
    script: 'Veto approved. The policies burn. The election tracker... moves forward.',
  },

  // ── veto-rejected (2 variants) ──────────────────────────────────
  {
    triggerId: 'veto-rejected',
    variantNum: 1,
    description: 'Mayor refuses veto',
    category: 'game',
    script: 'The Mayor refuses the veto. A policy must be enacted.',
  },
  {
    triggerId: 'veto-rejected',
    variantNum: 2,
    description: 'Mayor refuses veto',
    category: 'game',
    script: 'Veto denied. The Mayor overrules. One of these policies... will see the light of day.',
  },
];

// ── Round-Start Lines ─────────────────────────────────────────────
// Exempt from variant system. Round number = file ID (deterministic).

export const ROUND_START_PROMPTS: NarratorPrompt[] = [
  { id: 'round-start-1', trigger: 'Round 1', script: 'Round one. The city holds its breath.' },
  { id: 'round-start-2', trigger: 'Round 2', script: 'Round two. The city holds its breath.' },
  { id: 'round-start-3', trigger: 'Round 3', script: 'Round three. The city holds its breath.' },
  { id: 'round-start-4', trigger: 'Round 4', script: 'Round four. The city holds its breath.' },
  { id: 'round-start-5', trigger: 'Round 5', script: 'Round five. The city holds its breath.' },
  { id: 'round-start-6', trigger: 'Round 6', script: 'Round six. The tension builds.' },
  { id: 'round-start-7', trigger: 'Round 7', script: 'Round seven. Alliances are fracturing.' },
  { id: 'round-start-8', trigger: 'Round 8', script: 'Round eight. Trust is a luxury no one can afford.' },
  { id: 'round-start-9', trigger: 'Round 9', script: 'Round nine. The city is running out of time.' },
  { id: 'round-start-10', trigger: 'Round 10', script: 'Round ten. The walls are closing in.' },
  { id: 'round-start-11', trigger: 'Round 11', script: 'Round eleven. Every vote could be the last.' },
  { id: 'round-start-12', trigger: 'Round 12', script: 'Round twelve. The city teeters on the edge.' },
  { id: 'round-start-13', trigger: 'Round 13', script: 'Round thirteen. Unlucky for someone.' },
  { id: 'round-start-14', trigger: 'Round 14', script: 'Round fourteen. The end is near... for someone.' },
  { id: 'round-start-15', trigger: 'Round 15', script: 'Round fifteen. If this city survives the night... it\'ll be a miracle.' },
];

// ── Trailer V2 Lines (legacy — WAV files preserved in public/audio/) ─
// Not part of game narrator system. Used only in video trailer V2.

export const TRAILER_V2_PROMPTS: NarratorPrompt[] = [
  { id: 'trailer-stakes', trigger: 'Trailer V2: after role reveal', script: 'One of you... is the Mob Boss. And by the time you figure out who... it might already be too late.' },
  { id: 'trailer-tagline', trigger: 'Trailer V2: table establishing shot', script: 'Everyone has a role. Nobody tells the truth.' },
  { id: 'trailer-bridge', trigger: 'Trailer V2: Act 2 reveal', script: 'This game... was built in eight nights.' },
  { id: 'trailer-build-stats', trigger: 'Trailer V2: stats sequence', script: 'Zero lines of human code. Zero functional defects. Spec-driven. AI-built... Flawless.' },
  { id: 'trailer-timeline', trigger: 'Trailer V2: timeline sequence', script: 'From an empty page... to a city full of secrets.' },
  { id: 'trailer-closing', trigger: 'Trailer V2: end card', script: 'Millbrook City is waiting. The question is... can you be trusted?' },
  { id: 'trailer-day-job', trigger: 'Trailer V2: Act 2 reveal extended', script: 'The human has a day job. The AI... doesn\'t sleep.' },
  { id: 'trailer-vision', trigger: 'Trailer V2: blueprint scroll', script: 'Seven phase plans. Ten thousand lines of specifications. Every rule. Every edge case... Written before a single line of code.' },
  { id: 'trailer-qa', trigger: 'Trailer V2: QA audit scene', script: 'Three rounds. Twenty-nine agents. Forty-six issues found... not one of them functional. Ankle biters... noise.' },
  { id: 'trailer-two-dollars', trigger: 'Trailer V2: API cost reveal', script: 'Fifteen images. Thirty-nine voice lines. All of it... two dollars.' },
  { id: 'trailer-sleep-dep', trigger: 'Trailer V2: human sleep deprivation joke', script: 'The human ran on anger and adrenaline. The AI just... ran.' },
  { id: 'trailer-token-bill', trigger: 'Trailer V2: token bill joke', script: 'The token bill... we don\'t talk about the token bill.' },
  { id: 'trailer-ai-bar-tab', trigger: 'Trailer V2: AI bar tab punchline', script: 'And the AI bar tab... still open.' },
];

// ── Trailer V3 Lines — "The Origin Story" ────────────────────────
// Narrator (Charon) tells the story of the game's creation.
// Autonomous agentic SDLC showcase. Each line = one WAV file.

export const TRAILER_V3_PROMPTS: NarratorPrompt[] = [
  // S01 — Cold Open
  { id: 'v3-cold-open', trigger: 'V3: cold open', script: 'Briggsy didn\'t write a single line of code... Not one.' },

  // S02 — The Thesis
  { id: 'v3-thesis', trigger: 'V3: thesis', script: 'It started at game night. A card game everyone loved... that deserved a screen instead of a table. So he picked a stack he\'d never touched. A discipline he knew nothing about. Gaming. The man builds enterprise software after all... And he made a bet... that a machine could build something worth playing.' },

  // S03 — The Spec
  { id: 'v3-spec', trigger: 'V3: spec scroll', script: 'Together, they figured out what to build. The game. The rules. The feel. Then the machine wrote the specification.' },

  // S04 — The Swarm
  { id: 'v3-swarm', trigger: 'V3: challenger agents', script: 'Then Briggsy unleashed the swarm. Challenger agents... designed to pick apart every assumption, stress-test every transition, harden every phase, hunt every edge case. What survived was ready to build. Fourteen thousand lines of bulletproof specification. Seven phases of implementation.' },

  // S05 — The Code
  { id: 'v3-code', trigger: 'V3: code generation', script: 'Fifteen thousand lines of code. Written by machines. Reviewed by machines. Tested by machines. Deployed by machines. The human? Air traffic control. Monitoring. Directing... Never touching the controls.' },

  // S06 — The Tests (two parts for timing control)
  { id: 'v3-tests', trigger: 'V3: test results', script: 'Game simulation testing. Thirteen hundred and thirty-one tests. Thousands of scenarios... agents playing drunk, doing things no sane player would. Rage-tapping. Disconnecting mid-vote. Every edge case a room full of silly humans could find.' },
  { id: 'v3-nothing-broke', trigger: 'V3: test punchline', script: 'Nothing broke.' },

  // S07 — The Art
  { id: 'v3-art', trigger: 'V3: asset reveal', script: 'Every card. Every face. Every voice you\'ll hear... including this one... even... this video... created by autonomous AI agents.' },

  // S08 — The Punchline
  { id: 'v3-human', trigger: 'V3: human contribution', script: 'The human\'s contribution? Direction. Ambition... And a truly inadvisable amount of caffeine.' },
  { id: 'v3-hes-fine', trigger: 'V3: sleep dep — first beat', script: 'He\'s fine.' },
  { id: 'v3-probably', trigger: 'V3: sleep dep — deadpan punchline', script: 'Probably.' },

  // S09 — The Reveal
  { id: 'v3-reveal', trigger: 'V3: game reveal', script: 'So what came out the other side? A game of deception the humans have fun playing.' },

  // S10 — Title + CTA
  { id: 'v3-cta', trigger: 'V3: end card', script: 'Spec-Driven Development. One hundred percent autonomous SDLC... That is the product.' },
  { id: 'v3-cta-tag', trigger: 'V3: game name + play free', script: 'Undercover Mob Boss. Play it for free.' },
  { id: 'v3-cta-closer', trigger: 'V3: noir closer over fade to black', script: 'Trust no one.' },
];

// Combined for generation pipeline
export const TRAILER_PROMPTS: NarratorPrompt[] = [
  ...TRAILER_V2_PROMPTS,
  ...TRAILER_V3_PROMPTS,
];

// ── Derived Constants ─────────────────────────────────────────────

/** All game variant IDs for CLI validation (e.g. 'nomination-1', 'intro-3'). */
export const GAME_VARIANT_IDS: Set<string> = new Set(
  NARRATOR_VARIANTS.map((v) => `${v.triggerId}-${v.variantNum}`),
);

/** All round-start IDs. */
export const ROUND_START_IDS: Set<string> = new Set(
  ROUND_START_PROMPTS.map((p) => p.id),
);

/** All trailer IDs. */
export const TRAILER_IDS: Set<string> = new Set(
  TRAILER_PROMPTS.map((p) => p.id),
);

/** Combined set of all valid narrator IDs for --only CLI validation. */
export const NARRATOR_IDS: Set<string> = new Set([
  ...GAME_VARIANT_IDS,
  ...ROUND_START_IDS,
  ...TRAILER_IDS,
]);
