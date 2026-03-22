let userHasInteracted = false;
if (typeof document !== 'undefined') {
  const markInteracted = () => { userHasInteracted = true; };
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
}

function vibrate(pattern: VibratePattern): void {
  if (userHasInteracted) navigator.vibrate?.(pattern);
}

export function hapticTap(): void {
  vibrate(10);
}

export function hapticPeek(): void {
  vibrate(30);
}

export function hapticReveal(): void {
  vibrate([50, 30, 50]);
}

export function hapticInvestigated(): void {
  vibrate([100, 50, 100, 50, 300]);
}

export function hapticEliminated(): void {
  vibrate([200, 100, 500]);
}
