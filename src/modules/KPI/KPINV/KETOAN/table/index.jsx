/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback } from "react";
import { formkpistaffService } from "@/services/formkpistaff.service";
import StaffKPIDetailModal from "./StaffKPIDetailModal";

const TableKeToan = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null); // { ma_nhan_vien, ho_ten, don_vi }

  const refreshList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await formkpistaffService.getAllFormKPI();
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Lỗi khi load KPI:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // lock scroll khi mở modal
  useEffect(() => {
    if (!detailOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [detailOpen]);

  const openDetail = (staff) => {
    setSelectedStaff(staff);
    setDetailOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-800">Danh sách KPI</h2>
          <p className="text-xs text-slate-500">Tổng {data.length} bản ghi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            Kế toán
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur border-b border-slate-200">
            <tr className="text-left">
              <th className="p-3 md:p-3.5 text-[11px] uppercase tracking-wide font-semibold text-slate-600">Mã NV</th>
              <th className="p-3 md:p-3.5 text-[11px] uppercase tracking-wide font-semibold text-slate-600">Họ Tên</th>
              <th className="p-3 md:p-3.5 text-[11px] uppercase tracking-wide font-semibold text-slate-600">Đơn Vị</th>
              {/* BỎ cột Số KPI */}
              <th className="p-3 md:p-3.5 text-center text-[11px] uppercase tracking-wide font-semibold text-slate-600">Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* Skeleton */}
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`s-${i}`} className="animate-pulse">
                  <td className="p-3"><div className="h-3 w-20 rounded bg-slate-200" /></td>
                  <td className="p-3"><div className="h-3 w-40 rounded bg-slate-200" /></td>
                  <td className="p-3"><div className="h-3 w-24 rounded bg-slate-200" /></td>
                  <td className="p-3 text-center"><div className="h-8 w-28 mx-auto rounded bg-slate-200" /></td>
                </tr>
              ))}

            {!loading && data.length > 0 &&
              data.map((item) => (
                <tr key={item._id}>
                  <td className="p-3">{item.ma_nhan_vien}</td>
                  <td className="p-3">{item.ho_ten}</td>
                  <td className="p-3">{item.don_vi}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() =>
                        openDetail({
                          ma_nhan_vien: item.ma_nhan_vien,
                          ho_ten: item.ho_ten,
                          don_vi: item.don_vi,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      📄 Chi tiết
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <h3 className="text-slate-800 font-medium">Chưa có dữ liệu</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Hãy thêm KPI mới hoặc thay đổi bộ lọc để xem dữ liệu.
                    </p>
                    <button
                      onClick={refreshList}
                      className="mt-4 inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      Tải lại
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết KPI đã check */}
      {detailOpen && selectedStaff && (
        <StaffKPIDetailModal
          staff={selectedStaff}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
};

export default TableKeToan;
