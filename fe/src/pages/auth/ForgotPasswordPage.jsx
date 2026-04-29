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
    <div className="auth-container">
      <div className="auth-box panel">
        <h2>Quên mật khẩu</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="form-control"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
          </button>
        </form>
        <div className="auth-links muted">
          <Link to="/dang-nhap">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
