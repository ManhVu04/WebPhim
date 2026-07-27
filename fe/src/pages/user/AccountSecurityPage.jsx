import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { apiChangePassword, apiResendEmailVerification, apiRevokeAllSessions } from '../../lib/authApi.js';

export function AccountSecurityPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [resending, setResending] = useState(false);
  const passwordMismatch = Boolean(confirmPassword) && newPassword !== confirmPassword;
  const busy = submitting || revoking || resending;
  const identity = user?.displayName || user?.username || 'Tài khoản';
  const avatarLabel = identity.trim().charAt(0).toUpperCase() || 'U';

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 12) {
      setError('Mật khẩu mới phải có ít nhất 12 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setMessage('Đã đổi mật khẩu. Vui lòng đăng nhập lại trên thiết bị này.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        logout();
        navigate('/dang-nhap', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSessions = async () => {
    clearFeedback();
    setConfirmRevoke(false);
    setRevoking(true);
    try {
      await apiRevokeAllSessions();
      setMessage('Đã thu hồi các phiên đăng nhập. Vui lòng đăng nhập lại trên thiết bị này.');
      window.setTimeout(() => {
        logout();
        navigate('/dang-nhap', { replace: true });
      }, 900);
    } catch (err) {
      setError(err.message || 'Không thể thu hồi phiên đăng nhập.');
    } finally {
      setRevoking(false);
    }
  };

  const handleResendVerification = async () => {
    clearFeedback();
    setResending(true);
    try {
      await apiResendEmailVerification();
      setMessage('Đã gửi lại email xác minh.');
    } catch (err) {
      setError(err.message || 'Không thể gửi lại email xác minh.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="account-security-page">
      <header className="security-hero">
        <div className="security-hero-icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="security-hero-copy">
          <span className="auth-kicker">Trung tâm bảo mật</span>
          <h1>Bảo mật tài khoản</h1>
          <p>Quản lý mật khẩu, email xác minh và các phiên đăng nhập của bạn.</p>
        </div>
        <div className="security-identity">
          <span className="security-avatar" aria-hidden="true">{avatarLabel}</span>
          <div>
            <strong>{identity}</strong>
            <span>@{user?.username}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="auth-error security-feedback" role="alert">
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 17h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="auth-success security-feedback" role="status" aria-live="polite">
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{message}</span>
        </div>
      )}

      <div className="security-layout">
        <section className="security-card security-password-card" aria-labelledby="change-password-title">
          <div className="security-card-header">
            <div className="security-card-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="16" height="12" x="4" y="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
              </svg>
            </div>
            <div>
              <span className="security-eyebrow">Mật khẩu</span>
              <h2 id="change-password-title">Đổi mật khẩu</h2>
              <p>Nên sử dụng mật khẩu duy nhất mà bạn chưa dùng ở nơi khác.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="auth-form security-password-form">
            <div className="form-group auth-field security-field-wide">
              <label htmlFor="current-password">Mật khẩu hiện tại</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="12" x="4" y="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  id="current-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={busy}
                  className="form-control"
                  placeholder="Nhập mật khẩu đang sử dụng"
                />
              </div>
            </div>

            <div className="form-group auth-field">
              <label htmlFor="new-password">Mật khẩu mới</label>
              <div className="input-shell">
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1" />
                    <rect width="14" height="10" x="5" y="11" rx="2" />
                  </svg>
                </span>
                <input
                  id="new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  disabled={busy}
                  className="form-control"
                  placeholder="Tối thiểu 12 ký tự"
                  aria-describedby="security-password-hint"
                />
              </div>
            </div>

            <div className="form-group auth-field">
              <label htmlFor="confirm-new-password">Xác nhận mật khẩu</label>
              <div className={`input-shell${passwordMismatch ? ' is-invalid' : ''}`}>
                <span aria-hidden="true" className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <input
                  id="confirm-new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  disabled={busy}
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  aria-invalid={passwordMismatch}
                />
              </div>
            </div>

            <div className="password-options security-password-options security-field-wide">
              <span id="security-password-hint" className="password-requirement">
                <span aria-hidden="true">✓</span> Ít nhất 12 ký tự
              </span>
              <label className="password-visibility">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(event) => setShowPasswords(event.target.checked)}
                  disabled={busy}
                />
                Hiện mật khẩu
              </label>
            </div>

            {passwordMismatch && (
              <span className="field-error security-field-wide" role="status">
                Hai mật khẩu mới chưa trùng khớp.
              </span>
            )}

            <button type="submit" disabled={busy} className="btnPrimary auth-submit security-submit security-field-wide">
              {submitting ? (
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

          <div className="security-info-note">
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            Bạn sẽ được yêu cầu đăng nhập lại sau khi đổi mật khẩu thành công.
          </div>
        </section>

        <aside className="security-sidebar">
          <section className="security-card security-email-card" aria-labelledby="security-email-title">
            <div className="security-card-header security-card-header-compact">
              <div className="security-card-icon security-card-icon-email" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="14" x="3" y="5" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <div>
                <span className="security-eyebrow">Danh tính</span>
                <h2 id="security-email-title">Email tài khoản</h2>
              </div>
            </div>

            <div className="security-email-value">{user?.email || 'Chưa có email'}</div>
            <div className={`security-status-pill${user?.emailVerified ? '' : ' security-status-pill-pending'}`}>
              {user?.emailVerified ? (
                <>
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Đã xác minh
                </>
              ) : (
                <>
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  Chưa xác minh
                </>
              )}
            </div>

            {!user?.emailVerified && user?.email ? (
              <button
                type="button"
                className="btn security-secondary-action"
                onClick={handleResendVerification}
                disabled={busy}
              >
                {resending ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Đang gửi...
                  </>
                ) : (
                  'Gửi lại email xác minh'
                )}
              </button>
            ) : (
              <p className="security-card-copy">Email đã được xác nhận và có thể dùng để khôi phục tài khoản.</p>
            )}
          </section>

          <section className="security-card security-session-card" aria-labelledby="security-session-title">
            <div className="security-card-header security-card-header-compact">
              <div className="security-card-icon security-card-icon-session" aria-hidden="true">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="12" x="3" y="4" rx="2" />
                  <path d="M8 20h8M12 16v4" />
                </svg>
              </div>
              <div>
                <span className="security-eyebrow">Phiên đăng nhập</span>
                <h2 id="security-session-title">Đăng xuất mọi thiết bị</h2>
              </div>
            </div>

            <p className="security-card-copy">
              Thu hồi toàn bộ refresh token nếu bạn nghi ngờ tài khoản đang được sử dụng ở thiết bị lạ.
            </p>

            {confirmRevoke ? (
              <div className="security-confirm" role="alert">
                <strong>Bạn chắc chắn muốn tiếp tục?</strong>
                <span>Thiết bị hiện tại cũng sẽ đăng xuất.</span>
                <div className="security-confirm-actions">
                  <button type="button" className="btn" onClick={() => setConfirmRevoke(false)} disabled={revoking}>
                    Hủy
                  </button>
                  <button type="button" className="security-danger-button" onClick={handleRevokeSessions} disabled={busy}>
                    {revoking ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="security-danger-button"
                onClick={() => {
                  clearFeedback();
                  setConfirmRevoke(true);
                }}
                disabled={busy}
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                </svg>
                Thu hồi tất cả phiên
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
