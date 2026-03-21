// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ children, allowRoles = [] }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // ❌ Nếu chưa login → chuyển về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu user.role = 3 → chỉ được vào đúng 1 link duy nhất
  if (user.role === 3) {
    const allowedPath = "/checklistform/68672ef4c68c3523675f210c";
    if (window.location.pathname !== allowedPath) {
      return <Navigate to={allowedPath} replace />;
    }
    return children; // ✅ cho phép render trang đó
  }

  // ❌ Nếu truyền allowRoles mà user.role không hợp lệ → redirect theo role
  if (allowRoles.length > 0 && !allowRoles.includes(user.role)) {
    if (user.role === 0) return <Navigate to="/" replace />;
    if (user.role === 1) return <Navigate to="/dieuvan" replace />;

    if (user.role === 2) return <Navigate to="/kpi" replace />;
    if (user.role === 10) return <Navigate to="/kpi" replace />;
    if (user.role === 11) return <Navigate to="/kpi" replace />;
    if (user.role === 12) return <Navigate to="/kpi" replace />;
    if (user.role === 13) return <Navigate to="/kpi" replace />;
    if (user.role === 14) return <Navigate to="/kpi" replace />;
    if (user.role === 15) return <Navigate to="/kpi" replace />;
    if (user.role === 16) return <Navigate to="/kpi" replace />;
    if (user.role === 17) return <Navigate to="/kpi" replace />;

    if (user.role === 4) return <Navigate to="/xuattra" replace />;
    
    if (user.role === 20) return <Navigate to="/phieusoan" replace />;
    if (user.role === 26) return <Navigate to="/phieusoan" replace />;

    if (user.role === 21) return <Navigate to="/phuxe" replace />;
    if (user.role === 22) return <Navigate to="/phuxe" replace />;
    if (user.role === 24) return <Navigate to="/phuxe" replace />;

    if (user.role === 23) return <Navigate to="/ttb" replace />;

    if (user.role === 25) return <Navigate to="/tonkho" replace />;


    if (user.role === 27) return <Navigate to="/chamcong" replace />;
    if (user.role === 28) return <Navigate to="/chamcong" replace />;
    if (user.role === 29) return <Navigate to="/nangsuat" replace />;


    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
