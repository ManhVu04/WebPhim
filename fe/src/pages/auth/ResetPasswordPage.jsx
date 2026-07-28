import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiResetPassword } from '../../lib/authApi.js';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Link đặt lại mật khẩu không hợp lệ.');
      return;
    }
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
      await apiResetPassword(token, password);
      setMessage('Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page recovery-page">
      <section className="auth-card recovery-card" aria-labelledby="reset-password-title">
        <Link className="recovery-back" to="/dang-nhap">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Đăng nhập
        </Link>

        <div className="recovery-icon" aria-hidden="true">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="12" x="4" y="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v2" />
          </svg>
        </div>

        <header className="auth-card-header recovery-header">
          <span className="auth-kicker">Bảo mật tài khoản</span>
          <h1 id="reset-password-title">Tạo mật khẩu mới</h1>
          <p>Chọn một mật khẩu mạnh và khác với mật khẩu bạn đã sử dụng trước đây.</p>
        </header>

        {!token ? (
          <div className="recovery-result" aria-live="polite">
            <div className="auth-error recovery-alert" role="alert">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 17h.01" />
              </svg>
              <span>Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu token.</span>
            </div>
            <p className="recovery-result-copy">Hãy yêu cầu một liên kết mới để tiếp tục.</p>
            <Link className="btnPrimary recovery-primary-action" to="/quen-mat-khau">
              Yêu cầu liên kết mới
            </Link>
          </div>
        ) : message ? (
          <div className="recovery-result" aria-live="polite">
            <div className="auth-success recovery-alert">
              <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{message}</span>
            </div>
            <p className="recovery-result-copy">Mật khẩu mới đã sẵn sàng để sử dụng.</p>
            <Link className="btnPrimary recovery-primary-action" to="/dang-nhap">
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-error recovery-alert" role="alert">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 17h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form recovery-form">
              <div className="form-group auth-field">
                <label htmlFor="reset-password">Mật khẩu mới</label>
                <div className="input-shell">
                  <span aria-hidden="true" className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="16" height="12" x="4" y="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={12}
                    autoFocus
                    autoComplete="new-password"
                    disabled={loading}
                    className="form-control"
                    placeholder="Tối thiểu 12 ký tự"
                    aria-describedby="password-requirement"
                  />
                </div>
              </div>

              <div className="form-group auth-field">
                <label htmlFor="reset-password-confirm">Xác nhận mật khẩu</label>
                <div className="input-shell">
                  <span aria-hidden="true" className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </span>
                  <input
                    id="reset-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    disabled={loading}
                    className="form-control"
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              </div>

              <div className="password-options">
                <span id="password-requirement" className="password-requirement">
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

              <button type="submit" disabled={loading} className="btnPrimary auth-submit">
                {loading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    Cập nhật mật khẩu
                    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="recovery-note">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Sau khi đổi mật khẩu, các phiên đăng nhập cũ của tài khoản sẽ không còn hiệu lực.
        </div>
      </section>
    </div>
  );
}
