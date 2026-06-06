import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ophimApi } from '../lib/api.js'
import { buildPosterUrl, buildThumbUrl } from '../lib/image.js'
import { htmlToText } from '../lib/text.js'
import { ErrorState, Loading } from '../components/State.jsx'
import { LazyImage } from '../components/LazyImage.jsx'
import { useAuth } from '../lib/auth.jsx'
import { authFetch } from '../lib/authApi.js'
import { MovieCard } from '../components/MovieCard.jsx'

function joinNames(arr) {
  if (!Array.isArray(arr)) return ''
  return arr
    .map((x) => (typeof x === 'string' ? x : x?.name))
    .filter(Boolean)
    .slice(0, 8)
    .join(', ')
}

export function MovieDetailPage() {
  const { slug } = useParams()
  const [movie, setMovie] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const { user, accessToken } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const posterPreloadedRef = useRef(false)

  // Check if movie is in favorites
  useEffect(() => {
    if (!user || !movie?.data?.item) return;

    const checkFavorite = async () => {
      try {
        const res = await authFetch(`/api/favorites/${slug}/check`, accessToken);
        // Handle unauthorized (token expired/invalid) - treat as not favorited, don't show error
        if (res && res._unauthorized) {
          setIsFavorite(false);
        } else if (res && typeof res.favorited === 'boolean') {
          setIsFavorite(res.favorited);
        }
      } catch (e) {
        console.error('Error checking favorite:', e);
      }
    };
    checkFavorite();
  }, [user, movie, accessToken, slug]);

  const toggleFavorite = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu phim yêu thích');
      return;
    }
    
    const item = movie?.data?.item;
    if (!item) return;
    
    const cdnBase = movie?.data?.APP_DOMAIN_CDN_IMAGE || movie?.data?.data?.APP_DOMAIN_CDN_IMAGE || '';
    setFavLoading(true);

    try {
      if (isFavorite) {
        await authFetch(`/api/favorites/${slug}`, accessToken, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await authFetch('/api/favorites', accessToken, {
          method: 'POST',
          body: JSON.stringify({
            movieSlug: slug,
            movieName: item.name,
            movieOriginName: item.origin_name,
            thumbUrl: buildThumbUrl(cdnBase, item.thumb_url),
            posterUrl: buildPosterUrl(cdnBase, item.poster_url, item.thumb_url),
            year: item.year
          })
        });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.allSettled([ophimApi.movie(slug), ophimApi.moviePeople(slug), ophimApi.list('phim-moi', 1)]).then(
      (results) => {
        if (!alive) return
        const [rMovie, rPeople, rRecommendations] = results
        if (rMovie.status === 'rejected') {
          setErr(rMovie.reason)
        } else {
          setMovie(rMovie.value)
        }
        setPeople(rPeople.status === 'fulfilled' ? rPeople.value : null)
        setRecommendations(rRecommendations.status === 'fulfilled' ? rRecommendations.value : null)
        setLoading(false)
      },
    )
    return () => {
      alive = false
    }
  }, [slug])

  const cdn = movie?.data?.APP_DOMAIN_CDN_IMAGE || movie?.data?.APP_DOMAIN_CDN || ''
  const item = movie?.data?.item || movie?.data?.data?.item || movie?.data || null

  const title = item?.name || item?.origin_name || slug
  const poster = useMemo(() => buildPosterUrl(cdn, item?.poster_url, item?.thumb_url), [cdn, item])

  // Preload poster image khi data load xong
  useEffect(() => {
    if (!poster || posterPreloadedRef.current) return
    const img = new Image()
    img.onload = () => { posterPreloadedRef.current = true }
    img.src = poster
  }, [poster])

  // Không dùng hook sau các return sớm (tránh lỗi Rendered more hooks...)
  const categories = item ? joinNames(item.category) : ''
  const countries = item ? joinNames(item.country) : ''
  const altNames = item && Array.isArray(item.alternative_names) ? item.alternative_names.slice(0, 3).join(' · ') : ''

  const profileSizes = people?.data?.profile_sizes || {}
  const peoples = people?.data?.peoples || []
  const cast = Array.isArray(peoples)
    ? peoples.filter((p) => String(p.known_for_department || '').toLowerCase() === 'acting')
    : []
  const directors = Array.isArray(peoples)
    ? peoples.filter((p) => String(p.known_for_department || '').toLowerCase() === 'directing')
    : []

  if (loading) return <Loading label="Đang tải thông tin phim..." />
  if (err) return <ErrorState error={err} />
  if (!item) return <div className="panel muted">Không tìm thấy phim.</div>

  const contentText = htmlToText(item?.content)
  const recommendationData = recommendations?.data || {}
  const recommendationItems = (recommendationData.items || []).filter((movie) => movie.slug !== slug).slice(0, 8)
  const recommendationCdn = recommendationData.APP_DOMAIN_CDN_IMAGE || recommendationData.APP_DOMAIN_CDN || cdn

  return (
    <div className="detail-page">
      <section className="detail-hero" style={{ '--detail-backdrop': `url(${poster})` }}>
        <div className="detail-copy">
          <h1>{title}</h1>
          {altNames ? <div className="muted lineClamp2">{altNames}</div> : null}
          <div className="detail-tags">
            {item?.year ? <span>Năm {item.year}</span> : null}
            {item?.status ? <span>{item.status}</span> : null}
            {item?.episode_current ? <span>{item.episode_current}</span> : null}
            {countries ? <span>{countries}</span> : null}
          </div>
          <div className="rating-box">
            <span className="stars" aria-hidden="true">★★★★★★★★☆☆</span>
            <strong>{item?.tmdb?.vote_average ? `${Number(item.tmdb.vote_average).toFixed(1)} sao` : '8.0 sao'}</strong>
          </div>
          <div className="detail-info">
            {directors.length ? <p><b>Đạo diễn:</b> {joinNames(directors)}</p> : null}
            {cast.length ? <p><b>Diễn viên:</b> {joinNames(cast)}</p> : null}
            {contentText ? <p><b>Nội dung:</b> {contentText}</p> : null}
          </div>
          <div className="detail-actions">
            {user && (
              <button
                className="btn"
                onClick={toggleFavorite}
                disabled={favLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: favLoading ? 0.7 : 1,
                  cursor: favLoading ? 'wait' : 'pointer',
                  background: isFavorite ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isFavorite ? 'rgba(239, 68, 68, 0.5)' : 'transparent',
                  color: isFavorite ? '#fca5a5' : 'var(--text)'
                }}
              >
                {favLoading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                )}
                {favLoading ? 'Đang xử lý...' : isFavorite ? 'Đã thích' : 'Yêu thích'}
              </button>
            )}
            <Link className="btnPrimary" to={`/xem/${encodeURIComponent(slug)}?server=0&ep=0`}>
              ▶ Xem phim
            </Link>
          </div>
        </div>
      </section>

      <section className="detail-panel">
        <div className="kvs">
          {item?.quality ? <span className="kv">{item.quality}</span> : null}
          {item?.lang ? <span className="kv">{item.lang}</span> : null}
          {item?.time ? <span className="kv">{item.time}</span> : null}
          {item?.type ? <span className="kv">{item.type}</span> : null}
          {categories ? <span className="kv">{categories}</span> : null}
        </div>

        {Array.isArray(directors) && directors.length ? (
          <div className="people-block">
            <div className="block-title">Đạo diễn</div>
            <div className="peopleRow">
              {directors.slice(0, 12).map((p) => {
                const imgBase = profileSizes.w185 || profileSizes.h632 || profileSizes.original || ''
                const img = p.profile_path && imgBase ? `${imgBase}${p.profile_path}` : ''
                return (
                  <div key={p.tmdb_people_id || p.name} className="personCard">
                    <LazyImage src={img} alt={p.name} className="personImg" />
                    <div className="personBody">
                      <div className="personName">{p.name}</div>
                      <div className="personRole">{p.known_for_department || 'Directing'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {Array.isArray(cast) && cast.length ? (
          <div className="people-block">
            <div className="block-title">Diễn viên</div>
            <div className="peopleRow">
              {cast.slice(0, 18).map((p) => {
                const imgBase = profileSizes.w185 || profileSizes.h632 || profileSizes.original || ''
                const img = p.profile_path && imgBase ? `${imgBase}${p.profile_path}` : ''
                return (
                  <div key={p.tmdb_people_id || p.name} className="personCard">
                    <LazyImage src={img} alt={p.name} className="personImg" />
                    <div className="personBody">
                      <div className="personName">{p.name}</div>
                      <div className="personRole">{p.character || p.known_for_department || ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

      </section>

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

