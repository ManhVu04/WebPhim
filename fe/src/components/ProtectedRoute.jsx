import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="panel muted">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    const isAdmin = user?.roles && Array.isArray(user.roles) && user.roles.includes('ADMIN');
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
