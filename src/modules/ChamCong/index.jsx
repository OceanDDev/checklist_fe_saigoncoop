/* eslint-disable react/prop-types */
// pages/chamcong/ChamCongPage.jsx
import { useState } from "react";
import NhanVienTable from "./nhanVienTable";
import ChamCongTable from "./Table";

const ROLE_FULL = 28; // thấy cả 2 tab
const ROLE_NV = 27; // chỉ thấy dữ liệu chấm công
const ROLE_NGOC_PHU = 30; // như 27 nhưng chỉ thấy bộ phận Ngọc Phú

function getRoleFromStorage() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role ?? null;
  } catch {
    return null;
  }
}

export default function ChamCongPage() {
  const role = getRoleFromStorage();

  const canSeeChamCong =
    role === ROLE_FULL || role === ROLE_NV || role === ROLE_NGOC_PHU;
  const canSeeNhanVien = role === ROLE_FULL;

  const [tab, setTab] = useState(canSeeChamCong ? "chamcong" : "nhanvien");

  // Không có quyền gì cả
  if (!canSeeChamCong && !canSeeNhanVien) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl opacity-30">🔒</div>
          <p className="text-muted-foreground text-sm">
            Bạn không có quyền truy cập trang này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b-2 border-border bg-card px-6 sm:px-8">
        <div className="flex gap-1">
          {canSeeChamCong && (
            <TabBtn
              active={tab === "chamcong"}
              onClick={() => setTab("chamcong")}
              label="Dữ Liệu Chấm Công"
              icon="⏱"
            />
          )}
          {canSeeNhanVien && (
            <TabBtn
              active={tab === "nhanvien"}
              onClick={() => setTab("nhanvien")}
              label="Whitelist Nhân Viên"
              icon="👥"
            />
          )}
        </div>
      </div>
      {tab === "chamcong" && canSeeChamCong && <ChamCongTable role={role} />}{" "}
      {tab === "nhanvien" && canSeeNhanVien && <NhanVienTable />}
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
