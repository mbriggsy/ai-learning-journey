/**
 * DomTrackSelect — DOM-based track selection screen.
 *
 * Fix #15: No DomOverlay wrapper.
 * Fix #16: No DomScreen interface.
 * Fix #21: Per-track accent colors (cyan/orange/red).
 * Fix #22: Neon glow system on hover.
 * Fix #23: Staggered entrance animation.
 * Fix #25: AbortController for cleanup.
 * Fix #26: Focus management on show().
 * Fix #36: Lap count wired via onStartGame callback.
 */

import { TRACKS } from '../../tracks/registry';
import { getLeaderboard } from '../Leaderboard';
import { formatBestTime } from '../../utils/formatTime';
import { TRACK_ACCENTS } from './dom-styles';
import type { GameMode } from '../../types/game-mode';

export class DomTrackSelect {
  readonly element: HTMLElement;
  private ac = new AbortController();
  private selectedMode: GameMode = 'solo';
  private modeButtons: HTMLButtonElement[] = [];
  private cardTimeEls: { human: HTMLElement; ai: HTMLElement }[] = [];

  constructor(
    private onStartGame: (trackIndex: number, mode: GameMode) => void,
    private onBack: () => void,
  ) {
    this.element = this.build();
  }

  private build(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      width: 100%; height: 100%; padding: 40px 20px; position: relative;
      overflow-y: auto;
    `;

    // Header row: back button + title
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 100%; max-width: 900px; margin-bottom: 24px; position: relative;
    `;

    const backBtn = document.createElement('button');
    backBtn.className = 'menu-btn-back fade-slide-up';
    backBtn.textContent = 'BACK';
    backBtn.style.cssText += 'position: absolute; left: 0;';
    backBtn.addEventListener('click', () => this.onBack(), { signal: this.ac.signal });
    header.appendChild(backBtn);

    const title = document.createElement('h2');
    title.className = 'menu-section-title fade-slide-up';
    title.style.animationDelay = '0.04s';
    title.textContent = 'Select Track';
    header.appendChild(title);

    root.appendChild(header);

    // Mode selector
    const modeRow = document.createElement('div');
    modeRow.className = 'fade-slide-up';
    modeRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 32px; animation-delay: 0.08s;';

    const modes: { id: GameMode; label: string }[] = [
      { id: 'solo', label: 'Solo' },
      { id: 'vs-ai', label: 'VS AI' },
      { id: 'spectator', label: 'Spectator' },
    ];

    for (const mode of modes) {
      const btn = document.createElement('button');
      btn.className = 'mode-btn';
      btn.textContent = mode.label;
      if (mode.id === this.selectedMode) btn.classList.add('active');
      btn.addEventListener('click', () => {
        this.selectedMode = mode.id;
        this.updateModeButtons();
      }, { signal: this.ac.signal });
      modeRow.appendChild(btn);
      this.modeButtons.push(btn);
    }
    root.appendChild(modeRow);

    // Track cards
    const cardsRow = document.createElement('div');
    cardsRow.style.cssText = 'display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;';

    for (let i = 0; i < TRACKS.length; i++) {
      const track = TRACKS[i];
      const accent = TRACK_ACCENTS[track.id.replace('track-0', '')] ??
                     TRACK_ACCENTS[track.name.toLowerCase()] ??
                     '#00d4ff';
      const card = this.buildCard(track.name, track.description, i, accent);
      card.className = 'track-card fade-slide-up';
      card.style.setProperty('--accent', accent);
      card.style.animationDelay = `${0.12 + i * 0.08}s`;
      cardsRow.appendChild(card);
    }
    root.appendChild(cardsRow);

    return root;
  }

  private buildCard(
    name: string,
    description: string,
    index: number,
    accent: string,
  ): HTMLElement {
    const card = document.createElement('div');

    // Track name
    const nameEl = document.createElement('div');
    nameEl.className = 'track-card-name';
    nameEl.textContent = name;
    card.appendChild(nameEl);

    // Description
    const descEl = document.createElement('div');
    descEl.style.cssText = `
      font-family: 'Rajdhani', sans-serif; font-size: 13px;
      color: #666; text-transform: uppercase; letter-spacing: 1px;
    `;
    descEl.textContent = description;
    card.appendChild(descEl);

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `width: 100%; height: 1px; background: #2a2a4a; margin: 4px 0;`;
    card.appendChild(divider);

    // Best times
    const timesContainer = document.createElement('div');
    timesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px; width: 100%;';

    const humanRow = document.createElement('div');
    humanRow.className = 'menu-data';
    humanRow.style.cssText = 'display: flex; justify-content: space-between;';
    const humanLabel = document.createElement('span');
    humanLabel.textContent = 'BEST';
    const humanTime = document.createElement('span');
    humanTime.textContent = '--:--.--';
    humanRow.append(humanLabel, humanTime);
    timesContainer.appendChild(humanRow);

    const aiRow = document.createElement('div');
    aiRow.className = 'menu-data';
    aiRow.style.cssText = `display: flex; justify-content: space-between; color: ${accent};`;
    const aiLabel = document.createElement('span');
    aiLabel.textContent = 'AI';
    const aiTime = document.createElement('span');
    aiTime.textContent = '--:--.--';
    aiRow.append(aiLabel, aiTime);
    timesContainer.appendChild(aiRow);

    card.appendChild(timesContainer);

    this.cardTimeEls.push({ human: humanTime, ai: aiTime });

    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'menu-btn menu-btn-accent';
    startBtn.style.cssText = 'margin-top: 8px; padding: 10px 32px; min-width: auto;';
    startBtn.textContent = 'START';
    startBtn.addEventListener('click', () => {
      this.onStartGame(index, this.selectedMode);
    }, { signal: this.ac.signal });
    card.appendChild(startBtn);

    return card;
  }

  private updateModeButtons(): void {
    const modes: GameMode[] = ['solo', 'vs-ai', 'spectator'];
    for (let i = 0; i < this.modeButtons.length; i++) {
      if (modes[i] === this.selectedMode) {
        this.modeButtons[i].classList.add('active');
      } else {
        this.modeButtons[i].classList.remove('active');
      }
    }
  }

  private refreshTimes(): void {
    for (let i = 0; i < TRACKS.length; i++) {
      const bests = getLeaderboard(TRACKS[i].id);
      const els = this.cardTimeEls[i];
      if (!els) continue;
      els.human.textContent = bests.human !== null ? formatBestTime(bests.human) : '--:--.--';
      els.ai.textContent = bests.ai !== null ? formatBestTime(bests.ai) : '--:--.--';
    }
  }

  show(): void {
    this.element.style.display = 'flex';
    this.refreshTimes();
    // Focus first start button (Fix #26)
    const firstBtn = this.element.querySelector('.menu-btn-accent') as HTMLElement | null;
    if (firstBtn) firstBtn.focus();
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.ac.abort();
    this.element.remove();
  }
}
