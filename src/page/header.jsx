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
    const roles = {
      1: "TOOL ĐIỀU VẬN",
      2: "KPIs",
      10: "KPIs",
      11: "KPIs",
      12: "KPIs",
      13: "KPIs",
      14: "KPIs",
      15: "KPIs",
      16: "KPIs",
      17: "KPIs",
      4: "XUẤT TRẢ",
      20: "PHIẾU SOẠN",
      21: "PHỤ XE - BỐC XẾP",
      22: "PHỤ XE - BỐC XẾP",
      23: "TRANG THIẾT BỊ",
      25: "TỒN KHO",
      27: "CHẤM CÔNG",
    };
    return roles[role] || "CHECKLIST";
  };

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50",
        "px-3 sm:px-6 py-2 sm:py-3",
        "transition-all duration-300 border-b",
        scrolled
          ? "bg-slate-900/95 backdrop-blur-md border-blue-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          : "bg-slate-800 border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 relative">
        {/* LOGO NỔI BẬT */}
        <Link
          to="/"
          className="group relative flex items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
        >
          {/* Lớp nền phát sáng phía sau */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 opacity-30 blur group-hover:opacity-60 transition duration-300"></div>

          <img
            src="/img/logonew.png"
            alt="Logo"
            className="relative h-10 sm:h-14 w-auto object-contain transition-transform"
          />
        </Link>

        {/* TIÊU ĐỀ */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-sm uppercase">
            {getTitleByRole(user?.role)}
          </h2>
          <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-transparent rounded-full mt-1 hidden sm:block"></div>
        </div>

        {/* NÚT ĐĂNG XUẤT */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-red-500 text-slate-100 font-bold text-xs sm:text-sm px-5 py-2.5 border border-slate-600 transition-all shadow-md active:scale-95"
        >
          <span>ĐĂNG XUẤT</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
