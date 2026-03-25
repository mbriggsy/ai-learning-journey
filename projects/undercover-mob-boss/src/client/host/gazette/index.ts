// ── The Millbrook City Gazette ─────────────────────────────────────
// Post-game noir newspaper. The V2 crown jewel.
// Mounts within the game-over overlay as a "second act."

import './gazette.css';
import type { HostState, RevealedPlayer } from '../../../shared/protocol';
import type { GazetteData, GameOutcome, GameAnalysis, PlayerAnalysis } from './types';
import { detectKeyMoments, formatMoment } from './moments';
import { assignSuperlatives } from './awards';
import { send } from '../../connection';

let gazetteEl: HTMLElement | null = null;

// ── Data Computation ──────────────────────────────────────────────

function deriveOutcome(state: HostState): GameOutcome {
  if (state.winReason === 'Game abandoned due to inactivity') return { type: 'abandoned' };
  if (state.winReason === '5 good policies enacted') return { type: 'citizens-win-policy' };
  if (state.winReason === 'Mob Boss executed') return { type: 'citizens-win-execution', round: state.round };
  if (state.winReason === '6 bad policies enacted') return { type: 'mob-wins-policy' };
  if (state.winReason === 'Mob Boss elected Commissioner after 3+ bad policies') {
    const mobBoss = (state.players as RevealedPlayer[]).find(p => p.role === 'mob-boss');
    return { type: 'mob-wins-election', mobBossId: mobBoss?.id ?? '', round: state.round };
  }
  return { type: 'abandoned' };
}

function buildGameAnalysis(state: HostState): GameAnalysis {
  const players = state.players as RevealedPlayer[];
  const mobBoss = players.find(p => p.role === 'mob-boss')!;

  return {
    totalRounds: state.round,
    winner: state.winner,
    outcome: deriveOutcome(state),
    mobBossId: mobBoss.id,
    mobSoldierIds: players.filter(p => p.role === 'mob-soldier').map(p => p.id),
    citizenIds: players.filter(p => p.role === 'citizen').map(p => p.id),
    totalGoodPolicies: state.goodPoliciesEnacted,
    totalBadPolicies: state.badPoliciesEnacted,
    governments: state.voteHistory ?? [],
    policies: state.policyHistory,
    investigations: state.investigationHistory ?? [],
    players,
  };
}

function buildPlayerAnalyses(game: GameAnalysis): PlayerAnalysis[] {
  return game.players.map(player => {
    let approveCount = 0;
    let blockCount = 0;
    let votedSameAsMobBoss = 0;
    let timesAsMayor = 0;
    let timesAsCommissioner = 0;

    for (const gov of game.governments) {
      const vote = gov.votes[player.id];
      const bossVote = gov.votes[game.mobBossId];
      if (vote === 'approve') approveCount++;
      if (vote === 'block') blockCount++;
      if (vote && bossVote && vote === bossVote) votedSameAsMobBoss++;
      if (gov.mayorId === player.id) timesAsMayor++;
      if (gov.nomineeId === player.id && gov.passed) timesAsCommissioner++;
    }

    const policiesAsGov = game.policies.filter(p => {
      const gov = game.governments.find(g => g.round === p.round && g.passed);
      return gov && (gov.mayorId === player.id || gov.nomineeId === player.id);
    });

    return {
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      isAlive: player.isAlive,
      timesAsMayor,
      timesAsCommissioner,
      approveCount,
      blockCount,
      votedSameAsMobBoss,
      totalVotes: approveCount + blockCount,
      wasExecuted: !player.isAlive,
      executedRound: !player.isAlive ? game.totalRounds : null,
      policiesEnactedAsGovernment: policiesAsGov.map(p => ({ type: p.card.type, round: p.round })),
    };
  });
}

function generateHeadline(outcome: GameOutcome): { headline: string; subheadline: string } {
  const variants: Record<string, string[]> = {
    'citizens-win-policy': [
      'CITIZENS TRIUMPH: Five Virtuous Policies Save Millbrook City',
      'DEMOCRACY PREVAILS: Citizens Enact Five Policies for the People',
      'THE CITY STANDS: Millbrook Beats the Mob with Votes, Not Bullets',
    ],
    'citizens-win-execution': [
      'MOB BOSS UNMASKED: Citizens Execute the Crime Lord',
      'JUSTICE SERVED: Millbrook City Eliminates the Mob Boss',
      'THE BOSS IS DEAD: A City Breathes Free Tonight',
    ],
    'mob-wins-policy': [
      'DARKNESS FALLS: Six Corrupt Policies Seal Millbrook\'s Fate',
      'MOB TIGHTENS GRIP: Corruption Consumes City Hall',
      'THE FIX IS IN: Millbrook City Belongs to the Mob',
    ],
    'mob-wins-election': [
      'THE FOX IN THE HENHOUSE: Mob Boss Elected Commissioner',
      'CITY BETRAYED: Citizens Unknowingly Elect the Mob Boss',
      'GAME OVER: The Mob Boss Took Office and Nobody Noticed',
    ],
    'abandoned': [
      'THE CITY SLEEPS: Millbrook\'s Leaders Abandon Their Posts',
    ],
  };

  const options = variants[outcome.type] ?? variants['abandoned'];
  const headline = options[Math.floor(Math.random() * options.length)];

  return {
    headline,
    subheadline: 'An exclusive report from the city\'s most trusted newsroom.',
  };
}

function computeGazetteData(state: HostState): GazetteData {
  const outcome = deriveOutcome(state);
  const { headline, subheadline } = generateHeadline(outcome);
  const game = buildGameAnalysis(state);
  const playerAnalyses = buildPlayerAnalyses(game);
  const moments = detectKeyMoments(game);
  const superlatives = assignSuperlatives(playerAnalyses, game);

  return {
    headline,
    subheadline,
    outcome,
    players: state.players as RevealedPlayer[],
    policies: state.policyHistory,
    governments: state.voteHistory ?? [],
    moments,
    superlatives,
    round: state.round,
    goodPolicies: state.goodPoliciesEnacted,
    badPolicies: state.badPoliciesEnacted,
  };
}

// ── Rendering (safe DOM construction — no innerHTML with user data) ──

function formatRole(role: string): string {
  switch (role) {
    case 'citizen': return 'Citizen';
    case 'mob-soldier': return 'Mob Soldier';
    case 'mob-boss': return 'THE MOB BOSS';
    default: return role;
  }
}

function roleBadgeClass(role: string): string {
  if (role === 'citizen') return 'gazette__role-badge gazette__role-badge--citizen';
  if (role === 'mob-soldier') return 'gazette__role-badge gazette__role-badge--mob-soldier';
  return 'gazette__role-badge gazette__role-badge--mob-boss';
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function renderGazette(data: GazetteData): HTMLElement {
  const root = el('div', 'gazette');

  // Masthead
  const masthead = el('div', 'gazette__masthead');
  masthead.appendChild(el('h1', 'gazette__title', 'The Millbrook City Gazette'));
  masthead.appendChild(el('div', 'gazette__subtitle', "Millbrook City's Most Trusted Source Since 1943"));
  root.appendChild(masthead);

  // Headline
  root.appendChild(el('h2', 'gazette__headline', data.headline));
  root.appendChild(el('div', 'gazette__subheadline', data.subheadline));

  // Rogues Gallery
  root.appendChild(sectionHeader('ROGUES GALLERY'));
  const rolesGrid = el('div', 'gazette__roles');
  for (const player of data.players) {
    const revealed = player as RevealedPlayer;
    const card = el('div', 'gazette__role-card');
    const nameClass = player.isAlive ? 'gazette__role-name' : 'gazette__role-name gazette__role-name--dead';
    card.appendChild(el('div', nameClass, player.name));
    card.appendChild(el('div', roleBadgeClass(revealed.role), formatRole(revealed.role)));
    rolesGrid.appendChild(card);
  }
  root.appendChild(rolesGrid);

  // Policy Timeline
  if (data.policies.length > 0) {
    root.appendChild(sectionHeader('POLICY RECORD'));
    const timeline = el('div', 'gazette__timeline');
    for (const policy of data.policies) {
      const entry = el('div', 'gazette__timeline-entry');
      const roundLabel = `Round ${policy.round}${policy.autoEnacted ? ' (Auto)' : ''}:`;
      entry.appendChild(el('span', 'gazette__timeline-round', roundLabel));
      entry.appendChild(el('span', 'gazette__timeline-name', policy.card.name));
      const typeClass = policy.card.type === 'good' ? 'gazette__timeline-type--good' : 'gazette__timeline-type--bad';
      const typeLabel = policy.card.type === 'good' ? 'Virtuous' : 'Corrupt';
      entry.appendChild(el('span', typeClass, typeLabel));
      timeline.appendChild(entry);
    }
    root.appendChild(timeline);
  }

  // Voting Record
  if (data.governments.length > 0) {
    root.appendChild(sectionHeader('COUNCIL VOTE RECORD'));
    const playerName = (id: string) => data.players.find(p => p.id === id)?.name ?? 'Unknown';
    for (const gov of data.governments) {
      const approves = Object.entries(gov.votes).filter(([, v]) => v === 'approve').map(([id]) => playerName(id));
      const blocks = Object.entries(gov.votes).filter(([, v]) => v === 'block').map(([id]) => playerName(id));

      const record = el('div', 'gazette__vote-record');
      const header = el('div', 'gazette__vote-header',
        `Round ${gov.round}: Mayor ${playerName(gov.mayorId)} → Commissioner ${playerName(gov.nomineeId)}`);
      record.appendChild(header);

      const resultClass = gov.passed ? 'gazette__vote-result--passed' : 'gazette__vote-result--failed';
      record.appendChild(el('div', resultClass, `${gov.passed ? 'APPROVED' : 'REJECTED'} (${approves.length}-${blocks.length})`));

      const breakdown = el('div', 'gazette__vote-breakdown');
      const yesLine = el('div');
      yesLine.textContent = `YES: ${approves.join(', ') || '—'}`;
      breakdown.appendChild(yesLine);
      const noLine = el('div');
      noLine.textContent = `NO: ${blocks.join(', ') || '—'}`;
      breakdown.appendChild(noLine);
      record.appendChild(breakdown);
      root.appendChild(record);
    }
  }

  // Key Moments
  root.appendChild(sectionHeader('KEY MOMENTS'));
  if (data.moments.length > 0) {
    for (const moment of data.moments) {
      root.appendChild(el('div', 'gazette__moment', formatMoment(moment)));
    }
  } else {
    root.appendChild(el('div', 'gazette__empty-note',
      `The city's story was told in just ${data.round} rounds. Every moment mattered.`));
  }

  // Superlatives
  root.appendChild(sectionHeader('SUPERLATIVES'));
  for (const sup of data.superlatives) {
    const div = el('div', 'gazette__superlative');
    const nameDiv = el('div', 'gazette__superlative-name');
    nameDiv.textContent = `${sup.playerName} `;
    const nick = el('span', 'gazette__superlative-nickname', `"${sup.nickname}"`);
    nameDiv.appendChild(nick);
    div.appendChild(nameDiv);
    div.appendChild(el('div', 'gazette__superlative-description', sup.description));
    root.appendChild(div);
  }

  // Stats
  const stats = el('div', undefined,
    `${data.round} rounds played — ${data.goodPolicies} virtuous, ${data.badPolicies} corrupt policies enacted`);
  stats.style.textAlign = 'center';
  stats.style.fontStyle = 'italic';
  stats.style.fontSize = '0.85rem';
  stats.style.color = '#555';
  stats.style.marginTop = '1rem';
  root.appendChild(stats);

  // Footer
  const footer = el('div', 'gazette__footer');

  const playAgainBtn = el('button', 'gazette__btn gazette__btn--primary', 'Play Again') as HTMLButtonElement;
  playAgainBtn.addEventListener('click', () => {
    send({ type: 'reset-to-lobby', payload: {} });
  });
  footer.appendChild(playAgainBtn);

  root.appendChild(footer);
  return root;
}

function sectionHeader(text: string): HTMLElement {
  return el('h3', 'gazette__section-header', text);
}

// ── Public API ────────────────────────────────────────────────────

/** Mount the gazette into the given container. Replaces container content. */
let gazetteContainer: HTMLElement | null = null;

export function mountGazette(container: HTMLElement, state: HostState): void {
  const data = computeGazetteData(state);
  gazetteEl = renderGazette(data);
  while (container.firstChild) container.removeChild(container.firstChild);

  // Find the .game-over-overlay ancestor and make it a scrollable container.
  // DOM: .game-over-overlay (fixed, grid, place-items:center)
  //   → .host-overlay__content (flex column, centering)
  //     → .host-screen (the container we receive)
  //       → .gazette
  const overlayContent = container.parentElement;
  const overlay = overlayContent?.parentElement;

  if (overlay) {
    overlay.style.overflowY = 'auto';
    overlay.style.overflowX = 'hidden';
    overlay.style.placeItems = 'start center';
    overlay.style.scrollbarWidth = 'none';
    (overlay.style as any).msOverflowStyle = 'none';
    overlay.classList.add('gazette-scroll-host');
  }
  container.style.display = 'block';
  gazetteContainer = container;

  container.appendChild(gazetteEl);
  if (overlay) overlay.scrollTop = 0;
}

/** Cleanup. */
export function unmountGazette(): void {
  if (gazetteContainer) {
    const overlayContent = gazetteContainer.parentElement;
    const overlay = overlayContent?.parentElement;
    if (overlay) {
      overlay.style.overflowY = '';
      overlay.style.overflowX = '';
      overlay.style.placeItems = '';
      overlay.style.scrollbarWidth = '';
      (overlay.style as any).msOverflowStyle = '';
      overlay.classList.remove('gazette-scroll-host');
    }
    gazetteContainer.style.display = '';
    gazetteContainer = null;
  }
  gazetteEl?.remove();
  gazetteEl = null;
}
