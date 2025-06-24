import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-3 bg-white shadow border-b">
      <div className="flex items-center space-x-3">
        <Link to="/">
          <img
            src="/img/logonew.png"
            alt="Logo"
            className="h-14 w-auto transition-transform duration-300 hover:scale-110"
          />
        </Link>
      </div>

      <h2 className="text-3xl font-bold text-gray-800">CHECKLIST</h2>

      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-5 rounded shadow transition-all"
      >
        Đăng xuất
      </button>
    </header>
  );
};

export default Header;
