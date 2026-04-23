import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { authFetch } from '../../lib/authApi.js';
import { MovieCard } from '../../components/MovieCard.jsx';
import { Loading as State, ErrorState } from '../../components/State.jsx';

export function FavoritesPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFavorites() {
      try {
        setLoading(true);
        const res = await authFetch('/api/favorites', accessToken);
        // Handle unauthorized - redirect to login instead of showing error
        if (res && res._unauthorized) {
          navigate('/dang-nhap', { state: { from: { pathname: '/yeu-thich' } }, replace: true });
          return;
        }
        if (res._error) {
          throw new Error('Không thể tải danh sách phim yêu thích');
        }
        setData(res.items || res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [accessToken, navigate]);

  const handleRemove = async (movieSlug) => {
    try {
      await authFetch(`/api/favorites/${movieSlug}`, accessToken, { method: 'DELETE' });
      setData(prev => prev.filter(item => item.movieSlug !== movieSlug));
    } catch (err) {
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
      )}
    </div>
  );
}
