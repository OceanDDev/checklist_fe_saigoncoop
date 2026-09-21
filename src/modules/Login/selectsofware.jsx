import { useNavigate } from "react-router-dom";
import {
  Forklift,
  Truck,
  Clock,
  PackageSearch,
  ClipboardList,
  GraduationCap,
  Car,
  Box,
  ShieldCheck,
} from "lucide-react";

/**
 * Danh sách toàn bộ "phần mềm" (module) trong hệ thống.
 * - roles: các role được phép thấy card này (giữ đồng bộ với allowRoles trong App.jsx)
 * - Role 500 = Admin tổng, luôn thấy TẤT CẢ các card bất kể roles khai báo bên dưới.
 * - icon + color: chỉ phục vụ hiển thị.
 */
const MODULES = [
  {
    title: "Checklist Xe Nâng",
    desc: "Quản lý checklist xe nâng",
    path: "/checklist",
    roles: [0],
    icon: Forklift,
    color: "from-orange-400 to-amber-500",
  },
  {
    title: "Điều Vận",
    desc: "Quản lý kiện",
    path: "/dieuvan",
    roles: [1],
    icon: Truck,
    color: "from-blue-400 to-indigo-500",
  },
  {
    title: "Chấm Công",
    desc: "Chấm công QR / bảng xếp hạng",
    path: "/chamcong",
    roles: [27, 28, 30, 75],
    icon: Clock,
    color: "from-emerald-400 to-teal-500",
  },
  {
    title: "Nhập Hàng",
    desc: "Dashboard nhập hàng",
    path: "/nhaphang",
    roles: [72],
    icon: PackageSearch,
    color: "from-cyan-400 to-sky-500",
  },
  {
    title: "Quản lý phiếu soạn",
    desc: "Phiếu soạn nhân sự",
    path: "/nhansusoan",
    roles: [52, 57, 58, 76],
    icon: ClipboardList,
    color: "from-violet-400 to-purple-500",
  },
  {
    title: "Học Tập SCL",
    desc: "Nền tảng học tập nội bộ",
    path: "/learning",
    roles: [50, 51],
    icon: GraduationCap,
    color: "from-pink-400 to-rose-500",
  },
  {
    title: "Book Xe",
    desc: "Đặt lịch xe",
    path: "/bookxe",
    roles: [70],
    icon: Car,
    color: "from-red-400 to-rose-500",
  },
  {
    title: "Bao Bì",
    desc: "Quản lý bao bì",
    path: "/baobi",
    roles: [77],
    icon: Box,
    color: "from-yellow-400 to-orange-500",
  },
];

// 🖼️ Đường dẫn ảnh nền — đặt file ảnh của bạn vào thư mục /public/img/ rồi
// đổi lại tên file bên dưới cho khớp (ví dụ "/img/bg-admin.jpg").
const BACKGROUND_IMAGE = "/img/back.jpg";

export default function SelectSoftware() {
  const navigate = useNavigate();

  // Lấy thông tin user hiện tại - chỉnh lại cho đúng nơi bạn lưu (context/localStorage/redux...)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = Number(user?.role);
  const isSuperAdmin = role === 500;

  const visibleModules = isSuperAdmin
    ? MODULES
    : MODULES.filter((m) => m.roles.includes(role));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Nền ảnh mờ */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm brightness-75 scale-105"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
        aria-hidden
      />
      {/* Gradient overlay để chữ/card luôn rõ trên mọi ảnh nền */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50"
        aria-hidden
      />

      {/* Nội dung */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          {isSuperAdmin && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
              <ShieldCheck size={14} />
              Admin — Toàn quyền
            </span>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md md:text-4xl">
            Chọn phần mềm
          </h1>
        </div>

        {/* Grid — card kính mờ (glass) để nổi bật trên nền ảnh */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleModules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-6 text-left shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-2xl"
              >
                {/* Vệt gradient mờ ở góc, sáng dần khi hover */}
                <div
                  className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${m.color} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-25`}
                />

                <div
                  className={`relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>

                <h2 className="relative text-base font-bold text-slate-800">
                  {m.title}
                </h2>
                <p className="relative mt-1 text-sm text-slate-500">{m.desc}</p>

                <div className="relative mt-4 flex items-center text-xs font-semibold text-slate-400 transition-colors group-hover:text-indigo-600">
                  Mở phần mềm
                  <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {visibleModules.length === 0 && (
          <p className="mt-16 text-center text-white/90 drop-shadow">
            Tài khoản này chưa được cấp quyền vào phần mềm nào.
          </p>
        )}
      </div>
    </div>
  );
}
