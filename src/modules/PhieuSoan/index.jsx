/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import DinhViTable from "./table/dinhvi";
import DinhViImport from "./excel/ImportDinhVi";
import DinhViClearAll from "./clear/DinhViClearAll";
import DonHangClearAll from "./clear/DonHangClearAll";
import DonHangImport from "./excel/ImportDonHang";
import DonHangTable from "./table/donhang";
import PhieuSoanTable from "./table/phieusoan";
import { phieuSoanService } from "@/services/phieusoan/phieusoan.service";
import ResultModal from "./table/resultModal";
import TxtUploadModal from "./table/TxtUploadModal";

const TABS = [
  { key: "donhang", label: "Đơn Hàng" },
  { key: "phieusoan", label: "Phiếu Soạn" },
  { key: "dinhvi", label: "Định Vị" },
];

const PhieuSoanHome = () => {
  const [activeTab, setActiveTab] = useState("donhang");
  const dinhViTableRef = useRef(null);
  const donHangTableRef = useRef(null);
  const phieuSoanTableRef = useRef(null);

  // ==== Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState([]);

  // ✅ TXT Upload Modal state
  const [txtModalOpen, setTxtModalOpen] = useState(false);

  const showModal = (title, content, actions = []) => {
    setModalTitle(title);
    setModalContent(content);
    setModalActions(actions);
    setModalOpen(true);
  };

  // ✅ Handler xử lý file TXT
  const handleProcessTxt = async (rows, fileInfo = {}) => {
    const { fileName = 'unknown.txt', fileSizeKB = 0, totalRows = 0 } = fileInfo;
    
    console.log("Đang xử lý file TXT:", fileName);
    console.log("Số dòng đã parse:", rows?.length || 0);
    console.log("Kích thước file:", fileSizeKB, "KB");
    console.log("Dữ liệu mẫu:", rows?.slice(0, 3) || []);
    
    try {
      // TODO: Gọi API xử lý TXT ở đây nếu cần
      // const response = await phieuSoanService.processTxtData({ rows });
      
      alert(`✅ Xử lý file TXT thành công!\n\nFile: ${fileName}\nTổng: ${totalRows} dòng\nExcel đã tải xuống!`);
      
      // Refresh bảng nếu cần
      donHangTableRef.current?.fetchDonHang?.();
      phieuSoanTableRef.current?.fetchPhieuSoan?.();
    } catch (error) {
      console.error("Lỗi xử lý TXT:", error);
      throw error;
    }
  };

  // ===== Định Vị
  const handleDinhViImportSuccess = () => {
    if (dinhViTableRef.current?.fetchDinhVi) {
      dinhViTableRef.current.fetchDinhVi();
    }
  };
  const handleDinhViClearSuccess = () => {
    if (dinhViTableRef.current?.fetchDinhVi) {
      dinhViTableRef.current.fetchDinhVi();
    }
  };

  // ===== Đơn Hàng
  const handleDonHangImportSuccess = () => {
    if (donHangTableRef.current?.fetchDonHang) {
      donHangTableRef.current.fetchDonHang();
    }
  };
  const handleDonHangClearSuccess = () => {
    if (donHangTableRef.current?.fetchDonHang) {
      donHangTableRef.current.fetchDonHang();
    }
  };

  // ✅ Handler xử lý đơn hàng - GỌI API TRỰC TIẾP
  const handleProcessOrders = async (selectedData) => {
    if (!selectedData || selectedData.length === 0) {
      showModal(
        "Thiếu dữ liệu",
        <div>Vui lòng chọn ít nhất một đơn hàng!</div>
      );
      return;
    }

    const confirmed = window.confirm(
      `🚀 Xử lý ${selectedData.length} đơn hàng thành phiếu soạn?\n\n` +
        `Hệ thống sẽ tự động:\n` +
        `✓ Tìm vị trí hàng trong kho (FIFO)\n` +
        `✓ Phân bổ số lượng từ các slot\n` +
        `✓ Tính toán chẵn/lẻ dựa trên pack\n` +
        `✓ Tạo phiếu soạn cho từng vị trí lấy hàng\n\n` +
        `⚠️ Lưu ý: Đơn hàng sẽ được đánh dấu đã xử lý!`
    );
    if (!confirmed) return;

    // Loading toast
    const loadingToast = document.createElement("div");
    loadingToast.id = "processing-toast";
    loadingToast.className =
      "fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-slide-in";
    loadingToast.innerHTML = `
      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <div>
        <div class="font-semibold">Đang xử lý...</div>
        <div class="text-xs opacity-90">${selectedData.length} đơn hàng</div>
      </div>
    `;
    document.body.appendChild(loadingToast);

    try {
      // Lấy danh sách ID đơn hàng
      const donHangIds = selectedData
        .map((o) => o.id || o._id || o._raw?._id)
        .filter(Boolean);

      if (donHangIds.length === 0) {
        throw new Error("Không tìm thấy ID hợp lệ trong đơn hàng đã chọn");
      }

      // ✅ GỌI API XỬ LÝ ĐƠN HÀNG
      const response = await phieuSoanService.processOrders({ donHangIds });

      // Remove loading toast
      const toast = document.getElementById("processing-toast");
      if (toast) document.body.removeChild(toast);

      // Refresh tables
      donHangTableRef.current?.fetchDonHang?.();
      phieuSoanTableRef.current?.fetchPhieuSoan?.();
      setActiveTab("phieusoan");

      // Parse response
      const results = response?.data || [];
      const errors = response?.errors || [];
      const message = response?.message || "Đã xử lý đơn hàng";

      // Build modal body JSX
      const jsonForDownload = { message, counts: { results: results.length, errors: errors.length }, results, errors };

      const Content = () => (
        <div className="space-y-5">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="font-semibold text-slate-800">{message}</div>
            <div className="mt-1 text-sm text-slate-600">
              Tổng hợp: <b>{results.length}</b> phiếu soạn · <b>{errors.length}</b> lỗi
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">Phiếu soạn đã tạo</div>
              <div className="rounded-xl border overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Cửa hàng</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Tên</th>
                      <th className="px-3 py-2 text-left">Slot</th>
                      <th className="px-3 py-2 text-left">Pack</th>
                      <th className="px-3 py-2 text-left">SL</th>
                      <th className="px-3 py-2 text-left">Chẵn/Lẻ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 200).map((ps, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-2">{ps.store}</td>
                        <td className="px-3 py-2">{ps.sku}</td>
                        <td className="px-3 py-2">{ps.name}</td>
                        <td className="px-3 py-2">{ps.slot}</td>
                        <td className="px-3 py-2">{ps.pack}</td>
                        <td className="px-3 py-2">{ps.luong}</td>
                        <td className="px-3 py-2">{ps.chan_le}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.length > 200 && (
                <div className="text-xs text-slate-500">
                  ... và {results.length - 200} dòng khác (hãy dùng nút Download để xem đầy đủ)
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-red-700">Danh sách lỗi</div>
              <div className="rounded-xl border border-red-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Tên</th>
                      <th className="px-3 py-2 text-left">Store</th>
                      <th className="px-3 py-2 text-left">Thông báo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 500).map((er, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-red-50/40 align-top">
                        <td className="px-3 py-2">{er.sku ?? "-"}</td>
                        <td className="px-3 py-2">{er.name ?? "-"}</td>
                        <td className="px-3 py-2">{er.store ?? "-"}</td>
                        <td className="px-3 py-2 whitespace-pre-wrap">{er.error ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.length > 500 && (
                <div className="text-xs text-slate-500">
                  ... và {errors.length - 500} lỗi khác (hãy dùng nút Download để xem đầy đủ)
                </div>
              )}
            </div>
          )}
        </div>
      );

      const copyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(jsonForDownload, null, 2));
        } catch { /* empty */ }
      };
      const downloadJSON = () => {
        const blob = new Blob([JSON.stringify(jsonForDownload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ket-qua-xu-ly-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };

      showModal(
        "Kết quả xử lý đơn hàng",
        <Content />,
        [
          { label: "Copy JSON", onClick: copyToClipboard },
          { label: "Download JSON", onClick: downloadJSON, variant: "primary" },
        ]
      );
    } catch (err) {
      console.error("❌ Lỗi xử lý đơn hàng:", err);
      const toast = document.getElementById("processing-toast");
      if (toast) document.body.removeChild(toast);

      const apiMessage = err?.response?.data?.message || err.message || "Vui lòng thử lại sau.";
      const apiDetail = err?.response?.data?.error || err?.response?.data || null;

      const jsonForDownload = { message: apiMessage, detail: apiDetail };

      const ErrorContent = () => (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="font-semibold">Lỗi xử lý đơn hàng</div>
            <div className="mt-1 text-sm">{apiMessage}</div>
          </div>
          {apiDetail && (
            <pre className="text-xs bg-slate-900 text-slate-50 rounded-xl p-3 overflow-auto">
{JSON.stringify(apiDetail, null, 2)}
            </pre>
          )}
        </div>
      );

      const copyToClipboard = async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(jsonForDownload, null, 2));
        } catch { /* empty */ }
      };
      const downloadJSON = () => {
        const blob = new Blob([JSON.stringify(jsonForDownload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `loi-xu-ly-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };

      showModal(
        "Lỗi xử lý đơn hàng",
        <ErrorContent />,
        [
          { label: "Copy JSON", onClick: copyToClipboard },
          { label: "Download JSON", onClick: downloadJSON, variant: "primary" },
        ]
      );
    }
  };

  // ✅ Handler xem chi tiết phiếu soạn -> chuyển sang modal
  const handleViewPhieuSoanDetail = (phieuSoan) => {
    const Detail = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Thông tin hàng</div>
          <div className="mt-2 space-y-1 text-sm">
            <div><span className="text-slate-500">Cửa hàng:</span> {phieuSoan.store}</div>
            <div><span className="text-slate-500">Loại:</span> {phieuSoan.type}</div>
            <div><span className="text-slate-500">SKU:</span> {phieuSoan.sku}</div>
            <div><span className="text-slate-500">Tên:</span> {phieuSoan.name}</div>
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Vị trí & số lượng</div>
          <div className="mt-2 space-y-1 text-sm">
            <div><span className="text-slate-500">Slot:</span> {phieuSoan.slot}</div>
            <div><span className="text-slate-500">Pack:</span> {phieuSoan.pack}</div>
            <div><span className="text-slate-500">Số lượng:</span> {phieuSoan.luong}</div>
            <div><span className="text-slate-500">Chẵn/Lẻ:</span> {phieuSoan.chan_le}</div>
          </div>
        </div>
        <div className="rounded-xl border p-3 md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Trạng thái</div>
          <div className="mt-2 space-y-1 text-sm">
            <div><span className="text-slate-500">Trạng thái:</span> {phieuSoan.trang_thai ? "Hoàn thành" : "Chờ xử lý"}</div>
            <div><span className="text-slate-500">Ngày tạo:</span> {new Date(phieuSoan.ngay_ra_phieu).toLocaleString("vi-VN")}</div>
            {phieuSoan.phieu_soan_id && (
              <div><span className="text-slate-500">Mã phiếu:</span> {phieuSoan.phieu_soan_id}</div>
            )}
          </div>
        </div>
      </div>
    );

    showModal("Chi tiết phiếu soạn", <Detail />);
  };

  const renderActions = () => {
    switch (activeTab) {
      case "dinhvi":
        return (
          <>
            <DinhViImport onImportSuccess={handleDinhViImportSuccess} />
            <DinhViClearAll onClearSuccess={handleDinhViClearSuccess} />
          </>
        );
      case "donhang":
        return (
          <>
            <DonHangImport onImportSuccess={handleDonHangImportSuccess} />
            <DonHangClearAll onClearSuccess={handleDonHangClearSuccess} />
            {/* ✅ Button Xử lý TXT */}
            <button
              onClick={() => setTxtModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xử lý TXT
            </button>
          </>
        );
      case "phieusoan":
        return (
          <div className="text-sm text-slate-500 italic">
            Quản lý danh sách phiếu soạn
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    const tab = TABS.find((t) => t.key === activeTab);
    return tab ? tab.label : "Phiếu Soạn";
  };

  return (
    <div className="mx-auto max-w-9xl p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {getTitle()}
          </h1>
          <p className="text-sm text-slate-500">
            Quản lý dữ liệu {getTitle().toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {renderActions()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 w-full md:w-auto shadow-inner">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === t.key
                ? "bg-white shadow text-slate-900"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "dinhvi" && <DinhViTable ref={dinhViTableRef} />}

      {activeTab === "donhang" && (
        <DonHangTable
          ref={donHangTableRef}
          onProcessOrder={handleProcessOrders}
        />
      )}

      {activeTab === "phieusoan" && (
        <PhieuSoanTable
          ref={phieuSoanTableRef}
          onViewDetail={handleViewPhieuSoanDetail}
        />
      )}

      {/* Modal hiển thị kết quả/lỗi/chi tiết */}
      <ResultModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        actions={modalActions}
      >
        {modalContent}
      </ResultModal>

      {/* ✅ Modal Upload TXT */}
      <TxtUploadModal
        open={txtModalOpen}
        onClose={() => setTxtModalOpen(false)}
        onProcessTxt={handleProcessTxt}
      />
    </div>
  );
};

export default PhieuSoanHome;