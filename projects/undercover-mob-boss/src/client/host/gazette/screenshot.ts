// ── Gazette Screenshot / Share ─────────────────────────────────────
// Captures the gazette DOM as a PNG image for sharing.
// Uses @zumer/snapdom (lazy-loaded on demand).

/** Capture the gazette DOM element as a PNG blob. */
export async function captureGazette(element: HTMLElement): Promise<Blob> {
  // Wait for fonts to load before capturing
  await document.fonts.ready;

  // Lazy-load snapdom — only imported when Share is clicked
  const { snapdom } = await import('@zumer/snapdom');
  const snap = await snapdom(element);
  return snap.toBlob() as Promise<Blob>;
}

/** Share or download the gazette image. */
export async function shareGazette(blob: Blob): Promise<void> {
  const file = new File([blob], 'millbrook-gazette.png', { type: 'image/png' });

  // Try native share (iOS/Android)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'millbrook-gazette.png';
  a.click();
  URL.revokeObjectURL(url);
}
