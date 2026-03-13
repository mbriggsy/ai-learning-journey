/**
 * DOM menu styles — injected at runtime into <head>.
 *
 * Base layout CSS lives in index.html <style> (Fix #10: prevent FOUC).
 * This module adds interactive/component styles that can load after JS boots.
 */

// Per-track accent colors (Fix #21)
export const TRACK_ACCENTS: Record<string, string> = {
  oval: '#00d4ff',
  speedway: '#ff8c00',
  gauntlet: '#ff3333',
};

const DEFAULT_ACCENT = '#00d4ff';

export function injectMenuStyles(): void {
  if (document.getElementById('tdr-menu-styles')) return;

  const style = document.createElement('style');
  style.id = 'tdr-menu-styles';
  style.textContent = `
    /* ── Typography ── */
    .menu-title {
      font-family: 'Orbitron', 'Segoe UI', sans-serif;
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(180deg, #fff 0%, #00d4ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-transform: uppercase;
      letter-spacing: 4px;
      margin-bottom: 8px;
      animation: title-glow 3s ease-in-out infinite alternate;
    }

    @keyframes title-glow {
      from { filter: drop-shadow(0 0 6px rgba(0,212,255,0.3)); }
      to   { filter: drop-shadow(0 0 16px rgba(0,212,255,0.6)); }
    }

    .menu-subtitle {
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      font-weight: 400;
      color: #666;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 32px;
    }

    .menu-section-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #e0e0e0;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    /* ── Buttons ── */
    .menu-btn {
      background: linear-gradient(180deg, #2a2a4a 0%, #1a1a2e 100%);
      border: 1px solid #4a4a6a;
      border-radius: 8px;
      color: #e0e0e0;
      padding: 14px 48px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-transform: uppercase;
      letter-spacing: 2px;
      min-width: 200px;
    }
    .menu-btn:hover {
      border-color: ${DEFAULT_ACCENT};
      color: ${DEFAULT_ACCENT};
      box-shadow: 0 0 12px rgba(0,212,255,0.3), inset 0 0 8px rgba(0,212,255,0.1);
    }
    .menu-btn:active { transform: scale(0.97); }
    .menu-btn:focus-visible {
      outline: 2px solid ${DEFAULT_ACCENT};
      outline-offset: 2px;
    }

    .menu-btn-accent {
      border-color: var(--accent, ${DEFAULT_ACCENT});
      color: var(--accent, ${DEFAULT_ACCENT});
    }
    .menu-btn-accent:hover {
      background: var(--accent, ${DEFAULT_ACCENT});
      color: #0a0a0f;
      box-shadow: 0 0 20px color-mix(in srgb, var(--accent, ${DEFAULT_ACCENT}) 50%, transparent);
    }

    .menu-btn-back {
      background: transparent;
      border: 1px solid #333;
      color: #888;
      padding: 10px 24px;
      font-size: 14px;
      min-width: auto;
    }
    .menu-btn-back:hover {
      border-color: #888;
      color: #e0e0e0;
      box-shadow: none;
    }

    /* ── Entrance animations (Fix #23) ── */
    .fade-slide-up {
      opacity: 0;
      transform: translateY(16px);
      animation: fadeSlideUp 0.4s ease forwards;
    }

    @keyframes fadeSlideUp {
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Slider styling (Fix #24) ── */
    .menu-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #2a2a4a;
      outline: none;
      cursor: pointer;
    }
    .menu-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent, ${DEFAULT_ACCENT});
      box-shadow: 0 0 8px color-mix(in srgb, var(--accent, ${DEFAULT_ACCENT}) 50%, transparent);
      cursor: pointer;
    }
    .menu-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent, ${DEFAULT_ACCENT});
      border: none;
      box-shadow: 0 0 8px color-mix(in srgb, var(--accent, ${DEFAULT_ACCENT}) 50%, transparent);
      cursor: pointer;
    }

    /* ── Data text (times, labels) ── */
    .menu-data {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #888;
    }

    /* ── Mode selector ── */
    .mode-btn {
      background: transparent;
      border: 1px solid #333;
      border-radius: 4px;
      color: #666;
      padding: 8px 20px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .mode-btn:hover { border-color: #666; color: #aaa; }
    .mode-btn.active {
      border-color: ${DEFAULT_ACCENT};
      color: ${DEFAULT_ACCENT};
      box-shadow: 0 0 8px rgba(0,212,255,0.2);
    }

    /* ── Track cards ── */
    .track-card {
      background: linear-gradient(180deg, #1a1a2e 0%, #12121f 100%);
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px 20px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      border-top: 3px solid var(--accent, ${DEFAULT_ACCENT});
    }
    .track-card:hover {
      border-color: var(--accent, ${DEFAULT_ACCENT});
      box-shadow: 0 0 20px color-mix(in srgb, var(--accent, ${DEFAULT_ACCENT}) 30%, transparent);
    }

    .track-card-name {
      font-family: 'Orbitron', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #e0e0e0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    /* ── Settings row ── */
    .settings-row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      max-width: 400px;
    }
    .settings-label {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: #aaa;
      min-width: 130px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .settings-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: var(--accent, ${DEFAULT_ACCENT});
      min-width: 40px;
      text-align: right;
    }

    /* ── Quality buttons ── */
    .quality-btn {
      background: transparent;
      border: 1px solid #333;
      border-radius: 4px;
      color: #666;
      padding: 6px 16px;
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-transform: uppercase;
    }
    .quality-btn:hover { border-color: #666; color: #aaa; }
    .quality-btn.active {
      border-color: ${DEFAULT_ACCENT};
      color: ${DEFAULT_ACCENT};
      background: rgba(0,212,255,0.1);
    }

    /* ── Footer ── */
    .menu-footer {
      font-family: 'Rajdhani', sans-serif;
      font-size: 12px;
      color: #333;
      position: absolute;
      bottom: 20px;
      letter-spacing: 1px;
    }
  `;
  document.head.appendChild(style);
}
