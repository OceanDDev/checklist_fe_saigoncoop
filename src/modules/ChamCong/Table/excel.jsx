/* eslint-disable react/prop-types */
// components/chamcong/ExportChamCongMau.jsx
// Component xuất Excel theo mẫu bảng chấm công thời vụ
// Usage: <ExportChamCongMau records={data} />

import { useState } from "react";

export default function ExportChamCongMau({ records = [] }) {
  const now = new Date();

  const [open,       setOpen]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [donVi,      setDonVi]      = useState("KHO VỆ TINH BÌNH DƯƠNG");
  const [boPhan,     setBoPhan]     = useState("XUẤT HÀNG");
  const [nguoiLap,   setNguoiLap]   = useState("Nguyễn Văn Nam");
  const [phoGD,      setPhoGD]      = useState("Huỳnh Đăng Khoa");
  const [kqGD,       setKqGD]       = useState("Đỗ Xuân Thành");

  const handleExport = async () => {
    setLoading(true);
    try {
      // Lọc records theo tháng/năm đang chọn
      const filtered = records.filter((r) => {
        const d = new Date(r.ngay);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      await ExportChamCongMau(filtered, {
        year,
        month,
        donVi,
        boPhan,
        nguoiLap,
        phoGiamDoc: phoGD,
        kqGiamDoc:  kqGD,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Xuất Excel thất bại: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all";

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-xl border border-blue-500/30 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        Xuất Mẫu Chính Thức
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Xuất Bảng Chấm Công</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Theo mẫu chính thức Saigon Co.op</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">

              {/* Tháng / Năm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tháng
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={inputCls}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Năm
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={inputCls}
                    min={2020}
                    max={2099}
                  />
                </div>
              </div>

              {/* Đơn vị / Bộ phận */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Đơn vị
                </label>
                <input
                  type="text"
                  value={donVi}
                  onChange={(e) => setDonVi(e.target.value)}
                  placeholder="VD: KHO VỆ TINH BÌNH DƯƠNG"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Bộ phận
                </label>
                <input
                  type="text"
                  value={boPhan}
                  onChange={(e) => setBoPhan(e.target.value)}
                  placeholder="VD: XUẤT HÀNG"
                  className={inputCls}
                />
              </div>

              {/* Ký tên */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Ký tên
                </p>
                <div className="space-y-2.5">
                  {[
                    ["Người lập", nguoiLap, setNguoiLap],
                    ["Phó Giám đốc", phoGD, setPhoGD],
                    ["KQ. Giám đốc", kqGD, setKqGD],
                  ].map(([label, val, set]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Logic note */}
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-400 space-y-1">
                <p className="font-semibold">📌 Logic tính giờ thực tế:</p>
                <p>• Dưới 5h → giữ nguyên</p>
                <p>• Từ 5h trở lên → trừ 1h (giờ nghỉ)</p>
                <p className="opacity-70">VD: 9h làm → tính 8h | 4h làm → tính 4h</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 text-sm text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 py-3 text-sm font-bold bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">◌</span>
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <span>⬇</span>
                    Xuất Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}