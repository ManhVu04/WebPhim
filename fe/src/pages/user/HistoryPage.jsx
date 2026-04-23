import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { authFetch } from '../../lib/authApi.js';
import { MovieCard } from '../../components/MovieCard.jsx';
import { Loading as State, ErrorState } from '../../components/State.jsx';

export function HistoryPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await authFetch('/api/history', accessToken);
        // Handle unauthorized - redirect to login instead of showing error
        if (res && res._unauthorized) {
          navigate('/dang-nhap', { state: { from: { pathname: '/lich-su' } }, replace: true });
          return;
        }
        if (res._error) {
          throw new Error('Không thể tải lịch sử xem phim');
        }
        setData(res.items || res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [accessToken, navigate]);

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?')) return;

    try {
      await authFetch('/api/history', accessToken, { method: 'DELETE' });
      setData([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  if (loading) return <State />;
  if (error) return <ErrorState error={{message: error}} />;

  return (
    <div className="history-page">
      <div className="section-title">
        <h1>Lịch sử xem phim</h1>
        {data.length > 0 && (
          <button className="btn" onClick={handleClearAll} style={{ padding: '6px 12px', fontSize: '13px' }}>
            Xóa tất cả
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="panel muted" style={{ textAlign: 'center', padding: '40px' }}>
          Bạn chưa xem bộ phim nào.
          <br /><br />
          <Link to="/" className="btn btnPrimary">Khám phá ngay</Link>
        </div>
      ) : (
        <div className="grid">
          {data.map((item) => (
            <div key={item.id} className="history-item-wrapper">
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
              {item.episodeName && (
                <div className="history-meta">
                  <span>Tập {item.episodeName}</span>
                  <span className="muted" style={{ fontSize: '11px' }}>
                    {new Date(item.watchedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
