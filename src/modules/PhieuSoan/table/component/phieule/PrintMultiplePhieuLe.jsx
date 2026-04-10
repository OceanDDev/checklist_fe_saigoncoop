/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { phieuLeService } from "@/services/phieusoan/phieule.service";

const PrintMultiplePhieuLe = ({
  isOpen,
  onClose,
  selectedPhieus,
  onPrintSuccess,
}) => {
  const contentRef = useRef(null);

  const [printTime] = useState(() => new Date());

  const reactToPrintFn = useReactToPrint({
    contentRef,
    documentTitle: `Phieu_Le_${new Date().getTime()}`,
    onAfterPrint: async () => {
      try {
        const updatePromises = selectedPhieus.map(async (phieu) => {
          const currentCount = phieu.so_lan_in_phieu || 0;
          const newCount = currentCount + 1;
          return phieuLeService.updatePhieuLe(phieu._id, {
            so_lan_in_phieu: newCount,
            ngay_in_phieu: printTime,
            trang_thai: "Đã xử lý",
          });
        });

        await Promise.all(updatePromises);
        if (onPrintSuccess) onPrintSuccess();
      } catch (error) {
        console.error("❌ Lỗi khi cập nhật:", error);
        alert("Có lỗi khi cập nhật. Vui lòng kiểm tra lại!");
      }
    },
  });

  const handlePrint = () => {
    if (contentRef.current) reactToPrintFn();
  };

  if (!isOpen) return null;

  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return dateValue;
    }
  };

  const getKienDuKien = (item, is8101) => {
    if (is8101) return "-";
    if (item.packs_to_pick_1 && item.packs_to_pick_1 > 0) {
      return parseFloat(item.packs_to_pick_1.toFixed(2));
    }
    if (item.packs_to_pick && item.packs_to_pick > 0) {
      return parseFloat(item.packs_to_pick.toFixed(2));
    }
    return 0;
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            .no-print { display: none !important; }
            .phieu-container { page-break-after: always; page-break-inside: avoid; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
            table { width: 100%; table-layout: auto; page-break-inside: avoid; }
            .print-content { font-size: 11px; }
          }
        `,
        }}
      />

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
          {/* Header Modal */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                In Nhiều Phiếu Soạn (A4 Ngang)
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Đã chọn{" "}
                <span className="font-semibold text-blue-600">
                  {selectedPhieus.length}
                </span>{" "}
                phiếu. Mỗi phiếu sẽ in trên 1 trang riêng biệt.
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto p-6 bg-slate-50">
            <div
              ref={contentRef}
              className="mx-auto"
              style={{ width: "277mm" }}
            >
              {selectedPhieus.map((phieu, phieuIndex) => {
                const is8101 = phieu.loai_phieu === "8101"; // ✅
                const soLanInDuKien = (phieu.so_lan_in_phieu || 0) + 1;
                const ngayHienThi = printTime;

                return (
                  <div
                    key={phieu._id || phieuIndex}
                    className="phieu-container bg-white p-4 print-content"
                  >
                    {/* Header Phiếu */}
                    <div className="border-b-2 border-slate-800 pb-2 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <img
                          src="/img/logonew.png"
                          alt="Logo"
                          className="h-12 object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="flex flex-col items-center">
                          {is8101 && (
                            <span className="px-5 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 text-4xl font-extrabold mb-1 tracking-widest">
                              8101
                            </span>
                          )}
                          <h1 className="text-xl font-bold text-slate-800">
                            PHIẾU NGÀY {formatDate(ngayHienThi)}
                          </h1>
                          <div className="text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-orange-600">
                              Lần in thứ: {soLanInDuKien}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-right italic text-slate-500">
                          Trang {phieuIndex + 1} / {selectedPhieus.length}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8 text-[19px] font-medium">
                        <div className="space-y-1">
                          <p>
                            <span className="font-bold">Số Document:</span>{" "}
                            {phieu.so_document || "-"}
                          </p>
                          <p>
                            <span className="font-bold">Số SD/TF:</span>{" "}
                            {phieu.loai_phieu || "N/A"}-{phieu.sd_tf || "N/A"}
                          </p>
                          <p>
                            <span className="font-bold">Mã/Tên CH:</span>{" "}
                            {phieu.mach} - {phieu.tench}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p>
                            <span className="font-bold">Quận:</span>{" "}
                            {phieu.quan || "N/A"}
                          </p>
                          <p>
                            <span className="font-bold">Chuyến:</span>{" "}
                            {phieu.chuyen || "N/A"}
                          </p>
                          <p>
                            <span className="font-bold">Ngày Import:</span>{" "}
                            {formatDate(phieu.ngay_import)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bảng sản phẩm */}
                    <div className="flex-1 overflow-hidden">
                      <table className="w-full border-collapse border border-slate-400">
                        <thead>
                          <tr className="bg-slate-100 text-[11px]">
                            <th className="border border-slate-400 p-1">#</th>
                            <th className="border border-slate-400 p-1">
                              Slot
                            </th>
                            <th className="border border-slate-400 p-1">SKU</th>
                            <th className="border border-slate-400 p-1">
                              Tên Sản Phẩm
                            </th>
                            <th className="border border-slate-400 p-1">
                              Quantity
                            </th>
                            <th className="border border-slate-400 p-1">
                              Pack.Unit
                            </th>
                            <th className="border border-slate-400 p-1">
                              Pack.UM
                            </th>
                            <th className="border border-slate-400 p-1">
                              Packs To Pick
                            </th>
                            <th className="border border-slate-400 p-1">
                              Store
                            </th>
                            <th className="border border-slate-400 p-1 bg-green-50">
                              Kiện DK
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {phieu.chi_tiet?.map((item, idx) => (
                            <tr key={idx} className="text-[11px] leading-tight">
                              <td className="border border-slate-400 p-1 text-center">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-400 p-1">
                                {item.slot}
                              </td>
                              <td className="border border-slate-400 p-1">
                                {item.sku}
                              </td>
                              <td className="border border-slate-400 p-1 truncate max-w-[200px]">
                                {item.name}
                              </td>
                              <td className="border border-slate-400 p-1 text-right font-bold">
                                {item.quantity}
                              </td>
                              {/* ✅ 8101: hiển thị "-" cho các cột không có data */}
                              <td className="border border-slate-400 p-1 text-right">
                                {is8101 ? "-" : item.pack_unit}
                              </td>
                              <td className="border border-slate-400 p-1 text-center">
                                {is8101 ? "-" : item.pck_um}
                              </td>
                              <td className="border border-slate-400 p-1 text-right">
                                {is8101 ? "-" : item.packs_to_pick}
                              </td>
                              <td className="border border-slate-400 p-1 text-right">
                                {is8101 ? "-" : item.store}
                              </td>
                              <td className="border border-slate-400 p-1 text-right font-bold bg-green-50">
                                {getKienDuKien(item, is8101)}
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-green-100 font-bold">
                            <td
                              colSpan="9"
                              className="border border-slate-400 p-2 text-right text-[13px]"
                            >
                              TỔNG KIỆN DỰ KIẾN:
                            </td>
                            <td className="border border-slate-400 p-2 text-center text-[15px] bg-green-200">
                              {/* ✅ 8101 không có tong_kien */}
                              {is8101 ? "-" : `${phieu.tong_kien || 0} KIỆN`}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {phieu.ghi_chu_phieu && (
                      <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded text-[35px]">
                        <strong>Ghi chú:</strong> {phieu.ghi_chu_phieu}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Modal */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-white no-print">
            <div className="text-sm text-slate-600">
              Tổng: <strong>{selectedPhieus.length}</strong> phiếu
              <span className="ml-3 text-orange-600">
                (Số lần in, ngày in và trạng thái sẽ cập nhật sau khi in)
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="h-10 px-6 rounded-xl border border-slate-300 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handlePrint}
                className="h-10 px-6 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-md"
              >
                In Phiếu
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintMultiplePhieuLe;
