/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import DinhViTable from "./table/dinhvi";
import DinhViImport from "./excel/ImportDinhVi";
import PhieuLeTable from "./table/phieule";
import DataCHTable from "./table/dataCH";
import SodaTransferDashboard from "./table/component/dashboard/DashboardTab";

const TABS = [
  { key: "dashboard", label: "Dashboard" }, // ← tab mới ở đầu
  { key: "dinhvi",    label: "Định Vị"   },
  { key: "phieule",   label: "Phiếu Soạn"  },
  { key: "dataCH",    label: "Cửa Hàng"  },
];

const PhieuSoanHome = () => {
  const [activeTab, setActiveTab] = useState("phieule"); // mặc định mở dashboard
  const dinhViTableRef  = useRef(null);
  const phieuLeTableRef = useRef(null);
  const dataCHTableRef  = useRef(null);

  // ===== Định Vị
  const handleDinhViImportSuccess = () => {
    if (dinhViTableRef.current?.fetchDinhVi) {
      dinhViTableRef.current.fetchDinhVi();
    }
  };

  const renderActions = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="text-sm text-slate-500 italic">
            Tổng quan hệ thống
          </div>
        );
      case "dinhvi":
        return <DinhViImport onImportSuccess={handleDinhViImportSuccess} />;
      case "phieule":
        return (
          <div className="text-sm text-slate-500 italic">
            Quản lý danh sách phiếu soạn
          </div>
        );
      case "dataCH":
        return (
          <div className="text-sm text-slate-500 italic">
            Quản lý thông tin cửa hàng
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    const tab = TABS.find((t) => t.key === activeTab);
    return tab ? tab.label : "Phiếu Soạn";
  };

  return (
    <div className="mx-auto max-w-9xl p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {getTitle()}
          </h1>
          <p className="text-sm text-slate-500">
            Quản lý dữ liệu {getTitle().toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {renderActions()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 w-full md:w-auto shadow-inner overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              activeTab === t.key
                ? "bg-white shadow text-slate-900"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {/* Icon nhỏ cho dashboard */}
            {t.key === "dashboard" && (
              <span className="mr-1.5">📊</span>
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "dashboard" && <SodaTransferDashboard />}

      {activeTab === "dinhvi"   && <DinhViTable  ref={dinhViTableRef}  />}
      {activeTab === "phieule"  && <PhieuLeTable ref={phieuLeTableRef} />}
      {activeTab === "dataCH"   && <DataCHTable  ref={dataCHTableRef}  />}
    </div>
  );
};

export default PhieuSoanHome;