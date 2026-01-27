/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
// SubKpiModal.jsx - CHỈ hiển thị list để chấm, không có thêm/xóa
import { useState, useEffect } from "react";

const SubKpiModal = ({ kpiName, subKpis = [], onClose, onSave }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (subKpis && subKpis.length > 0) {
      setItems(
        subKpis.map((item) => ({
          ten_kpi_phu: item.ten_kpi_phu || "",
          so_loi: Number(item.so_loi) || 0,
        })),
      );
    } else {
      setItems([]);
    }
  }, [subKpis]);

  const handleChange = (index, value) => {
    const newItems = [...items];
    let num = Number(value);
    if (isNaN(num) || num < 0) num = 0;
    newItems[index].so_loi = num;
    setItems(newItems);
  };

  const handleSave = () => {
    // Trả dữ liệu đã chấm về component cha
    if (typeof onSave === "function") {
      onSave(items);
    }
  };

  if (items.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[60] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

        <div className="relative z-10 mx-auto my-8 w-full max-w-md px-4">
          <div className="rounded-2xl bg-white shadow-xl p-6 text-center">
            <p className="text-slate-600 mb-4">KPI này không có KPI phụ</p>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div className="relative z-10 mx-auto my-8 w-full max-w-2xl px-4">
        <div className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Chấm điểm KPI Phụ
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                KPI chính: {kpiName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>

          {/* Body - Bảng KPI phụ */}
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      STT
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Tên KPI phụ
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">
                      Số lỗi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {item.ten_kpi_phu}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.so_loi}
                          onChange={(e) => handleChange(index, e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Lưu ý:</strong> Nhập số lỗi cho từng KPI phụ. Số lỗi
                phải ≥ 0.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Lưu điểm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubKpiModal;
