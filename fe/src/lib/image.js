export function buildThumbUrl(cdnBase, thumbUrl) {
  if (!thumbUrl) return '';
  let url = String(thumbUrl).trim();

  // If the URL is already proxied by wsrv, keep it as-is.
  if (/^https?:\/\/wsrv\.nl\//i.test(url)) {
    return url;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const base = (cdnBase || '').replace(/\/$/, '');
    const normalizedPath = url.replace(/^\//, '');
    const moviePath = normalizedPath.startsWith('uploads/movies/')
      ? normalizedPath
      : `uploads/movies/${normalizedPath}`;

    url = base ? `${base}/${moviePath}` : `/${moviePath}`;
  }

  // Giảm dung lượng ảnh 10x bằng proxy (ví dụ từ 400KB -> 30KB) + chuyển sang chuẩn webp
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=320&output=webp&q=70`;
}

/**
 * Build poster URL — used for larger images (detail page).
 * Uses poster_url if available, falls back to thumb_url.
 */
export function buildPosterUrl(cdnBase, posterUrl, thumbUrl) {
  const url = posterUrl || thumbUrl;
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (cdnBase || '').replace(/\/$/, '');
  return `${base}/uploads/movies/${url.replace(/^\//, '')}`;
}
