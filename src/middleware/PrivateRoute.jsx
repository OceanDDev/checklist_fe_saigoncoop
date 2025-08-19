// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ children, allowRoles = [] }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // ❌ Nếu chưa login → chuyển về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Nếu truyền allowRoles mà user.role không hợp lệ → redirect
  if (allowRoles.length > 0 && !allowRoles.includes(user.role)) {
    // Optional: redirect về đúng trang theo role
    if (user.role === 0) return <Navigate to="/" replace />;
    if (user.role === 1) return <Navigate to="/dieuvan" replace />;
    if (user.role === 2) return <Navigate to="/kpi" replace />;

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
