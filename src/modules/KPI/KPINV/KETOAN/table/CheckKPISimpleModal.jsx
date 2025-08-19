/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { formkpistaffService } from "@/services/formkpistaff.service";
import { checkKPIService } from "@/services/checkkpistaff.service";

// Chuẩn hoá KPI items từ Form KPI
const mapFormToEditable = (rec) =>
  (rec?.kpis ?? []).map((it) => ({
    _id: it?._id,
    kpi: it?.kpi ?? "",
    ty_trong: it?.ty_trong ?? 0,
    loi: { so_loi: 0, noi_dung: "" },
  }));

// Chọn bản ghi Form KPI mới nhất
const pickNewestIndex = (arr) => {
  if (!arr?.length) return 0;
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    const a = arr[best], b = arr[i];
    const an = Number(a?.nam || 0), bn = Number(b?.nam || 0);
    const at = Number(a?.thang || 0), bt = Number(b?.thang || 0);
    if (bn > an || (bn === an && bt > at)) best = i;
  }
  return best;
};

// Unwrap mọi dạng response từ service
const unwrapForms = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.success === false) {
    // ném lỗi để UI hiển thị message của BE
    const err = new Error(res.message || "Không tìm thấy Form KPI");
    err._isBackendMsg = true;
    throw err;
  }
  return [];
};

const CheckKPISimpleModal = ({ onClose, onSaved }) => {
  const [codeInput, setCodeInput] = useState("");
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");

  const [formRecord, setFormRecord] = useState(null);   // 1 Form KPI
  const [formKpis, setFormKpis] = useState([]);         // KPI để nhập lỗi
  const [monthInput, setMonthInput] = useState(new Date().getMonth() + 1);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleFind = async () => {
    setFindError("");
    const code = codeInput.trim();
    if (!code) {
      setFindError("Vui lòng nhập mã nhân viên.");
      return;
    }
    setFinding(true);
    try {
      // 1) thử lấy đúng tháng/năm đang chọn
      let list = await formkpistaffService.getAllFormKPI({
        ma_nhan_vien: code,
        thang: monthInput,
        nam: currentYear,
      });
      let arr = unwrapForms(list);

      // 2) nếu không có -> fallback: lấy tất cả theo mã NV rồi chọn bản mới nhất
      if (!arr.length) {
        list = await formkpistaffService.getAllFormKPI({ ma_nhan_vien: code });
        arr = unwrapForms(list);
      }

      if (!arr.length) {
        setFormRecord(null);
        setFormKpis([]);
        setFindError("Không tìm thấy Form KPI cho mã nhân viên này.");
        return;
      }

      // chọn bản mới nhất
      arr.sort((a, b) => {
        const dn = Number(b?.nam || 0) - Number(a?.nam || 0);
        return dn !== 0 ? dn : Number(b?.thang || 0) - Number(a?.thang || 0);
      });
      const rec = arr[pickNewestIndex(arr)];

      setFormRecord(rec);
      setFormKpis(mapFormToEditable(rec));
      setMonthInput(rec?.thang || new Date().getMonth() + 1);
    } catch (e) {
      console.error(e);
      // Nếu là message từ BE, ưu tiên hiện ra
      setFindError(e?._isBackendMsg ? e.message : "Có lỗi khi tải Form KPI.");
    } finally {
      setFinding(false);
    }
  };

  const updateKpiField = (i, field, value) => {
    setFormKpis((prev) => {
      const next = [...prev];
      const curr = { ...next[i] };
      const loi = { ...(curr.loi || {}) };
      if (field === "so_loi") {
        const num = Number(value);
        loi.so_loi = Number.isNaN(num) || num < 0 ? 0 : num;
      } else if (field === "noi_dung") {
        loi.noi_dung = value;
      }
      curr.loi = loi;
      next[i] = curr;
      return next;
    });
  };

  const handleSave = async () => {
    if (!formRecord?._id) {
      alert("Chưa có Form KPI để chấm.");
      return;
    }
    // Chuẩn hoá tháng 1..12
    let thang = parseInt(monthInput, 10);
    if (Number.isNaN(thang) || thang < 1) thang = 1;
    if (thang > 12) thang = 12;

    try {
      // Lưu qua checkform (ưu tiên theo form_kpi_id)
      let created = null;
      try {
        created = await checkKPIService.createCheckKPI({
          form_kpi_id: formRecord._id,
          thang,
          nam: currentYear,
          kpis: formKpis, // nếu BE chấp nhận kèm kpis khi tạo
        });
      } catch {
        // Fallback: nếu BE không có route create theo form_kpi_id
        // eslint-disable-next-line no-unused-vars
        created = await checkKPIService.createCheckKPIFromStaff({
          ma_nhan_vien: formRecord.ma_nhan_vien,
          thang,
          nam: currentYear,
          kpis: formKpis,
        });
      }

      alert("Đã lưu đánh giá KPI.");
      if (typeof onSaved === "function") await onSaved();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Lưu thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-base md:text-lg font-semibold text-slate-800">Đánh giá KPI</h3>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Tìm mã NV */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFind()}
              placeholder="Nhập mã nhân viên (vd: 23475)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={handleFind}
              disabled={finding}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {finding ? "Đang tải..." : "Lấy Form KPI"}
            </button>
          </div>
          {findError && <p className="text-sm text-rose-600">{findError}</p>}

          {/* Thông tin nhân viên + tháng/năm + bảng KPI */}
          {formRecord && (
            <div className="space-y-3">
              {/* Info nhân viên */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                  Mã NV: <b className="ml-1 font-semibold">{formRecord.ma_nhan_vien}</b>
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">
                  Họ tên: <b className="ml-1 font-semibold">{formRecord.ho_ten}</b>
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-200">
                  Đơn vị: <b className="ml-1 font-semibold">{formRecord.don_vi}</b>
                </span>
              </div>

              {/* Tháng / Năm */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-700">Tháng chấm:</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="text-sm text-slate-600">
                  Năm: <b className="font-semibold">{currentYear}</b>
                </span>
              </div>

              {/* Bảng KPI */}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[52%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[24%]" />
                  </colgroup>
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left">
                      <th className="p-3 font-semibold text-slate-600">KPI</th>
                      <th className="p-3 font-semibold text-slate-600">Tỷ trọng</th>
                      <th className="p-3 font-semibold text-slate-600">Số lỗi</th>
                      <th className="p-3 font-semibold text-slate-600">Nội dung lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formKpis.map((row, i) => (
                      <tr key={row._id || i} className="align-top">
                        <td className="p-3 whitespace-pre-wrap break-words text-slate-800 min-w-0">{row.kpi}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                            {row.ty_trong}%
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            value={row.loi?.so_loi ?? 0}
                            onChange={(e) => {
                              // dùng chung updater để rõ ràng
                              const val = e.target.value;
                              setFormKpis((prev) => {
                                const next = [...prev];
                                const curr = { ...next[i] };
                                const loi = { ...(curr.loi || {}) };
                                const num = Number(val);
                                loi.so_loi = Number.isNaN(num) || num < 0 ? 0 : num;
                                curr.loi = loi;
                                next[i] = curr;
                                return next;
                              });
                            }}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </td>
                        <td className="p-3">
                          <textarea
                            rows={2}
                            value={row.loi?.noi_dung ?? ""}
                            onChange={(e) => updateKpiField(i, "noi_dung", e.target.value)}
                            placeholder="Mô tả ngắn lỗi (nếu có)"
                            className="w-full min-w-0 max-h-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formRecord?._id || formKpis.length === 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                  Lưu đánh giá
                </button>
              </div>
            </div>
          )}
        </div>
        {/* end body */}
      </div>
    </div>
  );
};

export default CheckKPISimpleModal;
