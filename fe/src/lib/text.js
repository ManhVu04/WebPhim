export function htmlToText(html) {
  if (!html) return ''

  // Browser-safe: parse HTML để loại bỏ tag (hết dính </p>, <br>, ...)
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(String(html), 'text/html')
    const text = doc?.body?.textContent || ''
    return text.replace(/\s+\n/g, '\n').trim()
  }

  // Fallback: strip tag đơn giản
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

