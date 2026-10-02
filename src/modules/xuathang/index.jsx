// pages/xuathang/index.jsx
import { useState } from "react";
import { LayoutDashboard, Database, Award, Boxes, Truck } from "lucide-react";
import XuatHangForm from "./xuat";
import DashboardSoLuongLon from "./dash/sll";
import KpiNhanVien from "./kpi";
import DashboardXuatHang from "./dash";
import KeHoachXeForm from "./kehoachxe";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "sll", label: "Số Lượng Lớn", icon: Boxes },
  { key: "kpi", label: "KPI Nhân Viên", icon: Award },
  { key: "data", label: "Dữ Liệu", icon: Database },
  { key: "kehoachxe", label: "Kế Hoạch Xe", icon: Truck },
];

const HomeXuatHangDash = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filter được "bơm" sẵn vào bảng Dữ Liệu khi người dùng click 1 lát donut
  // bên tab Dashboard. token đổi mỗi lần click để đảm bảo bảng fetch lại
  // dù filter giống lần trước.
  const [dataInitialFilters, setDataInitialFilters] = useState(null);
  const [dataInitialFiltersToken, setDataInitialFiltersToken] = useState(0);

  // Nhận từ DashboardXuatHang khi click vào lát donut, chuyển sang tab
  // "data" và bơm filter tương ứng vào bảng dữ liệu.
  const handleNavigateFromDashboard = (params = {}) => {
    const { ma_kho, ma_ch, ma_nvc, so_bb } = params;

    const filters = {};
    if (ma_kho) filters.ma_kho = String(ma_kho);
    if (ma_ch) filters.ma_ch = String(ma_ch);
    if (ma_nvc) filters.ma_nvc = String(ma_nvc);
    if (so_bb) filters.so_bb = so_bb;

    setDataInitialFilters(filters);
    setDataInitialFiltersToken((t) => t + 1);
    setActiveTab("data");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-5">
      <div className="mx-auto w-full max-w-none">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
            Quản Lý Xuất Hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi, nhập, cập nhật và quản lý dữ liệu xuất hàng
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
            <DashboardXuatHang onNavigate={handleNavigateFromDashboard} />
          )}
          {activeTab === "sll" && <DashboardSoLuongLon />}
          {activeTab === "data" && (
            <XuatHangForm
              initialFilters={dataInitialFilters}
              initialFiltersToken={dataInitialFiltersToken}
            />
          )}
          {activeTab === "kpi" && <KpiNhanVien />}
          {activeTab === "kehoachxe" && <KeHoachXeForm />}
        </div>
      </div>
    </div>
  );
};

export default HomeXuatHangDash;
