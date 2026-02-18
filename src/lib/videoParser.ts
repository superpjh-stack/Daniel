export interface ParsedVideo {
  embedUrl: string;
  thumbnailUrl: string;
  platform: 'youtube' | 'vimeo' | 'unknown';
}

export function parseVideoUrl(url: string): ParsedVideo | null {
  const trimmed = url.trim();

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      platform: 'youtube',
    };
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    return {
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: '',
      platform: 'vimeo',
    };
  }

  return null;
}
