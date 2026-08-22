// pages/nhaphang/index.jsx
import { useState } from "react";
import {
  LayoutDashboard,
  PackagePlus,
  List,
  ClipboardCheck,
} from "lucide-react";
import NhapHangForm from "./kiennhap";
import LetForm from "./let";
import QcDacThuForm from "./qcdacthu";
import DashboardNhapHang from "./dash/dashboard";

// Các bảng con — nằm trong các thư mục theo đúng cấu trúc hiện tại của bạn.
// Chỉnh lại đường dẫn nếu tên file thực tế khác.
// import CapNhatNhapHang from "./put";
// import DanhSachNhapHang from "./list";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "nhap", label: "Nhập", icon: PackagePlus },
  { key: "let", label: "Let", icon: List },
  { key: "qcdacthu", label: "QC Đặc Thù", icon: ClipboardCheck },
];

const HomeNhapHangDash = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filter được "bơm" sẵn vào bảng Nhập khi người dùng click 1 lát donut
  // Nhập Hàng / Put Hàng bên tab Dashboard (vd: { vi_tri: "RZ" } cho "Chưa put").
  // token đổi mỗi lần click để đảm bảo bảng fetch lại dù filter giống lần trước.
  const [nhapInitialFilters, setNhapInitialFilters] = useState(null);
  const [nhapInitialFiltersToken, setNhapInitialFiltersToken] = useState(0);

  // Tương tự cho tab Let — bơm filter khi click donut Let Hàng bên Dashboard.
  const [letInitialFilters, setLetInitialFilters] = useState(null);
  const [letInitialFiltersToken, setLetInitialFiltersToken] = useState(0);

  // Nhận từ DashboardNhapHang khi click vào lát donut. Mỗi section trong
  // Dashboard gửi kèm `tab` ("nhap" hoặc "let") để biết chuyển đúng tab nào
  // và bơm filter vào đúng bảng dữ liệu tương ứng — tránh việc donut của
  // Let Hàng bị điều hướng nhầm qua bảng Nhập.
  const handleNavigateFromDashboard = (params = {}) => {
    const { tab, viTri, kho, trang_thai } = params;

    if (tab === "let") {
      const filters = {};
      if (trang_thai) filters.trang_thai = trang_thai;
      if (kho) filters.kho = String(kho);

      setLetInitialFilters(filters);
      setLetInitialFiltersToken((t) => t + 1);
      setActiveTab("let");
      return;
    }

    // mặc định (tab === "nhap"): donut Nhập Hàng hoặc Put Hàng, cùng dùng
    // chung bảng dữ liệu loai_hinh "Nhập"
    const filters = {};
    if (viTri) filters.vi_tri = viTri;
    if (kho) filters.kho = String(kho);

    setNhapInitialFilters(filters);
    setNhapInitialFiltersToken((t) => t + 1);
    setActiveTab("nhap");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-5">
      <div className="mx-auto w-full max-w-none">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
            Quản Lý Nhập Hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi, nhập, cập nhật và quản lý dữ liệu nhập hàng
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {activeTab === "dashboard" && (
            <DashboardNhapHang onNavigate={handleNavigateFromDashboard} />
          )}
          {activeTab === "nhap" && (
            <NhapHangForm
              initialFilters={nhapInitialFilters}
              initialFiltersToken={nhapInitialFiltersToken}
            />
          )}
          {/* {activeTab === "put" && <CapNhatNhapHang />} */}
          {activeTab === "let" && (
            <LetForm
              initialFilters={letInitialFilters}
              initialFiltersToken={letInitialFiltersToken}
            />
          )}
          {activeTab === "qcdacthu" && <QcDacThuForm />}
        </div>
      </div>
    </div>
  );
};

export default HomeNhapHangDash;
