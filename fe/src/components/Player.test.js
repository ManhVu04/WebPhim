import { describe, expect, it } from 'vitest'
import { isAllowedPlayerUrl } from './Player.jsx'

describe('player URL allowlist', () => {
  it('accepts HTTPS player hosts and numbered opstream hosts', () => {
    expect(isAllowedPlayerUrl('https://ophim.live/embed/movie')).toBe(true)
    expect(isAllowedPlayerUrl('https://cdn.ophim.live/movie/master.m3u8')).toBe(true)
    expect(isAllowedPlayerUrl('https://opstream12.com/movie/master.m3u8')).toBe(true)
  })

  it('rejects insecure and suffix-confusion URLs', () => {
    expect(isAllowedPlayerUrl('http://ophim.live/embed/movie')).toBe(false)
    expect(isAllowedPlayerUrl('https://ophim.live.evil.example/embed/movie')).toBe(false)
    expect(isAllowedPlayerUrl('not-a-url')).toBe(false)
  })
})
