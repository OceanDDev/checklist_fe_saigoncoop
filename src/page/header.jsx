import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Header = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getTitleByRole = (role) => {
    switch (role) {
      case 1:
        return "TOOL ĐIỀU VẬN";
      case 2:
        return "KPIs";
      case 4:
        return "XUẤT TRẢ";
      case 20:
        return "PHIẾU SOẠN";
         case 21:
        return "PHỤ XE - BỐC XẾP";
         case 22:
        return "PHỤ XE - BỐC XẾP";
        case 23:
        return "TRANG THIẾT BỊ";
      default:
        return "CHECKLIST";
    }
  };

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50",
        "px-3 sm:px-4 py-2 sm:py-3",
        // glass base
        "backdrop-blur-md border-b",
        // transition when scroll
        "transition-colors duration-300",
        scrolled
          ? "bg-black/50 border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
          : "bg-black/25 border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center rounded-xl bg-white/40 backdrop-blur-sm
                     border border-white/50 shadow-md px-2 py-1"
        >
          <img
            src="/img/logonew.png"
            alt="Logo"
            className="h-9 sm:h-12 w-auto transition-transform duration-300 hover:scale-110
                       drop-shadow-md brightness-125 contrast-115 saturate-125"
          />
        </Link>

        {/* Title */}
        <h2 className="flex-1 text-center text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow">
          {getTitleByRole(user?.role)}
        </h2>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-xl bg-red-600/85 hover:bg-red-600 text-white font-semibold text-sm sm:text-base px-3 sm:px-5 py-1.5 sm:py-2 shadow-md hover:shadow-lg transition"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};

export default Header;
