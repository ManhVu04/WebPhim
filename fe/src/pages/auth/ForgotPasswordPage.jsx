import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiForgotPassword } from '../../lib/authApi.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await apiForgotPassword(email);
      setMessage('Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.');
    } catch (err) {
      setError(err.message || 'Không thể gửi email đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page recovery-page">
      <section className="auth-card recovery-card" aria-labelledby="forgot-password-title">
        <Link className="recovery-back" to="/dang-nhap">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Đăng nhập
        </Link>

        <div className="recovery-icon" aria-hidden="true">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="14" x="3" y="5" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        <header className="auth-card-header recovery-header">
          <span className="auth-kicker">Khôi phục tài khoản</span>
          <h2 id="forgot-password-title">Quên mật khẩu?</h2>
          <p>Nhập email đã đăng ký. Chúng tôi sẽ gửi cho bạn một liên kết đặt lại mật khẩu.</p>
        </header>

        {error && (
          <div className="auth-error recovery-alert" role="alert">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 17h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {message ? (
          <div className="recovery-result" aria-live="polite">
            <div className="auth-success recovery-alert">
              <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{message}</span>
            </div>
            <p className="recovery-result-copy">
              Kiểm tra cả thư mục spam nếu bạn chưa thấy email sau vài phút.
            </p>
            <Link className="btnPrimary recovery-primary-action" to="/dang-nhap">
              Quay lại đăng nhập
            </Link>
            <button type="button" className="recovery-text-button" onClick={() => setMessage(null)}>
              Gửi lại bằng email khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form recovery-form">
            <div className="form-group auth-field">
              <label htmlFor="reset-email">Địa chỉ email</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="14" x="3" y="5" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  className="form-control"
                  placeholder="tenban@example.com"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btnPrimary auth-submit">
              {loading ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Đang gửi...
                </>
              ) : (
                <>
                  Gửi liên kết đặt lại
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        <div className="recovery-note">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="12" x="4" y="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Vì lý do bảo mật, chúng tôi không tiết lộ email có tồn tại trong hệ thống hay không.
        </div>
      </section>
    </div>
  );
}
