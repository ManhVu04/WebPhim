import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const passwordMismatch = Boolean(confirmPassword) && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 12) {
      setError('Mật khẩu phải có ít nhất 12 ký tự.');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password, displayName);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page account-auth-page register-page">
      <section className="auth-visual account-auth-visual register-visual" aria-hidden="true">
        <div className="auth-visual-orb auth-visual-orb-one" />
        <div className="auth-visual-orb auth-visual-orb-two" />
        <div className="auth-visual-copy">
          <div className="auth-visual-brand">
            <span className="brand-badge" />
            <span><b>Web</b>Phim</span>
          </div>
          <span className="auth-kicker">Bắt đầu miễn phí</span>
          <h1>Một tài khoản, mọi bộ phim bạn yêu thích.</h1>
          <p>Tạo hồ sơ riêng để lưu phim, theo dõi tiến độ và trở lại bất cứ lúc nào.</p>

          <div className="auth-benefits">
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 12 2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              Đăng ký nhanh chóng
            </div>
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              Tài khoản được bảo vệ
            </div>
            <div className="auth-benefit">
              <span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-8-4-8 4Z" />
                </svg>
              </span>
              Lưu phim không giới hạn
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card account-auth-card register-card" aria-labelledby="register-title">
        <header className="auth-card-header account-auth-header">
          <span className="auth-kicker">Tham gia WebPhim</span>
          <h2 id="register-title">Tạo tài khoản</h2>
          <p>Chỉ mất một phút để bắt đầu không gian phim của riêng bạn.</p>
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

        <form onSubmit={handleSubmit} className="auth-form account-auth-form register-form">
          <div className="register-form-grid">
            <div className="form-group auth-field">
              <label htmlFor="displayName">Tên hiển thị</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                  </svg>
                </span>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  maxLength={100}
                  autoComplete="name"
                  disabled={loading}
                  className="form-control"
                  placeholder="Tên bạn muốn hiển thị"
                />
              </div>
            </div>

            <div className="form-group auth-field">
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9V5a2 2 0 0 1 2-2h4M20 15v4a2 2 0 0 1-2 2h-4M14 3h4a2 2 0 0 1 2 2v4M10 21H6a2 2 0 0 1-2-2v-4" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                  autoComplete="username"
                  disabled={loading}
                  className="form-control"
                  placeholder="Từ 3 ký tự"
                />
              </div>
            </div>

            <div className="form-group auth-field register-field-wide">
              <label htmlFor="email">Địa chỉ email</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="14" x="3" y="5" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                  disabled={loading}
                  className="form-control"
                  placeholder="tenban@example.com"
                />
              </div>
            </div>

            <div className="form-group auth-field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="12" x="4" y="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  disabled={loading}
                  className="form-control"
                  placeholder="Tối thiểu 12 ký tự"
                  aria-describedby="register-password-hint"
                />
              </div>
            </div>

            <div className="form-group auth-field">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className={`input-shell${passwordMismatch ? ' is-invalid' : ''}`}>
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  disabled={loading}
                  className="form-control"
                  placeholder="Nhập lại mật khẩu"
                  aria-invalid={passwordMismatch}
                />
              </div>
            </div>
          </div>

          <div className="password-options register-password-options">
            <span id="register-password-hint" className="password-requirement">
              <span aria-hidden="true">✓</span> Ít nhất 12 ký tự
            </span>
            <label className="password-visibility">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                disabled={loading}
              />
              Hiện mật khẩu
            </label>
          </div>

          {passwordMismatch && (
            <span className="field-error" role="status">Hai mật khẩu chưa trùng khớp.</span>
          )}

          <button type="submit" disabled={loading} className="btnPrimary auth-submit">
            {loading ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Đang tạo tài khoản...
              </>
            ) : (
              <>
                Tạo tài khoản
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="auth-links account-auth-links">
          <span>Đã có tài khoản?</span>
          <Link to="/dang-nhap">Đăng nhập ngay</Link>
        </div>
      </section>
    </div>
  );
}
