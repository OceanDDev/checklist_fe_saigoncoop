// src/components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('user'); // hoặc kiểm tra token

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
