/**
 * Pick a legible text color (near-black or white) for text sitting on `hex`.
 * Uses perceived luminance so light stage/status colors (amber, mint, etc.)
 * get dark text instead of unreadable white.
 */
export function textOn(hex?: string | null): string {
  if (!hex) return '#ffffff';
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '#ffffff';
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // perceived luminance 0..1
  return L > 0.62 ? '#1a1712' : '#ffffff';
}
