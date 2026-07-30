import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { isAllowedPlayerUrl, Player } from '../components/Player.jsx'
import { useAuth } from '../lib/auth.jsx'
import { authFetch, reportComment } from '../lib/authApi.js'
import { buildThumbUrl, buildPosterUrl } from '../lib/image.js'
import { MovieCard } from '../components/MovieCard.jsx'
import { htmlToText } from '../lib/text.js'
import { useSeoHead } from '../lib/useSeoHead.js'
import { usePrerenderData } from '../lib/prerenderData.jsx'
import {
  playbackKey,
  resumableSeconds,
  resumeTimeForEpisode,
} from '../lib/resumePlayback.js'
import { buildWatchSeo } from '../lib/seo.js'

function formatTime(seconds) {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

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

  // Report modal state
  const [reportingComment, setReportingComment] = useState(null)
  const [reportReason, setReportReason] = useState('SPAM')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportFeedback, setReportFeedback] = useState(null)

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
      if (e.status === 429) {
        const retryAfter = e.retryAfter || 60
        setError({ message: `Bạn bình luận quá nhanh. Vui lòng chờ ${retryAfter} giây.` })
      } else {
        setError(e)
      }
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

  async function handleReportSubmit() {
    if (!reportingComment || reportSubmitting) return
    setReportSubmitting(true)
    setReportFeedback(null)
    try {
      await reportComment(reportingComment.id, {
        reason: reportReason,
        details: reportDetails,
      })
      setReportFeedback({ type: 'success', message: 'Cảm ơn bạn! Báo cáo của bạn đã được gửi tới quản trị viên.' })
      setTimeout(() => {
        setReportingComment(null)
        setReportFeedback(null)
        setReportDetails('')
      }, 1800)
    } catch (e) {
      setReportFeedback({ type: 'error', message: e.message || 'Báo cáo thất bại. Vui lòng thử lại sau.' })
    } finally {
      setReportSubmitting(false)
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

      {error ? <div className="comment-error">{error.message || 'Không tải được bình luận.'}</div> : null}
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
                {user && !comment.ownedByCurrentUser ? (
                  <button
                    type="button"
                    className="btn-report"
                    onClick={() => {
                      setReportingComment(comment)
                      setReportReason('SPAM')
                      setReportDetails('')
                      setReportFeedback(null)
                    }}
                  >
                    🚩 Báo cáo
                  </button>
                ) : null}
              </div>
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

      {reportingComment && (
        <div className="admin-modal-overlay" onClick={() => setReportingComment(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Báo cáo bình luận</h3>
            <p className="text-muted">Bình luận của <strong>{reportingComment.displayName || reportingComment.username}</strong>:</p>
            <blockquote className="report-comment-preview">"{reportingComment.content}"</blockquote>

            {reportFeedback && (
              <div className={`report-feedback ${reportFeedback.type}`}>
                {reportFeedback.message}
              </div>
            )}

            <div className="report-form-group">
              <label className="font-bold">Lý do báo cáo:</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                <option value="SPAM">Spam / Quảng cáo</option>
                <option value="INAPPROPRIATE">Ngôn từ thù ghét / Nhạy cảm</option>
                <option value="HARASSMENT">Xúc phạm / Bắt nạt</option>
                <option value="MISINFORMATION">Nội dung sai sự thật</option>
                <option value="OTHER">Lý do khác</option>
              </select>
            </div>

            <div className="report-form-group">
              <label className="font-bold">Chi tiết thêm (không bắt buộc):</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Mô tả cụ thể vấn đề..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="modal-actions">
              <button className="btn" type="button" onClick={() => setReportingComment(null)}>Đóng</button>
              <button className="btnPrimary" type="button" disabled={reportSubmitting} onClick={handleReportSubmit}>
                {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function WatchPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const prerenderData = usePrerenderData()
  const initialMovie = prerenderData[cacheKeys.movie(slug)] || null
  const initialRecommendations = prerenderData[cacheKeys.list('phim-moi', 1)] || null

  const [movie, setMovie] = useState(initialMovie)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(!initialMovie)

  const requestedServer = Number(params.get('server') || 0)
  const requestedEpisode = Number(params.get('ep') || 0)
  const qServer = Number.isInteger(requestedServer) && requestedServer >= 0 ? requestedServer : 0
  const qEp = Number.isInteger(requestedEpisode) && requestedEpisode >= 0 ? requestedEpisode : 0

  const [serverIdx, setServerIdx] = useState(qServer)
  const [epIdx, setEpIdx] = useState(qEp)
  const [showAllEps, setShowAllEps] = useState(false)
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const { user } = useAuth()
  const [savedProgress, setSavedProgress] = useState({ key: '', seconds: 0 })
  const [resumeNotice, setResumeNotice] = useState(null)
  const progressSaveRef = useRef({ key: '', at: 0, seconds: -1 })
  const latestPlaybackRef = useRef(null)

  useEffect(() => {
    if (initialMovie) {
      setMovie(initialMovie)
      setRecommendations(initialRecommendations)
      setErr(null)
      setLoading(false)
      return undefined
    }

    let alive = true
    setMovie(null)
    setRecommendations(null)
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
  }, [slug, initialMovie, initialRecommendations])

  const item = movie?.data?.item || movie?.data?.data?.item || movie?.data || null
  const cdnBase = movie?.data?.APP_DOMAIN_CDN_IMAGE || movie?.data?.data?.APP_DOMAIN_CDN_IMAGE || ''
  const title = item?.name || item?.origin_name || slug
  const poster = useMemo(() => buildPosterUrl(cdnBase, item?.poster_url, item?.thumb_url), [cdnBase, item])

  const servers = item && Array.isArray(item.episodes) ? item.episodes : []
  const safeServerIdx = useMemo(() => clampIndex(qServer, servers.length), [qServer, servers.length])
  const currentServer = servers[safeServerIdx] || null
  const serverData = useMemo(
    () => (Array.isArray(currentServer?.server_data) ? currentServer.server_data : []),
    [currentServer],
  )
  const safeEpIdx = useMemo(() => clampIndex(qEp, serverData.length), [qEp, serverData.length])
  const currentEp = serverData[safeEpIdx] || null
  const episodeSlug = currentEp?.slug || currentEp?.name || ''
  const episodeKey = playbackKey(slug, episodeSlug)
  const initialTime = resumeTimeForEpisode(savedProgress, episodeKey)
  const canResumeCurrentEpisode = isAllowedPlayerUrl(currentEp?.link_m3u8)
  const episodeName = currentEp?.name || ''
  const watchSeo = useMemo(
    () => buildWatchSeo(item, { episodeName, image: poster }),
    [episodeName, item, poster],
  )

  useSeoHead({
    title: item ? watchSeo.title : 'Xem phim online - WebPhim',
    description: item ? watchSeo.description : undefined,
    robots: 'noindex, follow',
    type: watchSeo.type,
    image: watchSeo.image,
  })

  // Record only the last episode selected during the debounce window.
  useEffect(() => {
    if (!user || !item || !currentEp) return undefined

    const timeoutId = window.setTimeout(() => {
      authFetch('/api/history', {
        method: 'POST',
        body: JSON.stringify({
          movieSlug: slug,
          episodeSlug,
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
  }, [user, item, currentEp, slug, safeServerIdx, safeEpIdx, cdnBase, episodeSlug])

  // Keep progress keyed to the active episode so stale requests can never seek another episode.
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setSavedProgress({ key: episodeKey, seconds: 0 })
    setResumeNotice(null)

    if (!user || !slug || !episodeSlug || !canResumeCurrentEpisode) {
      return () => {
        active = false
        controller.abort()
      }
    }

    authFetch(
      `/api/history/progress?movieSlug=${encodeURIComponent(slug)}&episodeSlug=${encodeURIComponent(episodeSlug)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!active) return
        setSavedProgress({ key: episodeKey, seconds: resumableSeconds(data) })
      })
      .catch((progressError) => {
        if (active && progressError?.name !== 'AbortError') {
          setSavedProgress({ key: episodeKey, seconds: 0 })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [user, slug, episodeSlug, episodeKey, canResumeCurrentEpisode])

  const handleResume = useCallback((seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    setResumeNotice({ key: episodeKey, seconds })
  }, [episodeKey])

  useEffect(() => {
    if (!resumeNotice) return
    const currentNotice = resumeNotice
    const id = setTimeout(() => {
      setResumeNotice((notice) => (notice === currentNotice ? null : notice))
    }, 4000)
    return () => clearTimeout(id)
  }, [resumeNotice])

  const handleTimeUpdate = useCallback((currentTime, duration, flush) => {
    if (
      !Number.isFinite(currentTime)
      || currentTime <= 0
      || !Number.isFinite(duration)
      || duration <= 0
    ) {
      return
    }

    latestPlaybackRef.current = { key: episodeKey, currentTime, duration }
    if (!user || !currentEp) return

    const now = Date.now()
    const seconds = Math.floor(currentTime)
    const lastSave = progressSaveRef.current
    if (!flush && lastSave.key === episodeKey && now - lastSave.at < 15000) return
    if (flush && lastSave.key === episodeKey && lastSave.seconds === seconds && now - lastSave.at < 1000) return
    progressSaveRef.current = { key: episodeKey, at: now, seconds }

    authFetch('/api/history', {
      method: 'POST',
      keepalive: Boolean(flush),
      body: JSON.stringify({
        movieSlug: slug,
        episodeSlug,
        serverIndex: safeServerIdx,
        episodeIndex: safeEpIdx,
        movieName: item?.name,
        movieOriginName: item?.origin_name,
        thumbUrl: buildThumbUrl(cdnBase, item?.thumb_url),
        posterUrl: buildPosterUrl(cdnBase, item?.poster_url, item?.thumb_url),
        year: item?.year,
        episodeName: currentEp.name,
        progressSeconds: seconds,
        durationSeconds: Math.floor(duration),
      }),
    }).catch(() => {})
  }, [user, currentEp, slug, safeServerIdx, safeEpIdx, item, cdnBase, episodeSlug, episodeKey])

  const flushLatestProgress = useCallback(() => {
    const latest = latestPlaybackRef.current
    if (!latest || latest.key !== episodeKey) return
    handleTimeUpdate(latest.currentTime, latest.duration, true)
  }, [episodeKey, handleTimeUpdate])

  // keepalive lets the final small request survive tab close/navigation.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) flushLatestProgress()
    }
    const handlePageHide = () => flushLatestProgress()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [flushLatestProgress])

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
    if (!item) return
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
  }, [item, serverIdx, epIdx, qServer, qEp, setParams])

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
          onTimeUpdate={handleTimeUpdate}
          initialTime={initialTime}
          onResume={handleResume}
        />
        {resumeNotice?.key === episodeKey && resumeNotice.seconds > 0 && (
          <div className="resume-toast">Tiếp tục từ {formatTime(resumeNotice.seconds)}</div>
        )}
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
