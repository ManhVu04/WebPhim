import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_ALLOWED_PLAYER_HOSTS = [
  'ophim.live',
  'ophim.cc',
  'ophim17.cc',
  'phimapi.com',
  'phim1280.tv',
  'kkphim.vip',
  'kkphim.cc',
  'opstream*.com',
]

const configuredAllowedHosts = String(import.meta.env.VITE_ALLOWED_PLAYER_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean)

const allowedPlayerHosts = [...DEFAULT_ALLOWED_PLAYER_HOSTS, ...configuredAllowedHosts]

function matchesAllowedHost(hostname, allowedHost) {
  const normalized = allowedHost.replace(/^\*\./, '')
  if (allowedHost === 'opstream*.com') {
    return /^(.+\.)?opstream\d+\.com$/.test(hostname)
  }
  return hostname === normalized || hostname.endsWith(`.${normalized}`)
}

export function isAllowedPlayerUrl(url) {
  if (!url) return false

  try {
    const parsed = new URL(String(url).trim())
    if (parsed.protocol !== 'https:') return false

    const hostname = parsed.hostname.toLowerCase()
    return allowedPlayerHosts.some((allowedHost) => matchesAllowedHost(hostname, allowedHost))
  } catch {
    return false
  }
}

export function Player({ title, linkEmbed, linkM3u8, onTimeUpdate, initialTime, onResume }) {
  const safeEmbedUrl = isAllowedPlayerUrl(linkEmbed) ? String(linkEmbed).trim() : ''
  const safeM3u8Url = isAllowedPlayerUrl(linkM3u8) ? String(linkM3u8).trim() : ''
  const canUseEmbed = Boolean(safeEmbedUrl)
  const canUseM3u8 = Boolean(safeM3u8Url)
  const shouldResumeWithM3u8 = canUseM3u8 && Number(initialTime) > 0
  const defaultMode = shouldResumeWithM3u8 ? 'm3u8' : canUseEmbed ? 'embed' : canUseM3u8 ? 'm3u8' : null
  const [mode, setMode] = useState(defaultMode)

  useEffect(() => {
    setMode((currentMode) => {
      if (shouldResumeWithM3u8) return 'm3u8'
      if (currentMode === 'embed' && canUseEmbed) return currentMode
      if (currentMode === 'm3u8' && canUseM3u8) return currentMode
      return defaultMode
    })
  }, [canUseEmbed, canUseM3u8, defaultMode, shouldResumeWithM3u8])

  if (!mode) {
    return <div className="panel muted">Chưa có link xem cho tập này.</div>
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title || 'Trình phát'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canUseEmbed ? (
            <button className="btn" type="button" onClick={() => setMode('embed')} disabled={mode === 'embed'}>
              Embed
            </button>
          ) : null}
          {canUseM3u8 ? (
            <button className="btn" type="button" onClick={() => setMode('m3u8')} disabled={mode === 'm3u8'}>
              M3U8
            </button>
          ) : null}
        </div>
      </div>

      {mode === 'embed' ? (
        <div className="player">
          <iframe
            title={title || 'player'}
            src={safeEmbedUrl}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
          />
        </div>
      ) : (
        <HlsVideo
          src={safeM3u8Url}
          onTimeUpdate={onTimeUpdate}
          initialTime={initialTime}
          onResume={onResume}
        />
      )}
    </div>
  )
}

function HlsVideo({ src, onTimeUpdate, initialTime, onResume }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [loadStatus, setLoadStatus] = useState('idle') // idle | loading | loaded | error
  const seekedRef = useRef(false)
  const latestProgressRef = useRef(null)

  const isNativeSupported = useMemo(() => {
    if (typeof document === 'undefined') return false
    const v = document.createElement('video')
    return v.canPlayType('application/vnd.apple.mpegurl') !== ''
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    setError(null)
    setLoadStatus('loading')

    if (isNativeSupported) {
      const handleLoaded = () => setLoadStatus('loaded')
      const handleError = () => {
        setError('Không phát được link m3u8. Hãy thử Embed hoặc server khác.')
        setLoadStatus('error')
      }
      video.addEventListener('loadedmetadata', handleLoaded)
      video.addEventListener('error', handleError)
      video.src = src
      video.load()
      return () => {
        video.removeEventListener('loadedmetadata', handleLoaded)
        video.removeEventListener('error', handleError)
        video.removeAttribute('src')
        video.load()
      }
    }

    let destroyed = false
    let hls = null

    ;(async () => {
      try {
        const mod = await import('hls.js')
        const Hls = mod.default

        if (destroyed) return
        if (!Hls?.isSupported?.()) {
          setError('Trình duyệt không hỗ trợ phát HLS (m3u8). Hãy dùng Embed.')
          setLoadStatus('error')
          return
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })

        hls.attachMedia(video)
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src)
        })
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!destroyed) setLoadStatus('loaded')
        })
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!destroyed && data?.fatal) {
            setError('Không phát được link m3u8. Hãy thử Embed hoặc server khác.')
            hls.destroy()
            hls = null
            setLoadStatus('error')
          }
        })
      } catch (e) {
        if (destroyed) return
        // Handle chunk load error (network, cache, etc.)
        const msg = String(e?.message || e || '')
        if (msg.includes('Failed to fetch') || msg.includes('Loading chunk')) {
          setError('Không tải được bộ phát. Hãy thử tải lại trang hoặc dùng Embed.')
        } else if (msg.includes('NetworkError') || msg.includes('net::')) {
          setError('Lỗi mạng. Hãy kiểm tra kết nối internet.')
        } else {
          setError('Không tải được bộ phát m3u8. Hãy dùng Embed.')
        }
        setLoadStatus('error')
      }
    })()

    return () => {
      destroyed = true
      if (hls) hls.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, isNativeSupported])

  useEffect(() => {
    seekedRef.current = false
    latestProgressRef.current = null
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !onTimeUpdate) return
    const reportProgress = (flush = false) => {
      if (
        Number.isFinite(video.currentTime)
        && video.currentTime > 0
        && Number.isFinite(video.duration)
        && video.duration > 0
      ) {
        latestProgressRef.current = {
          currentTime: video.currentTime,
          duration: video.duration,
        }
        onTimeUpdate(video.currentTime, video.duration, flush)
      } else if (flush && latestProgressRef.current) {
        onTimeUpdate(
          latestProgressRef.current.currentTime,
          latestProgressRef.current.duration,
          true,
        )
      }
    }
    const handle = () => {
      reportProgress()
    }
    const handlePause = () => {
      reportProgress(true)
    }
    video.addEventListener('timeupdate', handle)
    video.addEventListener('pause', handlePause)
    return () => {
      video.removeEventListener('timeupdate', handle)
      video.removeEventListener('pause', handlePause)
      reportProgress(true)
    }
  }, [onTimeUpdate])

  useEffect(() => {
    if (!initialTime || initialTime <= 0 || loadStatus !== 'loaded' || seekedRef.current) return
    const video = videoRef.current
    if (!video) return

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
    const targetTime = duration ? Math.min(initialTime, Math.max(0, duration - 1)) : initialTime
    try {
      video.currentTime = targetTime
      seekedRef.current = true
      onResume?.(video.currentTime)
    } catch {
      seekedRef.current = false
    }
  }, [loadStatus, initialTime, onResume])

  return (
    <>
      {error ? <div className="muted" style={{ marginBottom: 10 }}>{error}</div> : null}
      <div className="player" style={{ position: 'relative' }}>
        <video ref={videoRef} controls playsInline preload="metadata" />
        {loadStatus === 'loading' ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: 8,
            pointerEvents: 'none',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Đang tải bộ phát...
          </div>
        ) : null}
      </div>
    </>
  )
}
