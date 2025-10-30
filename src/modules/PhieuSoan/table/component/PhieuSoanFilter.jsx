/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

/* Debounced input */
const DebouncedInput = ({ value, onChange, delay = 350, className = "", ...props }) => {
  const [inner, setInner] = useState(value ?? "");
  useEffect(() => setInner(value ?? ""), [value]);
  useEffect(() => {
    const t = setTimeout(() => onChange?.(inner), delay);
    return () => clearTimeout(t);
  }, [inner, delay, onChange]);

  return (
    <input
      {...props}
      value={inner}
      onChange={(e) => setInner(e.target.value)}
      className={[
        "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3",
        "text-sm placeholder:text-slate-400",
        "focus:bg-white focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40",
        "transition-colors",
        className,
      ].join(" ")}
    />
  );
};

const PillButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={[
      "h-9 px-3 rounded-md text-sm font-medium transition-all",
      active
        ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/50"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
    ].join(" ")}
  >
    {children}
  </button>
);

const Label = ({ children }) => (
  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
    {children}
  </span>
);

const BaseInput = (props) => (
  <input
    {...props}
    className={[
      "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3",
      "text-sm placeholder:text-slate-400",
      "focus:bg-white focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40",
      "transition-colors",
      props.className || "",
    ].join(" ")}
  />
);

const BaseSelect = (props) => (
  <select
    {...props}
    className={[
      "h-10 w-full rounded-lg border border-slate-200 bg-white px-3",
      "text-sm",
      "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40",
      "transition-colors",
      props.className || "",
    ].join(" ")}
  />
);

const PhieuSoanFilter = ({
  // Date filters
  dateRangePreset,
  setDateRangePreset,
  tuNgay,
  setTuNgay,
  denNgay,
  setDenNgay,

  // Other filters
  trangThai,
  setTrangThai,
  chanLe,
  setChanLe,
  store,
  setStore,
  phieuSoanId,
  setPhieuSoanId,
  search,
  setSearch,

  // New advanced filters
  maNCC,
  setMaNCC,
  maNH,
  setMaNH,
  Dept,
  setDept,
  SubDept,
  setSubDept,

  // Actions
  setPage,
  resetFilters,
}) => {
  const handleDateRangePreset = (preset) => {
    setDateRangePreset(preset);
    setPage(1);
    if (preset === "custom") return;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    let from = todayStr, to = todayStr;
    if (preset === "3days") {
      const t = new Date(today); t.setDate(today.getDate() - 2);
      from = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    }
    if (preset === "7days") {
      const t = new Date(today); t.setDate(today.getDate() - 6);
      from = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    }
    if (preset === "30days") {
      const t = new Date(today); t.setDate(today.getDate() - 29);
      from = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    }
    setTuNgay(from);
    setDenNgay(to);
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm md:p-5 space-y-4">
      {/* Date Range */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {/* calendar icon */}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>
            </svg>
          </span>
          <span className="text-sm font-semibold text-slate-700">Thời gian</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: "today", label: "Hôm nay" },
            { value: "3days", label: "3 ngày" },
            { value: "7days", label: "7 ngày" },
            { value: "30days", label: "30 ngày" },
            { value: "custom", label: "Tùy chỉnh" },
          ].map((p) => (
            <PillButton
              key={p.value}
              active={dateRangePreset === p.value}
              onClick={() => handleDateRangePreset(p.value)}
            >
              {p.label}
            </PillButton>
          ))}
        </div>

        {/* Current range */}
        {tuNgay && denNgay && (
          <div className="mt-2 text-xs text-slate-600">
            Đang lọc: <span className="font-medium">{tuNgay}</span> &rarr;{" "}
            <span className="font-medium">{denNgay}</span>
          </div>
        )}
      </div>

      {dateRangePreset === "custom" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Từ ngày</Label>
            <BaseInput
              type="date"
              value={tuNgay}
              onChange={(e) => { setTuNgay(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <Label>Đến ngày</Label>
            <BaseInput
              type="date"
              value={denNgay}
              onChange={(e) => { setDenNgay(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
        {/* Col spans tuned for desktop */}
        <div className="col-span-2 md:col-span-2">
          <Label>Trạng thái</Label>
          <BaseSelect
            value={trangThai}
            onChange={(e) => { setTrangThai(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả</option>
            <option value="false">⏳ Chờ xử lý</option>
            <option value="true">✅ Hoàn thành</option>
          </BaseSelect>
        </div>

        <div className="col-span-2 md:col-span-2">
          <Label>Chẵn / Lẻ</Label>
          <BaseSelect
            value={chanLe}
            onChange={(e) => { setChanLe(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả</option>
            <option value="Chẵn">📦 Chẵn</option>
            <option value="Lẻ">📦 Lẻ</option>
          </BaseSelect>
        </div>

        <div className="col-span-2 md:col-span-2">
          <Label>Mã CH</Label>
          <BaseInput
            value={store}
            placeholder="VD: CH00264"
            onChange={(e) => { setStore(e.target.value); setPage(1); }}
          />
        </div>

        <div className="col-span-2 md:col-span-3">
          <Label>Mã phiếu soạn</Label>
          <BaseInput
            value={phieuSoanId}
            placeholder="STORE-C/L-DDMMYYYY"
            onChange={(e) => { setPhieuSoanId(e.target.value); setPage(1); }}
          />
        </div>

        <div className="col-span-2 md:col-span-3">
          <Label>Tìm tên / SKU</Label>
          <BaseInput
            value={search}
            placeholder="Nhập tên SP hoặc SKU…"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Advanced 4 fields */}
        <div className="col-span-2 md:col-span-3">
          <Label>MaNCC</Label>
          <DebouncedInput value={maNCC} onChange={setMaNCC} placeholder="Tìm MaNCC…" />
        </div>

        <div className="col-span-2 md:col-span-3">
          <Label>MaNH</Label>
          <DebouncedInput value={maNH} onChange={setMaNH} placeholder="Tìm MaNH…" />
        </div>

        <div className="col-span-2 md:col-span-3">
          <Label>Dept</Label>
          <DebouncedInput value={Dept} onChange={setDept} placeholder="Tìm Dept…" />
        </div>

        <div className="col-span-2 md:col-span-3">
          <Label>SubDept</Label>
          <DebouncedInput value={SubDept} onChange={setSubDept} placeholder="Tìm SubDept…" />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={resetFilters}
          className={[
            "inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2",
            "text-sm font-semibold text-slate-700",
            "hover:bg-slate-200 active:bg-slate-300",
            "border border-slate-200 shadow-sm",
          ].join(" ")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Làm mới
        </button>
      </div>
    </div>
  );
};

export default PhieuSoanFilter;
