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

function isAllowedPlayerUrl(url) {
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

export function Player({ title, linkEmbed, linkM3u8 }) {
  const safeEmbedUrl = isAllowedPlayerUrl(linkEmbed) ? String(linkEmbed).trim() : ''
  const safeM3u8Url = isAllowedPlayerUrl(linkM3u8) ? String(linkM3u8).trim() : ''
  const canUseEmbed = Boolean(safeEmbedUrl)
  const canUseM3u8 = Boolean(safeM3u8Url)
  const defaultMode = canUseEmbed ? 'embed' : canUseM3u8 ? 'm3u8' : null
  const [mode, setMode] = useState(defaultMode)

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

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
        <HlsVideo src={safeM3u8Url} />
      )}
    </div>
  )
}

function HlsVideo({ src }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)

  const isNativeSupported = useMemo(() => {
    if (typeof document === 'undefined') return false
    const v = document.createElement('video')
    return v.canPlayType('application/vnd.apple.mpegurl') !== ''
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    setError(null)

    if (isNativeSupported) {
      video.src = src
      return
    }

    let destroyed = false
    let hls = null

    ;(async () => {
      const mod = await import('hls.js')
      const Hls = mod.default

      if (destroyed) return
      if (!Hls?.isSupported?.()) {
        setError('Trình duyệt không hỗ trợ phát HLS (m3u8). Hãy dùng Embed.')
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
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data?.fatal) {
          setError('Không phát được link m3u8. Hãy thử Embed hoặc server khác.')
          hls.destroy()
          hls = null
        }
      })
    })().catch(() => {
      setError('Không tải được bộ phát m3u8. Hãy dùng Embed.')
    })

    return () => {
      destroyed = true
      if (hls) hls.destroy()
    }
  }, [src, isNativeSupported])

  return (
    <>
      {error ? <div className="muted" style={{ marginBottom: 10 }}>{error}</div> : null}
      <div className="player">
        <video ref={videoRef} controls playsInline />
      </div>
    </>
  )
}
