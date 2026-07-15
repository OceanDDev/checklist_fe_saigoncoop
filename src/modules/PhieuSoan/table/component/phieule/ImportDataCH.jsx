/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { dataCHService } from "@/services/phieusoan/dataCH.service";

/** Chuẩn hoá header: bỏ dấu, viết thường, gộp khoảng trắng — để so khớp
 *  không phân biệt hoa/thường hay dấu tiếng Việt (VD: "Lịch Đi Hàng" và
 *  "Lịch đi hàng" phải được coi là cùng 1 cột). */
const normalizeHeader = (str = "") =>
  str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** Map header đã chuẩn hoá -> field key trong DB */
const HEADER_KEY_MAP = {
  [normalizeHeader("Số SD/TF")]: "sd_tf",
  [normalizeHeader("Số Document")]: "so_document",
  [normalizeHeader("Mã Cửa Hàng")]: "mach",
  [normalizeHeader("Quận")]: "quan",
  [normalizeHeader("Tên Cửa Hàng")]: "tench",
  [normalizeHeader("Chuyến")]: "chuyen",
  [normalizeHeader("Lịch Đi Hàng")]: "lich_di_hang",
  [normalizeHeader("Ghi chú cửa hàng")]: "ghi_chu_ch",
};

const ImportDataCHModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 }); // ✅ THÊM PROGRESS
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Xuất template Excel
  const handleExportTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    const headerRow = worksheet.addRow([
      "Số SD/TF",
      "Số Document",
      "Mã Cửa Hàng",
      "Quận",
      "Tên Cửa Hàng",
      "Chuyến",
      "Lịch Đi Hàng",
      "Ghi chú cửa hàng",
    ]);

    headerRow.height = 25;

    for (let i = 1; i <= 8; i++) {
      const cell = headerRow.getCell(i);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 30;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 18;
    worksheet.getColumn(8).width = 30;

    // Thêm border
    const borderStyle = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    for (let i = 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      for (let j = 1; j <= 8; j++) {
        const cell = row.getCell(j);
        cell.border = borderStyle;
      }
    }

    // Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Template_Import_DataCH_${Date.now()}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Xử lý chọn file
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setPreviewData([]);
    setFullData([]);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setError("File Excel không có sheet nào");
        return;
      }

      const jsonData = [];
      // colIndexToKey: số cột (1-indexed) -> field key trong DB,
      // xác định bằng cách so khớp header đã chuẩn hoá (không phân biệt
      // hoa/thường, dấu) thay vì so string tuyệt đối như trước — tránh lỗi
      // "Lịch Đi Hàng" (template) khác "Lịch đi hàng" (file người dùng) bị
      // coi là 2 cột khác nhau và không đọc được dữ liệu.
      let colIndexToKey = {};

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          colIndexToKey = {};
          row.eachCell((cell, colNumber) => {
            const rawHeader = cell.text || cell.value || "";
            const key = HEADER_KEY_MAP[normalizeHeader(rawHeader)];
            if (key) colIndexToKey[colNumber] = key;
          });
        } else {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const key = colIndexToKey[colNumber];
            if (!key) return;
            rowData[key] = cell.text || cell.value || "";
          });

          const hasData = Object.values(rowData).some(
            (val) => val && String(val).trim() !== "",
          );
          if (hasData) {
            jsonData.push(rowData);
          }
        }
      });

      if (jsonData.length === 0) {
        setError("File Excel không có dữ liệu");
        return;
      }

      if (Object.keys(colIndexToKey).length === 0) {
        setError(
          "Không nhận diện được cột nào khớp với template. Vui lòng dùng đúng file mẫu.",
        );
        return;
      }

      // Lấy ngày hiện tại
      const currentDate = new Date().toISOString().split("T")[0];

      // jsonData đã có key chuẩn (sd_tf, so_document, mach, ...) nhờ
      // colIndexToKey ở trên, chỉ cần ép kiểu string + trim + gắn ngày import
      const mappedData = jsonData.map((row) => ({
        sd_tf: String(row.sd_tf || "").trim(),
        so_document: String(row.so_document || "").trim(),
        mach: String(row.mach || "").trim(),
        quan: String(row.quan || "").trim(),
        tench: String(row.tench || "").trim(),
        chuyen: String(row.chuyen || "").trim(),
        lich_di_hang: String(row.lich_di_hang || "").trim(),
        ghi_chu_ch: String(row.ghi_chu_ch || "").trim(),
        ngay_import: currentDate,
      }));

      setFullData(mappedData);
      setPreviewData(mappedData.slice(0, 5));
    } catch (err) {
      console.error(err);
      setError("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.");
    }
  };

  // ✅ TÁCH DATA THÀNH BATCHES
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // ✅ XỬ LÝ IMPORT VỚI BATCH PROCESSING
  const handleImport = async () => {
    if (!file) {
      setError("Vui lòng chọn file để import");
      return;
    }

    if (fullData.length === 0) {
      setError("Không có dữ liệu để import");
      return;
    }

    setImporting(true);
    setError("");
    setProgress({ current: 0, total: fullData.length });

    try {
      // Validate dữ liệu bắt buộc
      const invalidRows = fullData.filter(
        (row) => !row.mach || !row.tench || !row.lich_di_hang,
      );
      if (invalidRows.length > 0) {
        setError(
          `Có ${invalidRows.length} dòng thiếu Mã Cửa Hàng, Tên Cửa Hàng hoặc Lịch Đi Hàng`,
        );
        setImporting(false);
        return;
      }

      console.log("📦 Bắt đầu import", fullData.length, "bản ghi");

      // ✅ CHIA THÀNH BATCHES (100 records/batch)
      const BATCH_SIZE = 100;
      const batches = chunkArray(fullData, BATCH_SIZE);

      let successCount = 0;
      let errorCount = 0;
      const errorMessages = [];

      console.log(
        `📦 Chia thành ${batches.length} batches (${BATCH_SIZE} records/batch)`,
      );

      // ✅ XỬ LÝ TỪNG BATCH
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        console.log(
          `📦 Đang xử lý batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`,
        );

        try {
          // ✅ GỌI API IMPORT HÀNG LOẠT
          const result = await dataCHService.importManyDataCH(batch);

          // Xử lý kết quả từ backend
          if (result.stats) {
            successCount += result.stats.inserted || 0;
            successCount += result.stats.updated || 0;
          } else {
            // Fallback nếu backend không trả về stats
            successCount += batch.length;
          }

          // Cập nhật progress
          setProgress({
            current: (batchIndex + 1) * BATCH_SIZE,
            total: fullData.length,
          });
        } catch (err) {
          console.error(`❌ Lỗi batch ${batchIndex + 1}:`, err);

          // Nếu batch fail, thử import từng record trong batch đó
          console.log(
            `⚠️ Batch ${batchIndex + 1} thất bại, thử import từng record...`,
          );

          for (let i = 0; i < batch.length; i++) {
            try {
              await dataCHService.createDataCH(batch[i]);
              successCount++;
            } catch (recordErr) {
              errorCount++;
              const rowNumber = batchIndex * BATCH_SIZE + i + 2; // +2 vì header + 1-indexed
              const errorMsg =
                recordErr?.response?.data?.message ||
                recordErr?.response?.data?.error?.message ||
                recordErr.message ||
                "Lỗi không xác định";
              errorMessages.push(`Dòng ${rowNumber}: ${errorMsg}`);
            }
          }
        }

        // ✅ DELAY NHỎ GIỮA CÁC BATCH ĐỂ TRÁNH OVERLOAD SERVER
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
        }
      }

      console.log(
        `✅ Import hoàn tất: ${successCount} thành công, ${errorCount} lỗi`,
      );

      // Hiển thị kết quả
      if (errorCount > 0) {
        const errorDisplay = errorMessages.slice(0, 10).join("\n");
        const moreErrors =
          errorMessages.length > 10
            ? `\n... và ${errorMessages.length - 10} lỗi khác`
            : "";
        setError(
          `Import hoàn tất:\n✓ Thành công: ${successCount} bản ghi\n✗ Lỗi: ${errorCount} bản ghi\n\n${errorDisplay}${moreErrors}`,
        );

        if (successCount > 0) {
          onImportSuccess?.();
        }
      } else {
        // Thành công hoàn toàn
        onImportSuccess?.();
        handleClose();
      }
    } catch (err) {
      console.error("❌ Lỗi import:", err);
      setError(
        err?.response?.data?.message || "Lỗi import dữ liệu. Vui lòng thử lại.",
      );
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Đóng modal và reset state
  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setFullData([]);
    setError("");
    setImporting(false);
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            Import Dữ liệu Cửa Hàng
          </h2>
          <button
            onClick={handleClose}
            disabled={importing}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Hướng dẫn */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Hướng dẫn import
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Tải file template Excel mẫu bằng nút bên dưới</li>
              <li>Điền dữ liệu vào file Excel theo đúng cột template</li>
              <li>Chọn file Excel đã điền để import vào hệ thống</li>
              <li>Các cột bắt buộc: Mã Cửa Hàng, Tên Cửa Hàng, Lịch Đi Hàng</li>
              <li className="text-green-700 font-medium">
                ✓ Ngày import sẽ tự động lấy ngày hiện tại
              </li>
              <li className="text-purple-700 font-medium">
                ⚡ Hỗ trợ import hàng loạt với batch processing
              </li>
            </ul>
          </div>

          {/* Nút xuất template */}
          <div>
            <button
              onClick={handleExportTemplate}
              className="h-10 px-4 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
            >
              📥 Tải Template Excel
            </button>
          </div>

          {/* Chọn file */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chọn file Excel để import
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer disabled:opacity-50"
            />
            {file && (
              <p className="mt-2 text-sm text-slate-600">
                ✓ Đã chọn: <span className="font-medium">{file.name}</span>
                {fullData.length > 0 && (
                  <span className="ml-2 text-green-600 font-semibold">
                    ({fullData.length.toLocaleString()} bản ghi)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ✅ PROGRESS BAR */}
          {importing && progress.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Đang import...
                </span>
                <span className="text-sm text-blue-700">
                  {Math.min(progress.current, progress.total).toLocaleString()}{" "}
                  / {progress.total.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((progress.current / progress.total) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                {Math.min(
                  Math.round((progress.current / progress.total) * 100),
                  100,
                )}
                % hoàn thành
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 whitespace-pre-line text-sm max-h-48 overflow-y-auto">
              ⚠️ {error}
            </div>
          )}

          {/* Preview data */}
          {previewData.length > 0 && !importing && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">
                Preview dữ liệu (5 dòng đầu)
              </h3>
              <div className="overflow-auto border border-slate-200 rounded-xl">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Số SD/TF
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Số Document
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Mã CH
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Quận
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Tên CH
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Chuyến
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Lịch Đi Hàng
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Ghi chú
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Ngày Import
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-100 even:bg-slate-50/50"
                      >
                        <td className="px-3 py-2 text-slate-600">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.sd_tf}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.so_document}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.mach}</td>
                        <td className="px-3 py-2 text-slate-700">{row.quan}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.tench}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.chuyen}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.lich_di_hang}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.ghi_chu_ch}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <span className="text-green-600 font-medium">
                            {row.ngay_import}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={importing}
            className="h-10 px-5 rounded-xl bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {importing ? "Đang import..." : "Hủy"}
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing || fullData.length === 0}
            className="h-10 px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                📤 Import{" "}
                {fullData.length > 0 && `(${fullData.length.toLocaleString()})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDataCHModal;
