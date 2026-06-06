import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-visual-copy">
          <span className="auth-kicker">WebPhim</span>
          <h1>Không gian phim của bạn</h1>
          <p>Theo dõi lịch sử xem, lưu phim yêu thích và tiếp tục thưởng thức trên mọi thiết bị.</p>
        </div>
      </section>

      <section className="auth-card login-card" aria-labelledby="login-title">
        <div className="auth-card-header">
          <span className="auth-kicker">Tài khoản</span>
          <h2 id="login-title">Đăng nhập</h2>
          <p>Trở lại để tiếp tục danh sách phim của bạn.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group auth-field">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="input-shell">
              <span aria-hidden="true" className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
                className="form-control"
                placeholder="Nhập tên đăng nhập"
              />
            </div>
          </div>

          <div className="form-group auth-field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="input-shell">
              <span aria-hidden="true" className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="form-control"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          <div className="login-row">
            <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
          </div>

          <button type="submit" disabled={loading} className="btnPrimary auth-submit">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-links">
          Chưa có tài khoản? <Link to="/dang-ky">Đăng ký ngay</Link>
        </div>
      </section>
    </div>
  );
}
