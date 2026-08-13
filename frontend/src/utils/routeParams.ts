/** Parse a numeric route param; returns null when missing or not a positive integer. */
export function parseRouteId(param: string | undefined): number | null {
  if (param == null || param === '') return null;
  const n = Number(param);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}
