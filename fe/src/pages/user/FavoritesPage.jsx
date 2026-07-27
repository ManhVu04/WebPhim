import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authFetch } from '../../lib/authApi.js';
import { MovieCard } from '../../components/MovieCard.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Loading as State, ErrorState } from '../../components/State.jsx';

const PAGE_SIZE = 24;

export function FavoritesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [result, setResult] = useState({ items: [], totalItems: 0, currentPage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch(`/api/favorites?page=${page - 1}&size=${PAGE_SIZE}`);
        const totalPages = Number(res.totalPages || 0);
        if (active && totalPages > 0 && page > totalPages) {
          navigate(`/yeu-thich${totalPages === 1 ? '' : `?page=${totalPages}`}`, { replace: true });
          return;
        }
        if (active) {
          setResult({
            items: res.items || [],
            totalItems: Number(res.totalItems || 0),
            currentPage: Number(res.currentPage || 0),
          });
        }
      } catch (err) {
        if (!active) return;
        if (err.status === 401) {
          navigate('/dang-nhap', { state: { from: { pathname: '/yeu-thich' } }, replace: true });
          return;
        }
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFavorites();
    return () => {
      active = false;
    };
  }, [navigate, page]);

  const data = result.items;

  const handleRemove = async (movieSlug) => {
    try {
      await authFetch(`/api/favorites/${movieSlug}`, { method: 'DELETE' });
      setResult((previous) => ({
        ...previous,
        items: previous.items.filter((item) => item.movieSlug !== movieSlug),
        totalItems: Math.max(0, previous.totalItems - 1),
      }));
      if (data.length === 1 && page > 1) {
        navigate(`/yeu-thich${page === 2 ? '' : `?page=${page - 1}`}`, { replace: true });
      }
    } catch (err) {
      if (err.status === 401) {
        navigate('/dang-nhap', { state: { from: { pathname: '/yeu-thich' } }, replace: true });
        return;
      }
      console.error('Failed to remove favorite:', err);
      // Let it fail silently or show a toast notification in a real app
    }
  };

  if (loading) return <State />;
  if (error) return <ErrorState error={{message: error}} />;

  return (
    <div className="favorites-page">
      <div className="section-title">
        <h1>Phim yêu thích của bạn</h1>
      </div>

      {data.length === 0 ? (
        <div className="panel muted" style={{ textAlign: 'center', padding: '40px' }}>
          Bạn chưa có phim yêu thích nào.
          <br /><br />
          <Link to="/" className="btn btnPrimary">Khám phá ngay</Link>
        </div>
      ) : (
        <>
          <div className="grid">
            {data.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <MovieCard
                  item={{
                    slug: item.movieSlug,
                    name: item.movieName,
                    origin_name: item.movieOriginName,
                    thumb_url: item.thumbUrl,
                    poster_url: item.posterUrl,
                    year: item.year
                  }}
                />
                <button
                  className="remove-fav-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(item.movieSlug);
                  }}
                  title="Bỏ yêu thích"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
              </div>
            ))}
          </div>
          <Pagination pagination={{
            currentPage: result.currentPage + 1,
            totalItems: result.totalItems,
            totalItemsPerPage: PAGE_SIZE,
          }} />
        </>
      )}
    </div>
  );
}
