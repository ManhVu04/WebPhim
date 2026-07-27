import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useClickOutside } from '../lib/useClickOutside.js';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useClickOutside(menuRef, () => setOpen(false), [open]);

  if (!user) {
    return (
      <Link to="/dang-nhap" className="login-link">
        Đăng nhập
      </Link>
    );
  }

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  // Get first letter of display name or username for avatar
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();

  return (
    <div className="dropdown user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="user-avatar">{initial}</div>
        <span>{user.displayName || user.username}</span>
      </button>
      
      {open && (
        <div className="dropdownPanel user-panel" role="menu">
          <div className="dropdownItem user-panel-head" role="presentation">
            <div className="user-panel-name">{user.displayName || user.username}</div>
            <div className="user-panel-username">@{user.username}</div>
          </div>
          <Link 
            to="/lich-su" 
            className="dropdownItem"
            onClick={() => setOpen(false)}
          >
            Lịch sử xem phim
          </Link>
          <Link 
            to="/yeu-thich" 
            className="dropdownItem"
            onClick={() => setOpen(false)}
          >
            Phim yêu thích
          </Link>
          <Link
            to="/tai-khoan/bao-mat"
            className="dropdownItem"
            onClick={() => setOpen(false)}
          >
            Bảo mật tài khoản
          </Link>
          <button 
            type="button"
            className="dropdownItem user-panel-danger"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
