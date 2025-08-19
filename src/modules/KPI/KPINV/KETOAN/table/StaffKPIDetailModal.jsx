/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { checkKPIService } from "@/services/checkkpistaff.service";

// unwrap helper cho mọi kiểu response
const unwrapArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.success === false) return [];
  return [];
};

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

const StaffKPIDetailModal = ({ staff, onClose }) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const defaultMonth = useMemo(() => {
    const m = new Date().getMonth() + 1;
    return MONTHS.includes(m) ? m : 1;
  }, []);
  const [activeMonth, setActiveMonth] = useState(defaultMonth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [items, setItems] = useState([]);

  const fetchMonth = async (thang) => {
    setLoading(true);
    setError("");
    setRecord(null);
    setItems([]);
    try {
      const res = await checkKPIService.getAllCheckKPI({
        ma_nhan_vien: staff.ma_nhan_vien,
        thang,
        nam: currentYear,
      });
      const arr = unwrapArray(res);
      const r = Array.isArray(arr) && arr.length ? arr[0] : null;
      setRecord(r);
      setItems(Array.isArray(r?.danh_sach_check) ? r.danh_sach_check : []);
      if (!r) setError(`Chưa có check KPI tháng ${thang}/${currentYear} cho nhân viên này.`);
    } catch (e) {
      console.error(e);
      setError("Có lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth(activeMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth, staff?.ma_nhan_vien]);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="space-y-1">
            <h3 className="text-base md:text-lg font-semibold text-slate-800">Chi tiết KPI đã check</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                Mã NV: <b className="ml-1 font-semibold">{staff.ma_nhan_vien}</b>
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">
                Họ tên: <b className="ml-1 font-semibold">{staff.ho_ten}</b>
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-200">
                Đơn vị: <b className="ml-1 font-semibold">{staff.don_vi}</b>
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                Năm: <b className="ml-1 font-semibold">{currentYear}</b>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Tháng selector */}
          <div className="space-y-3">
            {/* Mobile: thanh cuộn ngang */}
            <div className="md:hidden -mx-2 px-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {MONTHS.map((m) => {
                  const active = activeMonth === m;
                  return (
                    <button
                      key={`m-sm-${m}`}
                      onClick={() => setActiveMonth(m)}
                      className={[
                        "snap-start shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium ring-1 transition",
                        active
                          ? "bg-indigo-600 text-white ring-indigo-500"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      Tháng {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: grid 6/12 cột */}
            <div className="hidden md:grid grid-cols-6 lg:grid-cols-12 gap-2">
              {MONTHS.map((m) => {
                const active = activeMonth === m;
                return (
                  <button
                    key={`m-lg-${m}`}
                    onClick={() => setActiveMonth(m)}
                    className={[
                      "w-full px-3 py-2 rounded-xl text-sm font-medium ring-1 transition",
                      active
                        ? "bg-indigo-600 text-white ring-indigo-500"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    Tháng {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status/error */}
          {loading && (
            <div className="text-sm text-slate-500">Đang tải dữ liệu tháng {activeMonth}...</div>
          )}
          {!loading && error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
              {error}
            </div>
          )}

          {/* Bảng KPI đã check */}
          {!loading && !error && (
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
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        Không có dữ liệu KPI đã check cho tháng {activeMonth}/{currentYear}.
                      </td>
                    </tr>
                  ) : (
                    items.map((row, i) => (
                      <tr key={row._id || i} className="align-top">
                        <td className="p-3 whitespace-pre-wrap break-words text-slate-800 min-w-0">
                          {row.kpi}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                            {row.ty_trong}%
                          </span>
                        </td>
                        <td className="p-3">{row.so_loi ?? 0}</td>
                        <td className="p-3 whitespace-pre-wrap break-words">
                          {row.noi_dung_loi ?? ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Info dưới */}
          {!loading && record && (
            <div className="text-xs text-slate-500">
              Cập nhật lần cuối:{" "}
              {record.ngay_tao ? new Date(record.ngay_tao).toLocaleString() : "—"}
              {typeof record.so_lan_update === "number" && (
                <> • Số lần cập nhật: <b>{record.so_lan_update}</b></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffKPIDetailModal;
