export type VideoSource =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'html5'; src: string };

export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const fromQuery = u.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const embedMatch = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

export function resolveVideoSource(url: string): VideoSource | null {
  const ytId = youtubeVideoId(url);
  if (ytId) return { kind: 'youtube', videoId: ytId };
  if (isDirectVideoUrl(url)) return { kind: 'html5', src: url };
  return null;
}
