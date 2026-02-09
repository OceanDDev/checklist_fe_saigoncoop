/* eslint-disable react/prop-types */
import { useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { phieuLeService } from "@/services/phieusoan/phieule.service";

const ImportHDDaXuat = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false); // ✅ NEW
  const [warningData, setWarningData] = useState(null); // ✅ NEW

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setProgress("");
      setShowWarningModal(false); // ✅ Reset warning
      setWarningData(null);
    }
  };

  // ✅ HÀM XUẤT TEMPLATE EXCEL
  const handleExportTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template HD Đã Xuất");

      worksheet.columns = [
        { header: "SD_TF", key: "sd_tf", width: 20 },
        { header: "Ghi chú", key: "note", width: 40 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFD0D0D0" } },
              left: { style: "thin", color: { argb: "FFD0D0D0" } },
              bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
              right: { style: "thin", color: { argb: "FFD0D0D0" } },
            };
            cell.alignment = { vertical: "middle" };
          });
        }
      });

      const instructionSheet = workbook.addWorksheet("Hướng dẫn");
      instructionSheet.columns = [
        { header: "Hướng dẫn sử dụng template", key: "instruction", width: 80 },
      ];

      const instructions = [
        "HƯỚNG DẪN SỬ DỤNG TEMPLATE IMPORT HD ĐÃ XUẤT",
        "",
        "1. Cột SD_TF (Bắt buộc):",
        "   - Nhập số SD/TF của các đơn hàng đã xuất",
        "   - Chỉ nhập số, không có ký tự đặc biệt",
        "   - Ví dụ: 12345, 67890, 11111",
        "",
        "2. Cột Ghi chú (Không bắt buộc):",
        "   - Có thể để trống hoặc ghi chú thêm thông tin",
        "",
        "3. Lưu ý:",
        "   - Không xóa dòng tiêu đề (header)",
        "   - Có thể xóa các dòng mẫu và nhập dữ liệu thực",
        "   - Hệ thống chỉ đọc cột SD_TF",
        "   - File phải là định dạng .xlsx hoặc .xls",
        "   - CHỈ CẬP NHẬT những phiếu có trạng thái 'Đã xử lý'",
        "",
        "4. Sau khi điền xong:",
        "   - Lưu file",
        "   - Quay lại màn hình Import HD Đã Xuất",
        "   - Chọn file và nhấn Import & Cập nhật",
      ];

      instructions.forEach((text, index) => {
        const row = instructionSheet.addRow({ instruction: text });
        if (index === 0) {
          row.font = { bold: true, size: 14, color: { argb: "FF4472C4" } };
        } else if (text.match(/^\d+\./)) {
          row.font = { bold: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Template_HD_Da_Xuat_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("✅ Template đã được tải xuống thành công!");
    } catch (error) {
      console.error("❌ Lỗi khi xuất template:", error);
      alert("Có lỗi xảy ra khi xuất template!");
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert("Vui lòng chọn file Excel!");
      return;
    }

    setLoading(true);
    setProgress("Đang đọc file...");
    setResult(null);
    setShowWarningModal(false);
    setWarningData(null);

    try {
      // 1. Đọc file Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 2. Extract danh sách sd_tf từ Excel
      setProgress("Đang xử lý dữ liệu...");
      const sdTfList = [];

      const headers = jsonData[0];
      let sdTfColIndex = 0;

      if (headers && Array.isArray(headers)) {
        const possibleHeaders = [
          "sd_tf",
          "sd/tf",
          "sdtf",
          "so sd/tf",
          "số sd/tf",
        ];
        const foundIndex = headers.findIndex((h) =>
          possibleHeaders.includes(String(h).toLowerCase().trim()),
        );
        if (foundIndex !== -1) {
          sdTfColIndex = foundIndex;
        }
      }

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[sdTfColIndex]) {
          const sdTfValue = Number(row[sdTfColIndex]);
          if (!isNaN(sdTfValue) && sdTfValue > 0) {
            sdTfList.push(sdTfValue);
          }
        }
      }

      if (sdTfList.length === 0) {
        throw new Error("Không tìm thấy dữ liệu SD/TF hợp lệ trong file!");
      }

      console.log(`📋 Tìm thấy ${sdTfList.length} mã SD/TF:`, sdTfList);

      // ✅ 3. KIỂM TRA TRẠNG THÁI CỦA CÁC PHIẾU
      setProgress("Đang kiểm tra trạng thái các phiếu...");

      // Lấy tất cả phiếu có sd_tf trong danh sách
      const allPhieus = await phieuLeService.getAllPhieuLe({
        limit: 9999,
        page: 1,
      });

      const phieuMap = new Map();
      allPhieus.data?.forEach((phieu) => {
        if (phieu.sd_tf) {
          phieuMap.set(phieu.sd_tf, phieu);
        }
      });

      // Phân loại SD/TF
      const validSDTF = []; // Đã xử lý - OK để chuyển sang Đã Xuất
      const invalidSDTF = []; // Chờ xử lý hoặc không tìm thấy - CẢNH BÁO
      const notFoundSDTF = []; // Không tìm thấy trong hệ thống

      sdTfList.forEach((sdtf) => {
        const phieu = phieuMap.get(sdtf);

        if (!phieu) {
          notFoundSDTF.push({
            sd_tf: sdtf,
            reason: "Không tìm thấy trong hệ thống",
          });
        } else if (phieu.trang_thai === "Đã xử lý") {
          validSDTF.push(sdtf);
        } else {
          invalidSDTF.push({
            sd_tf: sdtf,
            so_document: phieu.so_document,
            trang_thai: phieu.trang_thai,
            mach: phieu.mach,
            tench: phieu.tench,
          });
        }
      });

      console.log("✅ Phân loại SD/TF:");
      console.log(`  - Hợp lệ (Đã xử lý): ${validSDTF.length}`);
      console.log(`  - Không hợp lệ (Chờ xử lý): ${invalidSDTF.length}`);
      console.log(`  - Không tìm thấy: ${notFoundSDTF.length}`);

      // ✅ 4. NẾU CÓ SD/TF KHÔNG HỢP LỆ - HIỆN CẢNH BÁO
      if (invalidSDTF.length > 0 || notFoundSDTF.length > 0) {
        setWarningData({
          validSDTF,
          invalidSDTF,
          notFoundSDTF,
          totalInFile: sdTfList.length,
        });
        setShowWarningModal(true);
        setLoading(false);
        return; // Dừng lại, đợi user quyết định
      }

      // ✅ 5. NẾU TẤT CẢ ĐỀU HỢP LỆ - CẬP NHẬT LUÔN
      await processUpdate(validSDTF);
    } catch (error) {
      console.error("❌ Lỗi khi import:", error);
      setResult({
        success: false,
        message: error.message || "Có lỗi xảy ra khi import!",
      });
      setLoading(false);
    }
  };

  // ✅ HÀM XỬ LÝ CẬP NHẬT
  const processUpdate = async (sdTfList) => {
    try {
      setProgress(`Đang cập nhật trạng thái cho ${sdTfList.length} phiếu...`);

      const response = await phieuLeService.updateTrangThaiBySDTF({
        sd_tf_list: sdTfList,
        trang_thai: "Đã Xuất",
      });

      console.log("✅ Kết quả cập nhật:", response);

      setResult({
        success: true,
        total: sdTfList.length,
        matched: response?.matched || 0,
        updated: response?.updated || 0,
        message: response?.message || "Cập nhật thành công!",
      });

      setProgress("Hoàn thành!");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật:", error);
      setResult({
        success: false,
        message: error.message || "Có lỗi xảy ra khi cập nhật!",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ XỬ LÝ KHI USER BỎ QUA CẢNH BÁO VÀ TIẾP TỤC
  const handleContinueWithValid = async () => {
    setShowWarningModal(false);
    setLoading(true);

    if (warningData && warningData.validSDTF.length > 0) {
      await processUpdate(warningData.validSDTF);
    } else {
      setResult({
        success: false,
        message: "Không có phiếu hợp lệ nào để cập nhật!",
      });
      setLoading(false);
    }
  };

  // ✅ HỦY VÀ QUAY LẠI
  const handleCancelWarning = () => {
    setShowWarningModal(false);
    setWarningData(null);
    setLoading(false);
  };

  const handleReset = () => {
    setFile(null);
    setProgress("");
    setResult(null);
    setShowWarningModal(false);
    setWarningData(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-slate-800">
              Import HD Đã Xuất
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              disabled={loading}
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

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Hướng dẫn */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                📋 Hướng dẫn sử dụng:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  Chuẩn bị file Excel (.xlsx, .xls) chứa danh sách số SD/TF
                </li>
                <li>
                  Cột chứa SD/TF có thể đặt tên: SD_TF, SD/TF, Số SD/TF, v.v.
                </li>
                <li>Hệ thống sẽ tự động tìm các phiếu có SD/TF trùng khớp</li>
                <li className="font-semibold text-orange-700">
                  ⚠️ CHỈ CẬP NHẬT những phiếu có trạng thái Đã xử lý
                </li>
                <li>
                  Trạng thái của các phiếu hợp lệ sẽ được cập nhật thành{" "}
                  <strong>Đã Xuất</strong>
                </li>
              </ul>

              {/* NÚT TẢI TEMPLATE */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <button
                  onClick={handleExportTemplate}
                  className="w-full px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Tải Template Excel Mẫu
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Chọn file Excel
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="flex-1 text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {file && (
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
              </div>
              {file && (
                <p className="text-xs text-slate-600">
                  ✓ Đã chọn: <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {/* Progress */}
            {progress && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {progress}
                  </span>
                </div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`border rounded-xl p-4 ${
                  result.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <h3
                  className={`font-semibold mb-2 ${
                    result.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {result.success ? "✅ Thành công!" : "❌ Lỗi!"}
                </h3>
                <div
                  className={`text-sm space-y-1 ${
                    result.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.success ? (
                    <>
                      <p>
                        • Tổng số SD/TF trong file:{" "}
                        <strong>{result.total}</strong>
                      </p>
                      <p>
                        • Số phiếu tìm thấy: <strong>{result.matched}</strong>
                      </p>
                      <p>
                        • Số phiếu đã cập nhật:{" "}
                        <strong>{result.updated}</strong>
                      </p>
                      <p className="mt-2 text-xs text-green-700">
                        {result.message}
                      </p>
                    </>
                  ) : (
                    <p>{result.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-100 transition-colors ring-1 ring-slate-300 disabled:opacity-50"
            >
              {result ? "Đóng" : "Hủy"}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : "Import & Cập nhật"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ✅ MODAL CẢNH BÁO */}
      {showWarningModal && warningData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
              <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                ⚠️ Cảnh báo: Phát hiện phiếu không hợp lệ
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 overflow-auto flex-1">
              {/* Tổng quan */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {warningData.totalInFile}
                  </div>
                  <div className="text-sm text-blue-700">Tổng trong file</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {warningData.validSDTF.length}
                  </div>
                  <div className="text-sm text-green-700">
                    Hợp lệ (Đã xử lý)
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {warningData.invalidSDTF.length +
                      warningData.notFoundSDTF.length}
                  </div>
                  <div className="text-sm text-red-700">Không hợp lệ</div>
                </div>
              </div>

              {/* Danh sách phiếu không hợp lệ */}
              {warningData.invalidSDTF.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-orange-900 mb-3">
                    ❌ Phiếu có trạng thái Chờ xử lý ({warningData.invalidSDTF.length}):
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-auto max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-orange-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">
                            SD/TF
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Số Document
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Trạng thái
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Mã CH
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Tên CH
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {warningData.invalidSDTF.map((item, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-orange-100 hover:bg-orange-100"
                          >
                            <td className="px-3 py-2 font-medium">
                              {item.sd_tf}
                            </td>
                            <td className="px-3 py-2">{item.so_document}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                                {item.trang_thai}
                              </span>
                            </td>
                            <td className="px-3 py-2">{item.mach}</td>
                            <td className="px-3 py-2">{item.tench}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Danh sách không tìm thấy */}
              {warningData.notFoundSDTF.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-3">
                    ❓ Không tìm thấy trong hệ thống ({warningData.notFoundSDTF.length}):
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {warningData.notFoundSDTF.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded bg-red-100 text-red-800 text-sm font-medium"
                        >
                          {item.sd_tf}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Thông báo */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Gợi ý:</strong> Hệ thống sẽ chỉ cập nhật{" "}
                  <strong className="text-green-700">
                    {warningData.validSDTF.length} phiếu hợp lệ
                  </strong>{" "}
                  có trạng thái Đã xử lý. Các phiếu còn lại sẽ bị bỏ qua.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleCancelWarning}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-100 transition-colors ring-1 ring-slate-300"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleContinueWithValid}
                disabled={warningData.validSDTF.length === 0}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp tục với {warningData.validSDTF.length} phiếu hợp lệ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportHDDaXuat;