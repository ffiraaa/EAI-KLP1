import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ roles }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'user';
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
