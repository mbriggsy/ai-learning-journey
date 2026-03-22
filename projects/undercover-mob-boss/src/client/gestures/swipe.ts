interface SwipeOptions {
  el: HTMLElement;
  direction: 'down' | 'up';
  threshold?: number;
  onSwipe: () => void;
  onMove?: (delta: number) => void;
}

export function attachSwipe(opts: SwipeOptions): () => void {
  const threshold = opts.threshold ?? 80;
  let startY = 0;
  let tracking = false;

  function onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    tracking = true;
  }

  function onTouchMove(e: TouchEvent): void {
    if (!tracking || e.touches.length !== 1) return;
    const deltaY = e.touches[0].clientY - startY;
    const directionalDelta = opts.direction === 'down' ? deltaY : -deltaY;
    if (opts.onMove && directionalDelta > 0) {
      opts.onMove(directionalDelta);
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (!tracking) return;
    tracking = false;
    if (e.changedTouches.length !== 1) return;
    const deltaY = e.changedTouches[0].clientY - startY;
    const directionalDelta = opts.direction === 'down' ? deltaY : -deltaY;
    if (directionalDelta >= threshold) {
      opts.onSwipe();
    }
  }

  opts.el.addEventListener('touchstart', onTouchStart, { passive: true });
  opts.el.addEventListener('touchmove', onTouchMove, { passive: true });
  opts.el.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    opts.el.removeEventListener('touchstart', onTouchStart);
    opts.el.removeEventListener('touchmove', onTouchMove);
    opts.el.removeEventListener('touchend', onTouchEnd);
  };
}
