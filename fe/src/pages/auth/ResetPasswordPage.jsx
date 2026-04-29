import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiResetPassword } from '../../lib/authApi.js';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
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
    <div className="auth-container">
      <div className="auth-box panel">
        <h2>Đặt lại mật khẩu</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="reset-password">Mật khẩu mới</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading || !token}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reset-password-confirm">Xác nhận mật khẩu mới</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading || !token}
              className="form-control"
            />
          </div>
          <button type="submit" disabled={loading || !token} className="btn btn-primary auth-submit">
            {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
        <div className="auth-links muted">
          <Link to="/dang-nhap">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
