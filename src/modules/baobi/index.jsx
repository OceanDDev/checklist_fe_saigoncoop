// pages/baobi/index.jsx
import { useState } from "react";
import { PackagePlus, PackageMinus } from "lucide-react";
import NhapBaoBiForm from "./nhap/nhap";
import XuatBaoBiForm from "./xuat/xuat";
// import NhapBaoBiForm from "./nhap";
// import XuatBaoBiForm from "./xuat";
// import DashboardBaoBi from "./dash/dashboard";

// Các bảng con — nằm trong thư mục theo cấu trúc hiện tại của bạn.
// Chỉnh lại đường dẫn nếu tên file thực tế khác.
// import NhapBaoBiForm from "./nhap";
// import XuatBaoBiForm from "./xuat";

const TABS = [
  { key: "nhap", label: "Nhập Bao Bì", icon: PackagePlus },
  { key: "xuat", label: "Xuất Bao Bì", icon: PackageMinus },
];

const HomeBaoBiDash = () => {
  const [activeTab, setActiveTab] = useState("nhap");

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-5">
      <div className="mx-auto w-full max-w-none">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
            Quản Lý Nhập Xuất Bao Bì
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi, nhập, xuất và quản lý tồn kho bao bì
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
          {activeTab === "nhap" && <NhapBaoBiForm />}
          {activeTab === "xuat" && <XuatBaoBiForm />}
        </div>
      </div>
    </div>
  );
};

export default HomeBaoBiDash;
