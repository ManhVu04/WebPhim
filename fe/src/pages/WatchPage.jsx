import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { Player } from '../components/Player.jsx'
import { useAuth } from '../lib/auth.jsx'
import { authFetch } from '../lib/authApi.js'
import { buildThumbUrl, buildPosterUrl } from '../lib/image.js'

function clampIndex(n, max) {
  if (!Number.isFinite(n) || n < 0) return 0
  if (max <= 0) return 0
  return Math.min(n, max - 1)
}

// Simple debounce function
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function WatchPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()

  const [movie, setMovie] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const qServer = Number(params.get('server') || 0)
  const qEp = Number(params.get('ep') || 0)

  const [serverIdx, setServerIdx] = useState(0)
  const [epIdx, setEpIdx] = useState(0)
  const [showAllEps, setShowAllEps] = useState(false)
  const { accessToken } = useAuth()
  const prefetchedEpRef = useRef(new Set())

  // Debounced history save - use lazy ref initialization
  const debouncedSaveHistory = useRef(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ophimApi
      .movie(slug)
      .then((json) => {
        if (!alive) return
        setMovie(json)
        setErr(null)
      })
      .catch((e) => alive && setErr(e))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [slug])

  const item = movie?.data?.item || movie?.data?.data?.item || movie?.data || null
  const cdnBase = movie?.data?.APP_DOMAIN_CDN_IMAGE || movie?.data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const title = item?.name || item?.origin_name || slug

  const servers = item && Array.isArray(item.episodes) ? item.episodes : []
  const safeServerIdx = useMemo(() => clampIndex(qServer, servers.length), [qServer, servers.length])
  const currentServer = servers[safeServerIdx] || null
  const serverData = Array.isArray(currentServer?.server_data) ? currentServer.server_data : []
  const safeEpIdx = useMemo(() => clampIndex(qEp, serverData.length), [qEp, serverData.length])
  const currentEp = serverData[safeEpIdx] || null

  // Record history whenever user enters/changes episode (debounced to prevent API spam)
  useEffect(() => {
    // Lazy init the debounced function on first render
    if (!debouncedSaveHistory.current) {
      debouncedSaveHistory.current = debounce((data) => {
        if (!accessToken) return
        authFetch('/api/history', accessToken, {
          method: 'POST',
          body: JSON.stringify(data)
        }).catch(err => console.error('Error saving history:', err));
      }, 1000)
    }

    if (!accessToken || !item || !currentEp) return;

    debouncedSaveHistory.current({
      movieSlug: slug,
      episodeSlug: currentEp.slug || currentEp.name || '',
      serverIndex: safeServerIdx,
      episodeIndex: safeEpIdx,
      movieName: item.name,
      movieOriginName: item.origin_name,
      thumbUrl: buildThumbUrl(cdnBase, item.thumb_url),
      posterUrl: buildPosterUrl(cdnBase, item.poster_url, item.thumb_url),
      year: item.year,
      episodeName: currentEp.name
    });
  }, [accessToken, item, currentEp, slug, safeServerIdx, safeEpIdx, cdnBase]);

  // Sync state from URL when data is ready
  useEffect(() => {
    setServerIdx(safeServerIdx)
    setEpIdx(safeEpIdx)
    setShowAllEps(false)
  }, [safeServerIdx, safeEpIdx, slug])

  // Prefetch poster image và episodes liền kề khi data load xong
  useEffect(() => {
    if (!item) return
    // Preload poster image
    const posterUrl = buildPosterUrl(cdnBase, item.poster_url, item.thumb_url)
    if (posterUrl) {
      const img = new Image()
      img.src = posterUrl
    }
    // Preload episodes gần đó (prev/next)
    const epToPreload = [
      safeEpIdx > 0 ? safeEpIdx - 1 : null,
      safeEpIdx < serverData.length - 1 ? safeEpIdx + 1 : null,
    ].filter(Boolean)
    epToPreload.forEach(idx => {
      if (!prefetchedEpRef.current.has(idx)) {
        prefetchedEpRef.current.add(idx)
        // Prefetch movie data để có episodes list sẵn
        ophimApi.movie(slug).catch(() => {})
      }
    })
  }, [item, safeEpIdx, serverData.length, slug, cdnBase])

  // Keep URL in sync when user changes
  useEffect(() => {
    if (serverIdx === qServer && epIdx === qEp) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('server', String(serverIdx))
        next.set('ep', String(epIdx))
        return next
      },
      { replace: true },
    )
  }, [serverIdx, epIdx, setParams])

  const visibleEps = useMemo(() => {
    if (showAllEps) return serverData
    return serverData.slice(0, 60)
  }, [serverData, showAllEps])

  if (loading) return <Loading label="Đang tải trang xem phim..." />
  if (err) return <ErrorState error={err} />
  if (!item) return <div className="panel muted">Không tìm thấy phim.</div>

  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>
        <h1 style={{ fontSize: 18 }}>{title}</h1>
        <div className="muted">
          <Link className="chip" to={`/phim/${encodeURIComponent(slug)}`}>
            ← Thông tin phim
          </Link>
        </div>
      </div>

      <Player
        title={`${title} · ${currentServer?.server_name || 'Server'} · ${currentEp?.name || ''}`}
        linkEmbed={currentEp?.link_embed}
        linkM3u8={currentEp?.link_m3u8}
      />

      {servers.length ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Chọn server</div>
          <div className="kvs">
            {servers.map((s, i) => (
              <button
                key={s.server_name || i}
                type="button"
                className={`epBtn${i === serverIdx ? ' active' : ''}`}
                onClick={() => {
                  setServerIdx(i)
                  setEpIdx(0)
                  setShowAllEps(false)
                }}
              >
                {s.server_name || `Server ${i + 1}`}
              </button>
            ))}
          </div>

          <div style={{ fontWeight: 800, marginTop: 14, marginBottom: 10 }}>Chọn tập</div>
          {visibleEps.length ? (
            <div className="episodes">
              {visibleEps.map((ep, i) => {
                // Preload episodes liền kề khi hover
                const handleMouseEnter = () => {
                  const adjacent = [i - 1, i + 1].filter(idx => idx >= 0 && idx < serverData.length)
                  adjacent.forEach(idx => {
                    if (!prefetchedEpRef.current.has(idx)) {
                      prefetchedEpRef.current.add(idx)
                      // Prefetch movie data để có episodes data sẵn
                      ophimApi.movie(slug).catch(() => {})
                    }
                  })
                }
                return (
                <button
                  key={ep.slug || ep.name || i}
                  type="button"
                  className={`epBtn${i === epIdx ? ' active' : ''}`}
                  onClick={() => setEpIdx(i)}
                  onMouseEnter={handleMouseEnter}
                  title={ep.filename || ep.name}
                >
                  {ep.name || `Tập ${i + 1}`}
                </button>
              )})}

              {!showAllEps && serverData.length > visibleEps.length ? (
                <button className="epBtn" type="button" onClick={() => setShowAllEps(true)}>
                  +{serverData.length - visibleEps.length} tập
                </button>
              ) : null}
            </div>
          ) : (
            <div className="muted">Server này chưa có dữ liệu tập.</div>
          )}
        </div>
      ) : null}
    </>
  )
}
