import { useState } from "react";
import { Truck, History } from "lucide-react";

// Các bảng con — nằm trong 2 thư mục theo đúng cấu trúc hiện tại của bạn.
// (Giả định mỗi thư mục có 1 index.jsx export component bảng tương ứng;
// chỉnh lại đường dẫn nếu tên file thực tế khác.)
import BookXeTable from "./book";
import HistoryBookXeTable from "./history";

const TABS = [
  { key: "bookxe", label: "Book Xe", icon: Truck },
  { key: "history", label: "Lịch Sử", icon: History },
];

const HomeBookXe = () => {
  const [activeTab, setActiveTab] = useState("bookxe");

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-5">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
            Quản Lý Book Xe
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi và quản lý các phiếu book xe cùng lịch sử điều động
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
          {activeTab === "bookxe" && <BookXeTable />}
          {activeTab === "history" && <HistoryBookXeTable />}
        </div>
      </div>
    </div>
  );
};

export default HomeBookXe;
