import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MovieCard } from '../components/MovieCard.jsx'
import { ErrorState, Loading } from '../components/State.jsx'
import { cacheKeys, ophimApi } from '../lib/api.js'
import { buildPosterUrl } from '../lib/image.js'
import { usePrerenderData } from '../lib/prerenderData.jsx'
import { htmlToText } from '../lib/text.js'
import { useSeoHead } from '../lib/useSeoHead.js'
import { buildSeo } from '../lib/seo.js'

export const HOME_SECTIONS = [
  { key: 'phim-moi', title: 'Phim mới cập nhật', to: '/danh-sach/phim-moi' },
  { key: 'phim-chieu-rap', title: 'Phim chiếu rạp', to: '/danh-sach/phim-chieu-rap' },
  { key: 'phim-bo', title: 'Phim bộ mới', to: '/danh-sach/phim-bo' },
  { key: 'phim-le', title: 'Phim lẻ mới', to: '/danh-sach/phim-le' },
  { key: 'hoat-hinh', title: 'Hoạt hình', to: '/danh-sach/hoat-hinh' },
]

function normalizeList(json) {
  const data = json?.data || json || {}
  return {
    cdn: data.APP_DOMAIN_CDN_IMAGE || data.APP_DOMAIN_CDN || '',
    items: data.items || data.data?.items || [],
  }
}

function pickHeroItem(home, fallbackSections) {
  const homeItems = normalizeList(home).items
  if (homeItems.length) return homeItems[0]
  return fallbackSections.find((section) => section.items.length)?.items[0] || null
}

function initialSectionsFrom(data) {
  return HOME_SECTIONS.map((section) => {
    const json = data[cacheKeys.list(section.key, 1)]
    const normalized = normalizeList(json)
    return { ...section, ...normalized }
  }).filter((section) => section.items.length)
}

export function HomePage() {
  const prerenderData = usePrerenderData()
  const initialHome = prerenderData[cacheKeys.home()] || null
  const initialSections = initialSectionsFrom(prerenderData)
  const hasInitialData = Boolean(initialHome || initialSections.length)
  const [home, setHome] = useState(initialHome)
  const [sections, setSections] = useState(initialSections)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(!hasInitialData)

  useEffect(() => {
    if (hasInitialData) return
    let alive = true
    setLoading(true)

    Promise.allSettled([
      ophimApi.home(),
      ...HOME_SECTIONS.map((section) => ophimApi.list(section.key, 1)),
    ]).then((results) => {
      if (!alive) return
      const [homeResult, ...sectionResults] = results
      const nextSections = HOME_SECTIONS.map((section, index) => {
        const result = sectionResults[index]
        const data = result.status === 'fulfilled' ? normalizeList(result.value) : { cdn: '', items: [] }
        return { ...section, ...data }
      }).filter((section) => section.items.length)

      setHome(homeResult.status === 'fulfilled' ? homeResult.value : null)
      setSections(nextSections)
      setErr(nextSections.length ? null : homeResult.reason || new Error('Không tải được dữ liệu trang chủ.'))
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [hasInitialData])

  const hero = useMemo(() => pickHeroItem(home, sections), [home, sections])
  const cdn = sections[0]?.cdn || normalizeList(home).cdn || ''
  const heroImage = buildPosterUrl(cdn, hero?.poster_url, hero?.thumb_url)
  const heroTitle = hero?.name || hero?.origin_name || 'WebPhim'
  const heroText = htmlToText(hero?.content || '').slice(0, 190)

  const seo = useMemo(() => {
    const fallbackSection = sections.find((section) => section.items.length)
    const seoHome = home || {
      data: {
        items: fallbackSection?.items || [],
        seoOnPage: {
          titleHead: 'WebPhim - Xem phim online miễn phí, HD Vietsub',
          descriptionHead: 'WebPhim - Xem phim online miễn phí, cập nhật phim mới nhanh nhất với chất lượng HD, Vietsub. Phim lẻ, phim bộ, hoạt hình mới nhất.',
        },
      },
    }

    return buildSeo({
      url: '/',
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      data: { [cacheKeys.home()]: seoHome },
    })
  }, [home, sections])

  useSeoHead({
    title: seo.title,
    description: seo.description,
    canonical: seo.canonical,
    robots: seo.robots,
    type: seo.type,
    image: seo.image,
    jsonLd: seo.itemList,
  })

  if (loading) return <Loading label="Đang tải trang chủ..." />
  if (err && !hero) return <ErrorState error={err} />

  return (
    <div className="home-page">
      {hero ? (
        <section className="home-hero" style={{ '--hero-image': `url(${heroImage})` }}>
          <div className="home-hero-content">
            <div className="hero-badges">
              {hero?.quality ? <span>{hero.quality}</span> : null}
              {hero?.lang ? <span>{hero.lang}</span> : null}
              {hero?.episode_current ? <span>{hero.episode_current}</span> : null}
            </div>
            <h1>{heroTitle}</h1>
            <div className="hero-meta-line">
              {hero?.year ? <span>{hero.year}</span> : null}
              {hero?.country?.[0]?.name ? <span>{hero.country[0].name}</span> : null}
              {hero?.time ? <span>{hero.time}</span> : null}
            </div>
            {heroText ? <p>{heroText}</p> : null}
            <Link className="btnPrimary hero-play" to={`/phim/${encodeURIComponent(hero.slug)}`}>
              <span aria-hidden="true">▶</span>
              Xem ngay
            </Link>
          </div>
        </section>
      ) : null}

      <div className="home-sections">
        {sections.map((section, sectionIndex) => (
          <section className="movie-section" key={section.key}>
            <div className="section-title">
              <h2>{section.title}</h2>
              <Link className="section-more" to={section.to}>Xem thêm</Link>
            </div>
            <div className="rail-grid">
              {section.items.slice(0, sectionIndex === 0 ? 12 : 8).map((item, index) => (
                <MovieCard
                  key={item._id || item.slug}
                  cdnBase={section.cdn}
                  item={item}
                  priority={sectionIndex === 0 && index < 6}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
