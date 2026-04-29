import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiVerifyEmail } from '../../lib/authApi.js';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Link xác minh email không hợp lệ.');
      return;
    }

    apiVerifyEmail(token)
      .then(() => {
        setMessage('Email đã được xác minh. Bạn có thể tiếp tục sử dụng tài khoản.');
      })
      .catch((err) => {
        setError(err.message || 'Không thể xác minh email.');
      });
  }, [token]);

  return (
    <div className="auth-container">
      <div className="auth-box panel">
        <h2>Xác minh email</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        {!error && !message && <div className="muted">Đang xác minh...</div>}
        <div className="auth-links muted">
          <Link to="/dang-nhap">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
