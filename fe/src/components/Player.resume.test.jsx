// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Player } from './Player.jsx'

describe('Player resume playback', () => {
  let root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.querySelector('#root'))
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('switches from embed to M3U8 and reports only after applying the saved time', async () => {
    const onResume = vi.fn()
    const commonProps = {
      title: 'Demo',
      linkEmbed: 'https://ophim.live/embed/demo',
      linkM3u8: 'https://ophim.live/demo/master.m3u8',
      onTimeUpdate: vi.fn(),
      onResume,
    }

    await act(async () => {
      root.render(<Player {...commonProps} initialTime={0} />)
    })
    expect(document.querySelector('iframe')).not.toBeNull()
    expect(onResume).not.toHaveBeenCalled()

    await act(async () => {
      root.render(<Player {...commonProps} initialTime={125} />)
    })

    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    Object.defineProperty(video, 'duration', { configurable: true, value: 600 })

    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
    })

    expect(video.currentTime).toBe(125)
    expect(onResume).toHaveBeenCalledWith(125)
  })

  it('keeps M3U8 selected across source changes and applies the new episode time', async () => {
    const onResume = vi.fn()
    const onTimeUpdate = vi.fn()

    await act(async () => {
      root.render(
        <Player
          title="Episode 1"
          linkEmbed="https://ophim.live/embed/ep-1"
          linkM3u8="https://ophim.live/ep-1.m3u8"
          initialTime={60}
          onResume={onResume}
          onTimeUpdate={onTimeUpdate}
        />,
      )
    })

    let video = document.querySelector('video')
    Object.defineProperty(video, 'duration', { configurable: true, value: 600 })
    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
    })
    expect(video.currentTime).toBe(60)

    await act(async () => {
      root.render(
        <Player
          title="Episode 2"
          linkEmbed="https://ophim.live/embed/ep-2"
          linkM3u8="https://ophim.live/ep-2.m3u8"
          initialTime={0}
          onResume={onResume}
          onTimeUpdate={onTimeUpdate}
        />,
      )
    })

    video = document.querySelector('video')
    video.currentTime = 0
    Object.defineProperty(video, 'duration', { configurable: true, value: 700 })
    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
      root.render(
        <Player
          title="Episode 2"
          linkEmbed="https://ophim.live/embed/ep-2"
          linkM3u8="https://ophim.live/ep-2.m3u8"
          initialTime={180}
          onResume={onResume}
          onTimeUpdate={onTimeUpdate}
        />,
      )
    })

    expect(video.currentTime).toBe(180)
    expect(onResume).toHaveBeenLastCalledWith(180)
  })

  it('flushes the latest position when playback pauses', async () => {
    const onTimeUpdate = vi.fn()

    await act(async () => {
      root.render(
        <Player
          title="Episode"
          linkM3u8="https://ophim.live/episode.m3u8"
          initialTime={0}
          onTimeUpdate={onTimeUpdate}
        />,
      )
    })

    const video = document.querySelector('video')
    Object.defineProperty(video, 'duration', { configurable: true, value: 600 })
    video.currentTime = 42

    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'))
      video.dispatchEvent(new Event('pause'))
    })

    expect(onTimeUpdate).toHaveBeenNthCalledWith(1, 42, 600, false)
    expect(onTimeUpdate).toHaveBeenNthCalledWith(2, 42, 600, true)
  })
})
