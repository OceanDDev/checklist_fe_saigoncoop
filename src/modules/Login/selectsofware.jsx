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

const MODULES = [
  {
    title: "Checklist Xe Nâng",
    desc: "Quản lý và kiểm tra định kỳ xe nâng",
    path: "/checklist",
    roles: [0],
    icon: Forklift,
    color: "from-amber-400 to-orange-500",
  },
  {
    title: "Điều Vận",
    desc: "Điều phối vận tải và quản lý kiện hàng",
    path: "/dieuvan",
    roles: [1],
    icon: Truck,
    color: "from-blue-400 to-indigo-500",
  },
  {
    title: "Chấm Công",
    desc: "Chấm công quét QR và bảng xếp hạng",
    path: "/chamcong",
    roles: [27, 28, 30, 75],
    icon: Clock,
    color: "from-emerald-400 to-teal-500",
  },
  {
    title: "Nhập Hàng",
    desc: "Theo dõi và quản lý dashboard nhập hàng",
    path: "/nhaphang",
    roles: [72],
    icon: PackageSearch,
    color: "from-cyan-400 to-sky-500",
  },
  {
    title: "Quản Lý Phiếu Soạn",
    desc: "Theo dõi hiệu suất phiếu soạn nhân sự",
    path: "/nhansusoan",
    roles: [52, 57, 58, 76],
    icon: ClipboardList,
    color: "from-violet-400 to-purple-500",
  },
  {
    title: "Học Tập SCL",
    desc: "Nền tảng đào tạo và học tập nội bộ",
    path: "/learning",
    roles: [50, 51],
    icon: GraduationCap,
    color: "from-pink-400 to-rose-500",
  },
  {
    title: "Book Xe",
    desc: "Đặt lịch sử dụng xe nội bộ doanh nghiệp",
    path: "/bookxe",
    roles: [70],
    icon: Car,
    color: "from-red-400 to-rose-600",
  },
  {
    title: "Bao Bì",
    desc: "Quản lý tồn kho và cấp phát bao bì",
    path: "/baobi",
    roles: [77],
    icon: Box,
    color: "from-yellow-400 to-amber-600",
  },
];

const BACKGROUND_IMAGE = "/img/back.jpg";

export default function SelectSoftware() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = Number(user?.role);
  const isSuperAdmin = role === 500;

  const visibleModules = isSuperAdmin
    ? MODULES
    : MODULES.filter((m) => m.roles.includes(role));

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 font-sans text-slate-100 flex flex-col justify-between">
      {/* 🖼️ Ảnh nền: Chỉnh lại độ sáng vừa phải (brightness-[0.62]) */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat filter blur-[2px] brightness-[0.62] scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
        aria-hidden="true"
      />

      {/* Lớp phủ gradient: Cân bằng lại độ tối để làm nổi bật các card phía trên */}
      <div 
        className="fixed inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/80 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Nội dung chính */}
      <div 
        className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-10 flex flex-col"
        style={{ paddingTop: "calc(var(--header-h, 70px) + 16px)" }}
      >
        
        {/* Header tiêu đề khu vực chọn phần mềm */}
        <div className="mb-6 text-center">
          {isSuperAdmin && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-semibold text-blue-300 shadow-sm backdrop-blur-md">
              <ShieldCheck size={14} className="text-blue-400" />
              <span>Quản trị viên tổng — Toàn quyền truy cập</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 uppercase drop-shadow">
            Chọn Phần Mềm Làm Việc
          </h1>
          <div className="mx-auto h-0.5 w-20 bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-2"></div>
        </div>

        {/* Grid các card phần mềm */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleModules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/60 p-5 text-left shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-900/80 hover:shadow-[0_10px_25px_rgba(59,130,246,0.25)]"
              >
                {/* Hiệu ứng ánh sáng rực góc nền card khi hover */}
                <div
                  className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${m.color} opacity-15 blur-xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-30`}
                />

                {/* Icon biểu tượng */}
                <div
                  className={`relative mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                {/* Tiêu đề & Mô tả */}
                <h3 className="relative text-base font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                  {m.title}
                </h3>
                <p className="relative mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">
                  {m.desc}
                </p>

                {/* Đường dẫn mở */}
                <div className="relative mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-semibold text-slate-400">
                  <span className="group-hover:text-blue-400 transition-colors">Truy cập</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1 text-blue-400">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Trạng thái trống nếu chưa có phân hệ nào */}
        {visibleModules.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center backdrop-blur-xl my-12">
            <p className="text-sm font-medium text-slate-300">
              Tài khoản này chưa được cấp quyền truy cập vào phần mềm nào.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng liên hệ Admin để được hỗ trợ phân quyền.
            </p>
          </div>
        )}
      </div>

      {/* Footer nhỏ phía dưới */}
      <footer className="relative z-10 py-3 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-950/40 backdrop-blur-md">
        <span>SC Logistics &copy; {new Date().getFullYear()} — Internal Portal</span>
      </footer>
    </div>
  );
}