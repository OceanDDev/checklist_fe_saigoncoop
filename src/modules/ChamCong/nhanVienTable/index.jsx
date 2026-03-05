/* eslint-disable react/prop-types */
// pages/chamcong/FormCheck.jsx
import { nhanVienService } from "@/services/nhanvien.service";
import { useState, useEffect, useCallback } from "react";
import ImportNhanVien from "./importNhanVien";

// ─── Modal Thêm / Sửa ────────────────────────────────────────────────────────
const NhanVienModal = ({ editData, onClose, onSaved }) => {
  const isEdit = !!editData;
  const [form, setForm] = useState({
    ma_nhan_vien: editData?.ma_nhan_vien || "",
    ten_nhan_vien: editData?.ten_nhan_vien || "",
    bo_phan: editData?.bo_phan || "",
    chuc_vu: editData?.chuc_vu || "",
    email: editData?.email || "",
    so_dien_thoai: editData?.so_dien_thoai || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.ma_nhan_vien || !form.ten_nhan_vien || !form.bo_phan) {
      setError("Vui lòng điền đầy đủ mã, tên, bộ phận");
      return;
    }
    setLoading(true);
    try {
      if (isEdit) await nhanVienService.capNhat(editData._id, form);
      else await nhanVienService.themNhanVien(form);
      onSaved();
    } catch (e) {
      setError(e?.response?.data?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all";
  const labelCls =
    "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-foreground">
            {isEdit ? "Sửa Nhân Viên" : "Thêm Nhân Viên"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mã NV *</label>
              <input
                value={form.ma_nhan_vien}
                onChange={set("ma_nhan_vien")}
                placeholder="NV001"
                disabled={isEdit}
                className={`${inputCls} ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className={labelCls}>Bộ Phận *</label>
              <input
                value={form.bo_phan}
                onChange={set("bo_phan")}
                placeholder="Kỹ Thuật"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tên Nhân Viên *</label>
            <input
              value={form.ten_nhan_vien}
              onChange={set("ten_nhan_vien")}
              placeholder="Nguyễn Văn A"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Chức Vụ</label>
              <input
                value={form.chuc_vu}
                onChange={set("chuc_vu")}
                placeholder="Nhân viên"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Số Điện Thoại</label>
              <input
                value={form.so_dien_thoai}
                onChange={set("so_dien_thoai")}
                placeholder="0909..."
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={set("email")}
              placeholder="nv@company.com"
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-2.5">
            ⚠ {error}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:border-ring hover:text-foreground transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang lưu..." : isEdit ? "Cập Nhật" : "Thêm Mới"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Import ─────────────────────────────────────────────────────────────
const ImportModal = ({ onClose, onDone }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
    <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-foreground">
          Import Nhân Viên
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-lg"
        >
          ✕
        </button>
      </div>
      <ImportNhanVien onDone={onDone} />
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NhanVienTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | "import" | <rowObj>

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nhanVienService.getDanhSach();
      setData(res?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.ma_nhan_vien?.toLowerCase().includes(q) ||
      r.ten_nhan_vien?.toLowerCase().includes(q) ||
      r.bo_phan?.toLowerCase().includes(q)
    );
  });

  const handleToggle = async (id) => {
    try {
      await nhanVienService.toggleActive(id);
      fetchData();
    } catch {
      alert("Thao tác thất bại");
    }
  };

  const handleDelete = async (id, ten) => {
    if (!window.confirm(`Xóa nhân viên "${ten}"?`)) return;
    try {
      await nhanVienService.xoa(id);
      fetchData();
    } catch {
      alert("Xóa thất bại");
    }
  };

  const closeModal = () => setModal(null);
  const afterSave = () => {
    closeModal();
    fetchData();
  };
  const afterImport = () => {
    closeModal();
    fetchData();
  };

  const th =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-4 bg-muted/40 border-b border-border text-left whitespace-nowrap";
  const td = "px-5 py-4 text-sm border-b border-border/50 align-middle";

  return (
    <>
      {/* Modal thêm / sửa */}
      {(modal === "add" || (modal && modal !== "import")) && (
        <NhanVienModal
          editData={modal === "add" ? null : modal}
          onClose={closeModal}
          onSaved={afterSave}
        />
      )}

      {/* Modal import */}
      {modal === "import" && (
        <ImportModal onClose={closeModal} onDone={afterImport} />
      )}

      <div className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Whitelist Nhân Viên
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Chỉ nhân viên trong danh sách mới được chấm công
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal("import")}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted/60 text-foreground text-sm font-semibold rounded-xl transition-colors"
            >
              <span>📥</span>
              <span>Import</span>
            </button>
            <button
              onClick={() => setModal("add")}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-xl transition-colors"
            >
              + Thêm Nhân Viên
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm mã / tên / bộ phận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {/* Table Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Danh sách nhân viên
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {filtered.length} nhân viên
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Mã NV</th>
                  <th className={th}>Tên Nhân Viên</th>
                  <th className={th}>Bộ Phận</th>
                  <th className={th}>Chức Vụ</th>
                  <th className={th}>Số ĐT</th>
                  <th className={th}>Trạng Thái</th>
                  <th className={`${th} text-center`}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-16 text-sm text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="animate-spin">◌</span> Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-16 text-sm text-muted-foreground"
                    >
                      <div className="text-4xl mb-3 opacity-30">👥</div>
                      Chưa có nhân viên nào
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr
                      key={r._id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td
                        className={`${td} text-muted-foreground text-xs font-mono`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className={td}>
                        <span className="font-mono text-sm font-semibold text-emerald-400 bg-emerald-500/8 px-2 py-0.5 rounded-md">
                          {r.ma_nhan_vien}
                        </span>
                      </td>
                      <td className={`${td} font-medium text-foreground`}>
                        {r.ten_nhan_vien}
                      </td>
                      <td className={`${td} text-muted-foreground`}>
                        {r.bo_phan}
                      </td>
                      <td className={`${td} text-muted-foreground`}>
                        {r.chuc_vu || "—"}
                      </td>
                      <td
                        className={`${td} font-mono text-sm text-muted-foreground`}
                      >
                        {r.so_dien_thoai || "—"}
                      </td>
                      <td className={td}>
                        {r.active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Bị khóa
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-center`}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setModal(r)}
                            className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:border-ring hover:text-foreground transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleToggle(r._id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              r.active
                                ? "text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15"
                                : "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15"
                            }`}
                          >
                            {r.active ? "Khóa" : "Mở"}
                          </button>
                          <button
                            onClick={() => handleDelete(r._id, r.ten_nhan_vien)}
                            className="px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 bg-destructive/5 rounded-lg hover:bg-destructive/15 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
