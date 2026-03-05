/* eslint-disable react/prop-types */
// pages/chamcong/ChamCongPage.jsx
import { useState } from "react";
import NhanVienTable from "./nhanVienTable";
import ChamCongTable from "./Table";

export default function ChamCongPage() {
  const [tab, setTab] = useState("chamcong");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Tab Bar */}
      <div className="border-b-2 border-border bg-card px-6 sm:px-8">
        <div className="flex gap-1">
          <TabBtn
            active={tab === "chamcong"}
            onClick={() => setTab("chamcong")}
            label="Dữ Liệu Chấm Công"
            icon="⏱"
          />
          <TabBtn
            active={tab === "nhanvien"}
            onClick={() => setTab("nhanvien")}
            label="Whitelist Nhân Viên"
            icon="👥"
          />
        </div>
      </div>

      {tab === "chamcong" ? <ChamCongTable /> : <NhanVienTable />}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2.5 px-6 py-4
        text-sm font-semibold tracking-wide
        border-b-2 -mb-0.5 transition-all duration-150
        ${
          active
            ? "border-emerald-400 text-emerald-400 bg-emerald-400/5"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }
      `}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}