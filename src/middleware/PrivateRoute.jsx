// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ children, allowRoles = [] }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // ❌ Nếu chưa login → chuyển về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ⚠️ Ép kiểu về Number để tránh lỗi so sánh khi role được lưu dạng string ("500" !== 500)
  const role = Number(user.role);

  // Nếu role = 3 → chỉ được vào đúng 1 link duy nhất
  if (role === 3) {
    const allowedPath = "/checklistform/68672ef4c68c3523675f210c";
    if (window.location.pathname !== allowedPath) {
      return <Navigate to={allowedPath} replace />;
    }
    return children; // ✅ cho phép render trang đó
  }

  // ✅ Role 500 = Admin tổng, bypass mọi allowRoles, vào được TẤT CẢ các trang
  if (role === 500) {
    return children;
  }

  // ❌ Nếu truyền allowRoles mà role không hợp lệ → redirect theo role
  if (allowRoles.length > 0 && !allowRoles.includes(role)) {
    if (role === 0) return <Navigate to="/" replace />;
    if (role === 1) return <Navigate to="/dieuvan" replace />;

    if (role === 2) return <Navigate to="/kpi" replace />;
    if (role === 10) return <Navigate to="/kpi" replace />;
    if (role === 11) return <Navigate to="/kpi" replace />;
    if (role === 12) return <Navigate to="/kpi" replace />;
    if (role === 13) return <Navigate to="/kpi" replace />;
    if (role === 14) return <Navigate to="/kpi" replace />;
    if (role === 15) return <Navigate to="/kpi" replace />;
    if (role === 16) return <Navigate to="/kpi" replace />;
    if (role === 17) return <Navigate to="/kpi" replace />;

    if (role === 4) return <Navigate to="/xuattra" replace />;

    if (role === 19) return <Navigate to="/phieusoan" replace />;
    if (role === 20) return <Navigate to="/phieusoan" replace />;
    if (role === 26) return <Navigate to="/phieusoan" replace />;
    if (role === 52) return <Navigate to="/nhansusoan" replace />;
    if (role === 57) return <Navigate to="/nhansusoan" replace />;
    if (role === 58) return <Navigate to="/nhansusoan" replace />;
    if (role === 76) return <Navigate to="/nhansusoan" replace />;

    if (role === 21) return <Navigate to="/phuxe" replace />;
    if (role === 22) return <Navigate to="/phuxe" replace />;
    if (role === 24) return <Navigate to="/phuxe" replace />;

    if (role === 23) return <Navigate to="/ttb" replace />;

    if (role === 25) return <Navigate to="/tonkho" replace />;

    if (role === 27) return <Navigate to="/chamcong" replace />;
    if (role === 28) return <Navigate to="/chamcong" replace />;
    if (role === 30) return <Navigate to="/chamcong" replace />;
    if (role === 75) return <Navigate to="/chamcong" replace />;

    if (role === 29) return <Navigate to="/nangsuat" replace />;

    if (role === 50) return <Navigate to="/learning" replace />;
    if (role === 51) return <Navigate to="/learning" replace />;

    if (role === 55) return <Navigate to="/quanlyhd" replace />;

    if (role === 56) return <Navigate to="/trangthietbi" replace />;

    if (role === 70) return <Navigate to="/bookxe" replace />;

    if (role === 71) return <Navigate to="/khuyenmai" replace />;

    if (role === 72) return <Navigate to="/nhaphang" replace />;

    if (role === 73) return <Navigate to="/baotai" replace />;
    if (role === 74) return <Navigate to="/baotai" replace />;

    if (role === 77) return <Navigate to="/baobi" replace />;

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
