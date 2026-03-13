/**
 * DomMainMenu — DOM-based main menu screen.
 *
 * Fix #15: No DomOverlay wrapper (inlined into ScreenManager).
 * Fix #16: No DomScreen interface (duck typing).
 * Fix #23: Staggered entrance animation via CSS fade-slide-up.
 * Fix #25: AbortController for event listener cleanup.
 * Fix #26: Focus management on show().
 */

export class DomMainMenu {
  readonly element: HTMLElement;
  private ac = new AbortController();

  constructor(
    private onPlay: () => void,
    private onSettings: () => void,
  ) {
    this.element = this.build();
  }

  private build(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; width: 100%; height: 100%;
      position: relative;
    `;

    // Title
    const title = document.createElement('h1');
    title.className = 'menu-title fade-slide-up';
    title.textContent = 'Top Down Racer';
    root.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'menu-subtitle fade-slide-up';
    subtitle.style.animationDelay = '0.08s';
    subtitle.textContent = 'v04';
    root.appendChild(subtitle);

    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'menu-btn fade-slide-up';
    playBtn.style.animationDelay = '0.16s';
    playBtn.textContent = 'PLAY';
    playBtn.addEventListener('click', () => this.onPlay(), { signal: this.ac.signal });
    root.appendChild(playBtn);

    // Settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'menu-btn fade-slide-up';
    settingsBtn.style.animationDelay = '0.24s';
    settingsBtn.textContent = 'SETTINGS';
    settingsBtn.addEventListener('click', () => this.onSettings(), { signal: this.ac.signal });
    root.appendChild(settingsBtn);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'menu-footer fade-slide-up';
    footer.style.animationDelay = '0.32s';
    footer.textContent = 'Built with Claude Code';
    root.appendChild(footer);

    return root;
  }

  show(): void {
    this.element.style.display = 'flex';
    // Reset entrance animations
    const animated = this.element.querySelectorAll('.fade-slide-up');
    for (const el of animated) {
      const htmlEl = el as HTMLElement;
      htmlEl.style.animation = 'none';
      // Force reflow then re-enable
      void htmlEl.offsetHeight;
      htmlEl.style.animation = '';
    }
    // Focus first button (Fix #26)
    const firstBtn = this.element.querySelector('button');
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
