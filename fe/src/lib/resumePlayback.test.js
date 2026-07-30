import { describe, expect, it } from 'vitest'
import {
  playbackKey,
  resumableSeconds,
  resumeTimeForEpisode,
} from './resumePlayback.js'

describe('resume playback state', () => {
  it('never exposes one episode progress to another episode', () => {
    const episodeOneKey = playbackKey('movie', 'episode-1')
    const episodeTwoKey = playbackKey('movie', 'episode-2')
    const savedProgress = { key: episodeOneKey, seconds: 125 }

    expect(resumeTimeForEpisode(savedProgress, episodeOneKey)).toBe(125)
    expect(resumeTimeForEpisode(savedProgress, episodeTwoKey)).toBe(0)
  })

  it('skips tiny and nearly completed positions', () => {
    expect(resumableSeconds({ progressSeconds: 10, durationSeconds: 600 })).toBe(0)
    expect(resumableSeconds({ progressSeconds: 580, durationSeconds: 600 })).toBe(0)
    expect(resumableSeconds({ progressSeconds: 125, durationSeconds: 600 })).toBe(125)
  })
})
