import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")); // lấy user từ localStorage

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-white shadow border-b">
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <img
          src="/img/logonew.png"
          alt="Logo"
          className="h-10 sm:h-14 w-auto transition-transform duration-300 hover:scale-110"
        />
      </Link>

      {/* Tiêu đề thay đổi theo role */}
      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 text-center flex-1">
        {user?.role === 1 ? "TOOL ĐIỀU VẬN" : "CHECKLIST"}
      </h2>

      {/* Nút logout */}
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm sm:text-base py-1.5 sm:py-2 px-3 sm:px-5 rounded shadow transition-all"
      >
        Đăng xuất
      </button>
    </header>
  );
};

export default Header;
