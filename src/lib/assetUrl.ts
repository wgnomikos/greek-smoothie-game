// Single source of truth for asset URLs.
// import.meta.env.BASE_URL is '/greek-game/' in production, '/' in dev.
// Hardcoding '/audio/...' anywhere is a 404 in prod — always go through here.

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return base + clean;
}

export function audioUrl(relative: string): string {
  return assetUrl(`audio/${relative}`);
}

export function imageUrl(relative: string): string {
  return assetUrl(`images/${relative}`);
}
