/* eslint-disable react/prop-types */
import { useMemo, useState, useEffect } from "react";
import { formkpistaffService } from "@/services/formkpistaff.service";

const emptyKPI = () => ({
  ky_hieu: "",
  kpi: "",
  ty_trong: 0,
  so_loi: 100, // Thêm trường mới
  noi_dung_loi: "", // Thêm trường mới
  don_vi_tinh: "",
  da_thuc_hien: "",
  ke_hoach_quy: "",
  chu_ki: "",
  cac_do_luong: "",
  bp_theo_doi: "" // Thêm trường mới
});

const AddStaffWithKPIModal = ({ selectedYear, onClose, onCreated }) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Chọn tháng theo logic giống bảng của bạn
  const defaultMonth = useMemo(() => {
    if (selectedYear > currentYear) return 1;
    if (selectedYear < currentYear) return 12;
    return currentMonth;
  }, [selectedYear, currentYear, currentMonth]);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ma_nhan_vien: "",
    ho_ten: "",
    don_vi: "",
    thang: defaultMonth,
    nam: selectedYear,
    kpis: [emptyKPI()],
  });

  // Nếu selectedYear đổi khi modal đang mở, đồng bộ tháng/năm
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      thang: defaultMonth,
      nam: selectedYear,
    }));
  }, [defaultMonth, selectedYear]);

  const addRow = () => setForm((p) => ({ ...p, kpis: [...p.kpis, emptyKPI()] }));
  const removeRow = (idx) =>
    setForm((p) => ({ ...p, kpis: p.kpis.filter((_, i) => i !== idx) }));

  const updateField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const updateKPI = (idx, key, val) =>
    setForm((p) => {
      const next = [...p.kpis];
      next[idx] = { ...next[idx], [key]: val };
      return { ...p, kpis: next };
    });

  const validate = () => {
    if (!form.ma_nhan_vien.trim()) return "Vui lòng nhập Mã NV";
    if (!form.ho_ten.trim()) return "Vui lòng nhập Họ tên";
    if (!form.don_vi.trim()) return "Vui lòng nhập Bộ phận";
    if (!form.thang || !form.nam) return "Thiếu tháng/năm";
    // Tối thiểu 1 KPI; tỷ trọng không âm
    for (const [i, r] of form.kpis.entries()) {
      if (!r.kpi.trim()) return `Dòng KPI #${i + 1}: thiếu tên KPI`;
      if (Number(r.ty_trong) < 0) return `Dòng KPI #${i + 1}: tỷ trọng không hợp lệ`;
      if (Number(r.so_loi) < 0 || Number(r.so_loi) > 100) return `Dòng KPI #${i + 1}: số lỗi phải từ 0-100`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    try {
      setSubmitting(true);
      // API create form KPI cho 1 tháng/năm
      const payload = {
        ma_nhan_vien: form.ma_nhan_vien.trim(),
        ho_ten: form.ho_ten.trim(),
        don_vi: form.don_vi.trim(),
        thang: Number(form.thang),
        nam: Number(form.nam),
        kpis: form.kpis.map((r) => ({
          ky_hieu: (r.ky_hieu || "").trim(),
          kpi: (r.kpi || "").trim(),
          ty_trong: Number(r.ty_trong) || 0,
          so_loi: Number(r.so_loi) || 100,
          noi_dung_loi: (r.noi_dung_loi || "").trim(),
          ty_trong_cuoi: Number(r.ty_trong_cuoi) || 0,
          don_vi_tinh: (r.don_vi_tinh || "").trim(),
          da_thuc_hien: (r.da_thuc_hien || "").trim(),
          ke_hoach_quy: (r.ke_hoach_quy || "").trim(),
          chu_ki: (r.chu_ki || "").trim(),
          nv_danh_gia: (r.nv_danh_gia || "").trim(),
          cac_do_luong: (r.cac_do_luong || "").trim(),
          bp_theo_doi: (r.bp_theo_doi || "").trim(),
        })),
      };

      await formkpistaffService.createFormKPI(payload);

      // Thành công
      if (typeof onCreated === "function") onCreated();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Tạo Form KPI thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-7xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Thêm nhân viên + KPI</h3>
            <p className="text-xs text-slate-500">Khởi tạo Form KPI cho tháng/năm đã chọn</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Staff info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mã NV</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={form.ma_nhan_vien}
                onChange={(e) => updateField("ma_nhan_vien", e.target.value)}
                placeholder="VD: TV0870"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ tên</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={form.ho_ten}
                onChange={(e) => updateField("ho_ten", e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bộ phận</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                value={form.don_vi}
                onChange={(e) => updateField("don_vi", e.target.value)}
                placeholder="Kế Toán"
              />
            </div>
          </div>

          {/* KPI rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Danh sách KPI</h4>
              <button
                onClick={addRow}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm shadow"
              >
                <span>➕</span> Thêm dòng
              </button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-100 rounded-lg">
              <div className="col-span-1">Ký hiệu</div>
              <div className="col-span-2">Tên KPI</div>
              <div className="col-span-1">Tỷ trọng</div>
              <div className="col-span-1">Số lỗi</div>
              <div className="col-span-1">TT cuối</div>
              <div className="col-span-1">ĐVT</div>
              <div className="col-span-1">Đã TH</div>
              <div className="col-span-1">KH quý</div>
              <div className="col-span-1">Chu kỳ</div>
              <div className="col-span-1">NV ĐG</div>
              <div className="col-span-1">Actions</div>
            </div>

            <div className="space-y-2">
              {form.kpis.map((row, idx) => (
                <div key={idx} className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  {/* First row of inputs */}
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="F1"
                      value={row.ky_hieu}
                      onChange={(e) => updateKPI(idx, "ky_hieu", e.target.value)}
                    />
                    <input
                      className="col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Tên KPI"
                      value={row.kpi}
                      onChange={(e) => updateKPI(idx, "kpi", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="5"
                      value={row.ty_trong}
                      onChange={(e) => updateKPI(idx, "ty_trong", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="100"
                      value={row.so_loi}
                      onChange={(e) => updateKPI(idx, "so_loi", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="5"
                      value={row.ty_trong_cuoi}
                      onChange={(e) => updateKPI(idx, "ty_trong_cuoi", e.target.value)}
                    />
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="%"
                      value={row.don_vi_tinh}
                      onChange={(e) => updateKPI(idx, "don_vi_tinh", e.target.value)}
                    />
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="100"
                      value={row.da_thuc_hien}
                      onChange={(e) => updateKPI(idx, "da_thuc_hien", e.target.value)}
                    />
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Kế hoạch"
                      value={row.ke_hoach_quy}
                      onChange={(e) => updateKPI(idx, "ke_hoach_quy", e.target.value)}
                    />
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Tháng"
                      value={row.chu_ki}
                      onChange={(e) => updateKPI(idx, "chu_ki", e.target.value)}
                    />
                    <input
                      className="col-span-1 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="5"
                      value={row.nv_danh_gia}
                      onChange={(e) => updateKPI(idx, "nv_danh_gia", e.target.value)}
                    />
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => removeRow(idx)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        disabled={form.kpis.length === 1}
                        title={form.kpis.length === 1 ? "Cần ít nhất 1 dòng KPI" : "Xóa dòng"}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Second row - longer fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Các đo lường</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Tỷ lệ thực hiện Doanh số toàn Liên hiệp"
                        value={row.cac_do_luong}
                        onChange={(e) => updateKPI(idx, "cac_do_luong", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Bộ phận theo dõi</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Liên hiệp"
                        value={row.bp_theo_doi}
                        onChange={(e) => updateKPI(idx, "bp_theo_doi", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nội dung lỗi</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Mô tả lỗi (nếu có)"
                        value={row.noi_dung_loi}
                        onChange={(e) => updateKPI(idx, "noi_dung_loi", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Đang tạo..." : "Tạo Form KPI"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStaffWithKPIModal;