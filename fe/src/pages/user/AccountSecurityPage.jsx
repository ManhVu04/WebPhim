import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { apiChangePassword, apiResendEmailVerification, apiRevokeAllSessions } from '../../lib/authApi.js';

export function AccountSecurityPage() {
  const { accessToken, logout, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [resending, setResending] = useState(false);

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
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      await apiChangePassword(accessToken, currentPassword, newPassword);
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
    setRevoking(true);
    try {
      await apiRevokeAllSessions(accessToken);
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
      await apiResendEmailVerification(accessToken);
      setMessage('Đã gửi lại email xác minh.');
    } catch (err) {
      setError(err.message || 'Không thể gửi lại email xác minh.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="account-security">
      <div className="panel account-security__panel">
        <div className="account-security__header">
          <div>
            <h1>Bảo mật tài khoản</h1>
            <p className="muted">@{user?.username}</p>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <div className="account-security__email">
          <div>
            <h2>Email</h2>
            <p className="muted">{user?.email || 'Chưa có email'}</p>
          </div>
          <div className={user?.emailVerified ? 'account-security__badge' : 'account-security__badge account-security__badge--pending'}>
            {user?.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
          </div>
          {!user?.emailVerified && user?.email && (
            <button
              type="button"
              className="btn"
              onClick={handleResendVerification}
              disabled={submitting || revoking || resending}
            >
              {resending ? 'Đang gửi...' : 'Gửi lại xác minh'}
            </button>
          )}
        </div>

        <form onSubmit={handleChangePassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="current-password">Mật khẩu hiện tại</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={submitting || revoking}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="new-password">Mật khẩu mới</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={submitting || revoking}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-new-password">Xác nhận mật khẩu mới</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={submitting || revoking}
              className="form-control"
            />
          </div>

          <button type="submit" disabled={submitting || revoking || resending} className="btn btn-primary account-security__button">
            {submitting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </button>
        </form>

        <div className="account-security__danger">
          <div>
            <h2>Thu hồi phiên đăng nhập</h2>
            <p className="muted">Tất cả refresh token hiện có sẽ hết hiệu lực.</p>
          </div>
          <button
            type="button"
            className="btn account-security__danger-button"
            onClick={handleRevokeSessions}
            disabled={submitting || revoking}
          >
            {revoking ? 'Đang thu hồi...' : 'Thu hồi tất cả phiên'}
          </button>
        </div>
      </div>
    </div>
  );
}
