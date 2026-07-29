import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { Player } from '../components/Player.jsx'
import { useAuth } from '../lib/auth.jsx'
import { authFetch } from '../lib/authApi.js'
import { buildThumbUrl, buildPosterUrl } from '../lib/image.js'
import { MovieCard } from '../components/MovieCard.jsx'
import { htmlToText } from '../lib/text.js'

function clampIndex(n, max) {
  if (!Number.isFinite(n) || n < 0) return 0
  if (max <= 0) return 0
  return Math.min(n, max - 1)
}

const COMMENT_PAGE_SIZE = 20

function CommentsSection({ movieSlug, user }) {
  const [comments, setComments] = useState(null)
  const [page, setPage] = useState(0)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const isAdmin = Boolean(user?.roles?.includes('ADMIN'))

  useEffect(() => {
    let alive = true
    setLoading(true)
    const query = new URLSearchParams({
      movieSlug,
      page: String(page),
      size: String(COMMENT_PAGE_SIZE),
    })
    authFetch(`/api/comments?${query}`)
      .then((data) => {
        if (!alive) return
        setComments(data)
        setError(null)
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [movieSlug, page, reloadKey])

  async function submitComment(event) {
    event.preventDefault()
    const text = content.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await authFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ movieSlug, content: text }),
      })
      setContent('')
      setPage(0)
      setReloadKey((value) => value + 1)
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }

  async function moderate(path) {
    try {
      await authFetch(path, { method: path.endsWith('/hide') ? 'POST' : 'DELETE' })
      setReloadKey((value) => value + 1)
    } catch (e) {
      setError(e)
    }
  }

  const items = comments?.items || []
  const totalPages = comments?.totalPages || 0

  return (
    <section className="comments-panel">
      <div className="comments-head">
        <h2>Bình luận</h2>
        <span>{comments?.totalItems || 0} bình luận</span>
      </div>

      {user ? (
        <form className="comment-form" onSubmit={submitComment}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Viết bình luận..."
            maxLength={1000}
            rows={3}
          />
          <div className="comment-form-actions">
            <span>{content.trim().length}/1000</span>
            <button className="btnPrimary" type="submit" disabled={!content.trim() || saving}>
              {saving ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-login">
          <Link to="/dang-nhap">Đăng nhập</Link> để bình luận.
        </div>
      )}

      {error ? <div className="muted">Không tải được bình luận.</div> : null}
      {loading ? <div className="muted">Đang tải bình luận...</div> : null}

      {!loading && !items.length ? (
        <div className="muted">Chưa có bình luận nào.</div>
      ) : null}

      {items.length ? (
        <div className="comment-list">
          {items.map((comment) => (
            <article className="comment-item" key={comment.id}>
              <div className="comment-meta">
                <strong>{comment.displayName || comment.username || 'Người dùng'}</strong>
                <span>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p>{comment.content}</p>
              {(comment.ownedByCurrentUser || isAdmin) ? (
                <div className="comment-actions">
                  {comment.ownedByCurrentUser ? (
                    <button type="button" onClick={() => moderate(`/api/comments/${comment.id}`)}>
                      Xóa
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <button type="button" onClick={() => moderate(`/api/comments/${comment.id}/hide`)}>
                      Ẩn
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="comment-pages">
          <button className="btn" type="button" disabled={page <= 0} onClick={() => setPage((value) => value - 1)}>
            Mới hơn
          </button>
          <span>{page + 1}/{totalPages}</span>
          <button
            className="btn"
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Cũ hơn
          </button>
        </div>
      ) : null}
    </section>
  )
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
  const [recommendations, setRecommendations] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.allSettled([ophimApi.movie(slug), ophimApi.list('phim-moi', 1)])
      .then((results) => {
        if (!alive) return
        const [movieResult, recommendationResult] = results
        if (movieResult.status === 'fulfilled') {
          setMovie(movieResult.value)
          setErr(null)
        } else {
          setErr(movieResult.reason)
        }
        setRecommendations(recommendationResult.status === 'fulfilled' ? recommendationResult.value : null)
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
  const serverData = useMemo(
    () => (Array.isArray(currentServer?.server_data) ? currentServer.server_data : []),
    [currentServer],
  )
  const safeEpIdx = useMemo(() => clampIndex(qEp, serverData.length), [qEp, serverData.length])
  const currentEp = serverData[safeEpIdx] || null

  // Record only the last episode selected during the debounce window.
  useEffect(() => {
    if (!user || !item || !currentEp) return undefined

    const timeoutId = window.setTimeout(() => {
      authFetch('/api/history', {
        method: 'POST',
        body: JSON.stringify({
          movieSlug: slug,
          episodeSlug: currentEp.slug || currentEp.name || '',
          serverIndex: safeServerIdx,
          episodeIndex: safeEpIdx,
          movieName: item.name,
          movieOriginName: item.origin_name,
          thumbUrl: buildThumbUrl(cdnBase, item.thumb_url),
          posterUrl: buildPosterUrl(cdnBase, item.poster_url, item.thumb_url),
          year: item.year,
          episodeName: currentEp.name,
        }),
      }).catch((historyError) => console.error('Error saving history:', historyError))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [user, item, currentEp, slug, safeServerIdx, safeEpIdx, cdnBase])

  // Sync state from URL when data is ready
  useEffect(() => {
    setServerIdx(safeServerIdx)
    setEpIdx(safeEpIdx)
    setShowAllEps(false)
  }, [safeServerIdx, safeEpIdx, slug])

  // Preload the poster once movie data is ready.
  useEffect(() => {
    if (!item) return
    const posterUrl = buildPosterUrl(cdnBase, item.poster_url, item.thumb_url)
    if (posterUrl) {
      const img = new Image()
      img.src = posterUrl
    }
  }, [item, cdnBase])

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
  }, [serverIdx, epIdx, qServer, qEp, setParams])

  const visibleEps = useMemo(() => {
    if (showAllEps) return serverData
    return serverData.slice(0, 60)
  }, [serverData, showAllEps])

  if (loading) return <Loading label="Đang tải trang xem phim..." />
  if (err) return <ErrorState error={err} />
  if (!item) return <div className="panel muted">Không tìm thấy phim.</div>

  const contentText = htmlToText(item?.content || '')
  const castNames = Array.isArray(item?.actor) ? item.actor.filter(Boolean).slice(0, 4) : []
  const recommendationData = recommendations?.data || {}
  const recommendationItems = (recommendationData.items || []).filter((movie) => movie.slug !== slug).slice(0, 8)
  const recommendationCdn = recommendationData.APP_DOMAIN_CDN_IMAGE || recommendationData.APP_DOMAIN_CDN || cdnBase

  return (
    <div className="watch-page">
      <section className="watch-player-shell">
        <Player
          title={`${title} · ${currentServer?.server_name || 'Server'} · ${currentEp?.name || ''}`}
          linkEmbed={currentEp?.link_embed}
          linkM3u8={currentEp?.link_m3u8}
        />
      </section>

      <section className="watch-info">
        <Link className="server-hint" to={`/phim/${encodeURIComponent(slug)}`}>⌾ Chọn Server</Link>
        <h1>{title} <span>› {currentEp?.name || 'Tập 1'}</span></h1>
        <div className="detail-tags compact">
          {item?.year ? <span>Năm {item.year}</span> : null}
          {item?.episode_current ? <span>{item.episode_current}</span> : null}
          {item?.lang ? <span>{item.lang}</span> : null}
          {item?.quality ? <span>{item.quality}</span> : null}
        </div>
        {contentText ? <p className="watch-description"><b>Nội dung:</b> {contentText}</p> : null}

        {castNames.length ? (
          <div className="cast-strip">
            {castNames.map((name) => (
              <div className="cast-token" key={name}>
                <span aria-hidden="true" />
                <strong>{name}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {servers.length ? (
        <section className="episode-panel">
          <div className="block-title">Chọn server</div>
          <div className="kvs server-list">
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

          <div className="block-title episode-title">Danh sách tập</div>
          {visibleEps.length ? (
            <div className="episodes">
              {visibleEps.map((ep, i) => (
                <button
                  key={ep.slug || ep.name || i}
                  type="button"
                  className={`epBtn${i === epIdx ? ' active' : ''}`}
                  onClick={() => setEpIdx(i)}
                  title={ep.filename || ep.name}
                >
                  {ep.name || `Tập ${i + 1}`}
                </button>
              ))}

              {!showAllEps && serverData.length > visibleEps.length ? (
                <button className="epBtn" type="button" onClick={() => setShowAllEps(true)}>
                  +{serverData.length - visibleEps.length} tập
                </button>
              ) : null}
            </div>
          ) : (
            <div className="muted">Server này chưa có dữ liệu tập.</div>
          )}
        </section>
      ) : null}

      <CommentsSection movieSlug={slug} user={user} />

      {recommendationItems.length ? (
        <section className="movie-section">
          <div className="section-title"><h2>Đề xuất</h2></div>
          <div className="rail-grid">
            {recommendationItems.map((movie) => (
              <MovieCard key={movie._id || movie.slug} cdnBase={recommendationCdn} item={movie} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
