import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-page account-auth-page login-page">
      <section className="auth-visual account-auth-visual" aria-hidden="true">
        <div className="auth-visual-orb auth-visual-orb-one" />
        <div className="auth-visual-orb auth-visual-orb-two" />
        <div className="auth-visual-copy">
          <div className="auth-visual-brand">
            <span className="brand-badge" />
            <span><b>Web</b>Phim</span>
          </div>
          <span className="auth-kicker">Rạp phim của riêng bạn</span>
          <h1>Tiếp tục câu chuyện còn dang dở.</h1>
          <p>Đăng nhập để trở lại đúng bộ phim, đúng tập và đúng khoảnh khắc bạn đã dừng.</p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              Xem tiếp nhanh chóng
            </div>
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1.1-1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                </svg>
              </span>
              Giữ trọn danh sách yêu thích
            </div>
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5M12 7v5l3 2" />
                </svg>
              </span>
              Đồng bộ lịch sử xem
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card account-auth-card login-card" aria-labelledby="login-title">
        <header className="auth-card-header account-auth-header">
          <span className="auth-kicker">Chào mừng trở lại</span>
          <h2 id="login-title">Đăng nhập tài khoản</h2>
          <p>Nhập thông tin của bạn để tiếp tục với WebPhim.</p>
        </header>

        {error && (
          <div className="auth-error account-auth-alert" role="alert">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 17h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form account-auth-form">
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
                autoFocus
                autoComplete="username"
                disabled={loading}
                className="form-control"
                placeholder="Tên đăng nhập của bạn"
              />
            </div>
          </div>

          <div className="form-group auth-field">
            <div className="auth-label-row">
              <label htmlFor="password">Mật khẩu</label>
              <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
            </div>
            <div className="input-shell input-shell-action">
              <span aria-hidden="true" className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="form-control"
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.6 10.6 0 0 1 12 4c5.5 0 9 6 9 6a17 17 0 0 1-2.1 2.9M6.6 6.6C4.2 8.2 3 10 3 10s3.5 6 9 6a9.8 9.8 0 0 0 3-.5" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btnPrimary auth-submit">
            {loading ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="auth-links account-auth-links">
          <span>Chưa có tài khoản?</span>
          <Link to="/dang-ky">Tạo tài khoản miễn phí</Link>
        </div>
      </section>
    </div>
  );
}
