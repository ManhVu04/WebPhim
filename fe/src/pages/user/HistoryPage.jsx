import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authFetch } from '../../lib/authApi.js';
import { Pagination } from '../../components/Pagination.jsx';
import { Loading as State, ErrorState } from '../../components/State.jsx';

const PAGE_SIZE = 24;

export function HistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [result, setResult] = useState({ items: [], totalItems: 0, currentPage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch(`/api/history?page=${page - 1}&size=${PAGE_SIZE}`);
        const totalPages = Number(res.totalPages || 0);
        if (active && totalPages > 0 && page > totalPages) {
          navigate(`/lich-su${totalPages === 1 ? '' : `?page=${totalPages}`}`, { replace: true });
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
          navigate('/dang-nhap', { state: { from: { pathname: '/lich-su' } }, replace: true });
          return;
        }
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [navigate, page]);

  const data = result.items;

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?')) return;

    try {
      await authFetch('/api/history', { method: 'DELETE' });
      setResult({ items: [], totalItems: 0, currentPage: 0 });
      if (page > 1) {
        navigate('/lich-su', { replace: true });
      }
    } catch (err) {
      if (err.status === 401) {
        navigate('/dang-nhap', { state: { from: { pathname: '/lich-su' } }, replace: true });
        return;
      }
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
        <>
          <div className="grid">
            {data.map((item) => (
              <div key={item.id} className="history-item-wrapper">
                <Link
                  to={`/xem/${encodeURIComponent(item.movieSlug)}?server=${item.serverIndex || 0}&ep=${item.episodeIndex || 0}`}
                  className="card movie-card"
                >
                  <div className="poster-frame">
                    <img
                      src={item.thumbUrl || ''}
                      alt={item.movieName || item.movieOriginName || item.movieSlug}
                      className="poster"
                      loading="lazy"
                    />
                  </div>
                  <div className="card-body">
                    <div className="title">{item.movieName || item.movieOriginName || item.movieSlug}</div>
                    <div className="meta">
                      <span>{item.year || '—'}</span>
                    </div>
                  </div>
                </Link>
                {item.episodeName && (
                  <div className="history-meta">
                    <span>Tập {item.episodeName}</span>
                    <span className="muted" style={{ fontSize: '11px' }}>
                      {new Date(item.watchedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
                {item.progressSeconds > 0 && item.durationSeconds > 0 && (
                  <div className="history-progress-bar">
                    <div
                      className="history-progress-fill"
                      style={{ width: `${Math.min(100, (item.progressSeconds / item.durationSeconds) * 100)}%` }}
                    />
                  </div>
                )}
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
