/**
 * Election tracker component — 3 dots showing failed election count.
 * Filled dots = failed elections (0-3).
 */

const TOTAL_DOTS = 3;

export function createElectionTracker(failedCount: number): HTMLElement {
  const container = document.createElement('div');
  container.className = 'election-tracker';

  const label = document.createElement('span');
  label.className = 'election-tracker__label';
  label.textContent = 'Election Tracker';
  container.appendChild(label);

  const dots = document.createElement('div');
  dots.className = 'election-tracker__dots';

  for (let i = 0; i < TOTAL_DOTS; i++) {
    const dot = document.createElement('div');
    dot.className = 'election-tracker__dot';
    if (i < failedCount) {
      dot.classList.add('election-tracker__dot--filled');
    }
    dot.dataset.index = String(i);
    dots.appendChild(dot);
  }

  container.appendChild(dots);
  return container;
}

export function updateElectionTracker(
  trackerEl: HTMLElement,
  failedCount: number,
): void {
  const dots = trackerEl.querySelectorAll('.election-tracker__dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('election-tracker__dot--filled', i < failedCount);
  });
}
