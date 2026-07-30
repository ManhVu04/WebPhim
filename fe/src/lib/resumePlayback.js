export function playbackKey(movieSlug, episodeSlug) {
  return `${movieSlug || ''}\u0000${episodeSlug || ''}`
}

export function resumeTimeForEpisode(savedProgress, activeKey) {
  if (!savedProgress || savedProgress.key !== activeKey) return 0
  return Number(savedProgress.seconds) > 0 ? Number(savedProgress.seconds) : 0
}

export function resumableSeconds(data) {
  const progress = Number(data?.progressSeconds) || 0
  const duration = Number(data?.durationSeconds) || 0
  if (progress <= 10) return 0
  if (duration > 0 && progress >= duration - 30) return 0
  return progress
}
