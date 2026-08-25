/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Search,
  Menu as MenuIcon,
  Plus,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
  Settings2,
  Trash2,
} from "lucide-react";

import { baoTaiService } from "@/services/baotai.service";
import { FONT_IMPORT } from "./common";
import ImportBaoTaiModal from "./import";
import NvTkModal from "./thukho";
import CongXuatModal from "./congxuat";
import PhieuBaoTaiPrint, { PRINT_STYLE } from "./PhieuBaoTaiPrint";
import { formatBsx } from "./bsxUtils"; // 👈 dùng chung, KHÔNG định nghĩa lại ở đây
import { AddNewModal, AddSllModal } from "./addmodal";
import BaoTaiRow, { STATUS } from "./baotairow";

const ROLE_DIEU_VAN = 74;

const getCurrentRole = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role ?? null;
  } catch {
    return null;
  }
};

const normalizeRow = (r) => ({
  id: r.id ?? r._id,
  nvc: r.nvc ?? "",
  chuyen: r.chuyen ?? "",
  stt: r.stt ?? "",
  bsx: r.bsx ?? "",
  status: r.status || r.trangThai || STATUS.CHUA_VAO,
  thoiGianVao: r.thoiGianVao ?? r.thoi_gian_vao ?? "",
  nvTk: r.nvTk ?? r.nv_tk ?? "",
  congXuat: r.congXuat ?? r.cong_xuat ?? "",
  ghiChu: r.ghiChu ?? r.ghi_chu ?? "",
});

const UI_TO_API_FIELD = {
  status: "trangThai",
  thoiGianVao: "thoi_gian_vao",
};

const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const BaoTaiDieuVan = () => {
  const role = useMemo(() => getCurrentRole(), []);
  const isDieuVan = role === ROLE_DIEU_VAN;

  const canEditBsx = isDieuVan;
  const canShowActionButtons = isDieuVan;
  const canShowPrintColumn = isDieuVan;
  const canShowNvTkCongXuatSpeaker = !isDieuVan;

  const columnCount =
    7 + (canShowNvTkCongXuatSpeaker ? 3 : 0) + (canShowPrintColumn ? 1 : 0);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);

  const [bsxDrafts, setBsxDrafts] = useState({});
  const [bsxErrors, setBsxErrors] = useState({});

  const [menuOpen, setMenuOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [nvTkModalOpen, setNvTkModalOpen] = useState(false);
  const [congXuatModalOpen, setCongXuatModalOpen] = useState(false);
  const [printRow, setPrintRow] = useState(null);

  // Modal "Thêm SLL" / "Thêm mới" + cờ đang gửi API tạo mới
  const [sllModalOpen, setSllModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Các row đang chờ API xử lý (checkin/uncheck) -> dùng để khoá nút, tránh bấm đúp
  // khi mạng chậm/lag, tránh gọi trùng request.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const [nvTkList, setNvTkList] = useState([]);
  const [congXuatList, setCongXuatList] = useState([
    { id: "cx-4", name: "Cổng 4" },
    { id: "cx-5", name: "Cổng 5" },
    { id: "cx-6", name: "Cổng 6" },
  ]);

  // Giữ query mới nhất trong ref để fetchRows không cần đổi identity liên tục
  const queryRef = useRef(debouncedQuery);
  queryRef.current = debouncedQuery;

  // Giữ rows mới nhất trong ref -> đọc được state hiện tại trong các callback
  // ổn định (useCallback deps rỗng) mà KHÔNG cần lồng setState bên trong setState.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await baoTaiService.getAllBaoTai({
        search: queryRef.current || undefined,
      });
      const data = res?.data ?? res ?? [];
      setRows(Array.isArray(data) ? data.map(normalizeRow) : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchRows();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRows, debouncedQuery]);

  // Cập nhật UI ngay (optimistic), rồi gọi API tương ứng theo field vừa đổi.
  // Đây là hàm THUẦN theo nghĩa: chỉ gọi setRows 1 lần trực tiếp, không lồng
  // trong updater function nào khác -> an toàn với StrictMode (không bị gọi đúp).
  const updateRow = useCallback(
    async (id, uiPatch, extraApiPatch) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...uiPatch } : r)),
      );

      try {
        if ("nvTk" in uiPatch || "congXuat" in uiPatch) {
          await baoTaiService.updateNvTkCongXuatBaoTai(id, {
            nv_tk: "nvTk" in uiPatch ? uiPatch.nvTk || null : undefined,
            cong_xuat:
              "congXuat" in uiPatch ? uiPatch.congXuat || null : undefined,
          });
        } else {
          const apiPatch = { ...extraApiPatch };
          for (const [key, value] of Object.entries(uiPatch)) {
            apiPatch[UI_TO_API_FIELD[key] ?? key] = value;
          }
          await baoTaiService.updateBaoTai(id, apiPatch);
        }
      } catch (err) {
        // Rollback nếu API lỗi
        setError(err);
        fetchRows();
      }
    },
    [fetchRows],
  );

  // CHECKIN: tính STT dựa trên rowsRef.current (luôn mới nhất) thay vì lồng
  // setState -> tránh bug StrictMode gọi updater 2 lần, tránh phải F5.
  const handleCheckIn = useCallback(
    async (row) => {
      if (pendingIds.has(row.id)) return; // đang xử lý dở, bỏ qua click thêm

      setPendingIds((prev) => new Set(prev).add(row.id));

      const now = new Date().toLocaleTimeString("vi-VN", { hour12: false });
      const nextStt =
        rowsRef.current.filter((r) => r.status === STATUS.DA_VAO).length + 1;

      try {
        await updateRow(
          row.id,
          { status: STATUS.DA_VAO, thoiGianVao: now, stt: String(nextStt) },
          { check_in: now },
        );
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [updateRow, pendingIds],
  );

  // UNCHECK: hoàn tác CHECKIN.
  const handleUncheck = useCallback(
    async (row) => {
      if (pendingIds.has(row.id)) return;

      setPendingIds((prev) => new Set(prev).add(row.id));

      try {
        await updateRow(
          row.id,
          { status: STATUS.CHUA_VAO, thoiGianVao: "", stt: "" },
          { check_in: "" },
        );
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [updateRow, pendingIds],
  );

  const handleBsxChange = useCallback((id, value) => {
    setBsxDrafts((prev) => ({ ...prev, [id]: value }));
    setBsxErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleBsxBlur = useCallback(
    (row) => {
      setBsxDrafts((prevDrafts) => {
        const draft = prevDrafts[row.id];
        if (draft === undefined) return prevDrafts;

        const { formatted, error } = formatBsx(draft);

        if (error) {
          setBsxErrors((prev) => ({ ...prev, [row.id]: error }));
          return prevDrafts;
        }

        setBsxErrors((prev) => {
          if (!(row.id in prev)) return prev;
          const next = { ...prev };
          delete next[row.id];
          return next;
        });

        if (formatted !== row.bsx) {
          updateRow(row.id, { bsx: formatted });
        }

        const next = { ...prevDrafts };
        delete next[row.id];
        return next;
      });
    },
    [updateRow],
  );

  const handleNvTkChange = useCallback(
    (id, value) => updateRow(id, { nvTk: value }),
    [updateRow],
  );

  const handleCongXuatChange = useCallback(
    (id, value) => updateRow(id, { congXuat: value }),
    [updateRow],
  );

  const handlePrint = useCallback((row) => {
    setPrintRow(row);
    requestAnimationFrame(() => window.print());
  }, []);

  const handleConfirmImport = useCallback(
    async (parsedRows) => {
      setImporting(true);
      try {
        await baoTaiService.importManyBaoTai(parsedRows);
        setImportModalOpen(false);
        await fetchRows();
      } catch (err) {
        setError(err);
      } finally {
        setImporting(false);
      }
    },
    [fetchRows],
  );

  const handleCreateSll = useCallback(
    async ({ nvc, bsx }) => {
      setCreating(true);
      try {
        await baoTaiService.createBaoTaiSLL({ nvc, bsx });
        setSllModalOpen(false);
        await fetchRows();
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [fetchRows],
  );

  const handleCreateNew = useCallback(
    async ({ nvc, chuyen, bsx }) => {
      setCreating(true);
      try {
        await baoTaiService.createBaoTai({ nvc, chuyen, bsx });
        setNewModalOpen(false);
        await fetchRows();
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [fetchRows],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nvc?.toLowerCase().includes(q) ||
        r.bsx?.toLowerCase().includes(q) ||
        String(r.stt).includes(q),
    );
  }, [rows, debouncedQuery]);

  return (
    <div
      className="min-h-screen w-full bg-white text-slate-800"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>
      <style>{PRINT_STYLE}</style>

      {!isDieuVan && (
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-end gap-4 px-6 py-4">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <MenuIcon className="h-4 w-4" />
                Menu
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    onClick={() => {
                      setImportModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Import kế hoạch xe
                  </button>
                  <button
                    onClick={() => {
                      setNvTkModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings2 className="h-4 w-4" />
                    Quản lý NV_TK
                  </button>
                  <button
                    onClick={() => {
                      setCongXuatModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings2 className="h-4 w-4" />
                    Quản lý Cổng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm NCC, BSX, STT..."
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
          />
        </div>

        {canShowActionButtons && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSllModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm SLL
            </button>
            <button
              onClick={() => setNewModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm mới
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100">
              <Trash2 className="h-3.5 w-3.5" />
              Xóa
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-10">
        <div className="bt-scroll overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-display text-[13px] uppercase tracking-wide text-slate-600">
                <th className="whitespace-nowrap px-4 py-3 font-600">
                  Nhà Vận Chuyển
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-600">Chuyến</th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-600">
                  STT
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-600">BSX</th>
                <th className="whitespace-nowrap px-4 py-3 font-600">
                  CHECK
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-600">
                  Thời gian vào
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-600">Status</th>
                {canShowNvTkCongXuatSpeaker && (
                  <>
                    <th className="whitespace-nowrap px-4 py-3 font-600">
                      NV_TK
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-600">
                      Cổng xuất
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-600">
                      Đọc loa
                    </th>
                  </>
                )}
                {canShowPrintColumn && (
                  <th className="whitespace-nowrap px-4 py-3 text-center font-600">
                    IN
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-4 py-14 text-center text-sm text-rose-500"
                  >
                    Không tải được dữ liệu.{" "}
                    <button
                      onClick={fetchRows}
                      className="font-semibold underline underline-offset-2 hover:text-rose-600"
                    >
                      Thử lại
                    </button>
                  </td>
                </tr>
              )}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    Chưa có xe nào trong danh sách. Dùng Menu &gt; Import kế
                    hoạch xe để thêm dữ liệu.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filtered.map((row, idx) => (
                  <BaoTaiRow
                    key={row.id}
                    row={row}
                    idx={idx}
                    isDieuVan={isDieuVan}
                    canEditBsx={canEditBsx}
                    canShowNvTkCongXuatSpeaker={canShowNvTkCongXuatSpeaker}
                    canShowPrintColumn={canShowPrintColumn}
                    bsxDraft={bsxDrafts[row.id]}
                    bsxError={bsxErrors[row.id]}
                    nvTkList={nvTkList}
                    congXuatList={congXuatList}
                    isPending={pendingIds.has(row.id)}
                    onBsxChange={handleBsxChange}
                    onBsxBlur={handleBsxBlur}
                    onCheckIn={handleCheckIn}
                    onUncheck={handleUncheck}
                    onNvTkChange={handleNvTkChange}
                    onCongXuatChange={handleCongXuatChange}
                    onPrint={handlePrint}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {importModalOpen && (
        <ImportBaoTaiModal
          onClose={() => setImportModalOpen(false)}
          onConfirm={handleConfirmImport}
          importing={importing}
        />
      )}

      {nvTkModalOpen && (
        <NvTkModal
          items={nvTkList}
          setItems={setNvTkList}
          onClose={() => setNvTkModalOpen(false)}
        />
      )}

      {congXuatModalOpen && (
        <CongXuatModal
          items={congXuatList}
          setItems={setCongXuatList}
          onClose={() => setCongXuatModalOpen(false)}
        />
      )}

      {sllModalOpen && (
        <AddSllModal
          onClose={() => setSllModalOpen(false)}
          onSubmit={handleCreateSll}
          submitting={creating}
        />
      )}

      {newModalOpen && (
        <AddNewModal
          onClose={() => setNewModalOpen(false)}
          onSubmit={handleCreateNew}
          submitting={creating}
        />
      )}

      <PhieuBaoTaiPrint row={printRow} />
    </div>
  );
};

export default BaoTaiDieuVan;
