import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link to="/dang-nhap" className="login-link">
        Đăng nhập
      </Link>
    );
  }

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  // Get first letter of display name or username for avatar
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();

  return (
    <div className="dropdown">
      <button
        type="button"
        className="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="user-avatar">{initial}</div>
        <span>{user.displayName || user.username}</span>
      </button>
      
      {open && (
        <div className="dropdownPanel user-panel" onMouseLeave={() => setOpen(false)}>
          <div className="dropdownItem" style={{ borderBottom: '1px solid var(--border)', borderRadius: '12px 12px 0 0', cursor: 'default' }}>
            <div style={{ fontWeight: 600 }}>{user.displayName || user.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>@{user.username}</div>
          </div>
          <Link 
            to="/lich-su" 
            className="dropdownItem"
            style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none' }}
            onClick={() => setOpen(false)}
          >
            Lịch sử xem phim
          </Link>
          <Link 
            to="/yeu-thich" 
            className="dropdownItem"
            style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none' }}
            onClick={() => setOpen(false)}
          >
            Phim yêu thích
          </Link>
          <Link
            to="/tai-khoan/bao-mat"
            className="dropdownItem"
            style={{ borderRadius: 0, borderTop: 'none', borderBottom: '1px solid var(--border)' }}
            onClick={() => setOpen(false)}
          >
            Bảo mật tài khoản
          </Link>
          <button 
            type="button"
            className="dropdownItem" 
            style={{ width: '100%', textAlign: 'left', borderRadius: '0 0 12px 12px', borderTop: 'none', color: '#fca5a5' }}
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
