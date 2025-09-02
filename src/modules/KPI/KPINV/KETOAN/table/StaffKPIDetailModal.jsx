/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, useRef } from "react";
import { checkKPIService } from "@/services/checkkpistaff.service";

// unwrap helper cho mọi kiểu response
const unwrapArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.success === false) return [];
  return [];
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Helper function để lấy thông tin user từ localStorage
const getUserFromStorage = () => {
  try {
    const possibleKeys = [
      "user",
      "userData",
      "auth",
      "currentUser",
      "loginUser",
      "userInfo",
    ];
    for (const key of possibleKeys) {
      const userData = localStorage.getItem(key);
      if (userData) {
        const parsed = JSON.parse(userData);
        const userName =
          parsed.name ||
          parsed.ho_ten ||
          parsed.fullName ||
          parsed.username ||
          parsed.ten ||
          parsed.displayName ||
          parsed.user_name ||
          (parsed.user &&
            (parsed.user.name || parsed.user.ho_ten || parsed.user.fullName));
        if (userName) return userName;
      }
    }
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
  }
  return "Unknown User";
};

// Function tính NV đánh giá dựa trên da_thuc_hien và ty_trong
// NEW: NV đánh giá giống CheckKPISimpleModal
const calculateNVDanhGia = ({ daThucHien, tyTrong, donViTinh, kyHieu }) => {
  const w = Number(tyTrong || 0);
  const th = Number(daThucHien || 0);

  const isPercentRow =
    String(donViTinh || "").trim() === "%" ||
    String(donViTinh || "").includes("%") ||
    ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

  if (!isPercentRow) {
    // Hàng "Lỗi": trừ từ tỷ trọng gốc theo số lỗi đã thực hiện
    if (th === 0) return w;
    if (w >= 1 && w <= 9) {
      const deduction = th * 1; // mỗi lỗi -1%
      return Math.max(0, w - deduction);
    } else if (w >= 10) {
      const deductionPerError = w / 2; // mỗi lỗi -1/2 w
      const totalDeduction = th * deductionPerError;
      return Math.max(0, w - totalDeduction);
    }
    return w;
  }

  // Hàng % (hoặc F1/F2): tính theo % thực hiện
  const pct = Math.max(0, Math.min(100, th)); // clamp 0..100
  return Math.round(((w * pct) / 100) * 100) / 100;
};

const StaffKPIDetailModal = ({ staff, onClose, selectedYear }) => {
  // Sử dụng selectedYear từ props, fallback về năm hiện tại
  const targetYear = useMemo(
    () => Number(selectedYear || new Date().getFullYear()),
    [selectedYear]
  );

  const defaultMonth = useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    if (targetYear === currentYear) {
      const currentMonth = currentDate.getMonth() + 1;
      return MONTHS.includes(currentMonth) ? currentMonth : 1;
    } else if (targetYear > currentYear) {
      return 1; // năm tương lai → tháng 1
    } else {
      return 12; // năm quá khứ → tháng 12
    }
  }, [targetYear]);

  const [activeMonth, setActiveMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const originalItemsRef = useRef([]); // giữ snapshot trước khi cập nhật

  // Map tháng -> record
  const [byMonth, setByMonth] = useState(() =>
    Object.fromEntries(MONTHS.map((m) => [m, null]))
  );

  const record = byMonth[activeMonth];

  // Fix: Move items calculation after record is defined
  const items = useMemo(() => {
    return Array.isArray(record?.danh_sach_check) ? record.danh_sach_check : [];
  }, [record?.danh_sach_check]);

  // ==== Edit mode state ====
  const [editMode, setEditMode] = useState(false);
  const [editableItems, setEditableItems] = useState([]);
  const [updateNote, setUpdateNote] = useState("");
  const [updateNoteError, setUpdateNoteError] = useState("");
  const noteRef = useRef(null);
  const isNoteEmpty = useMemo(
    () => updateNote.trim().length === 0,
    [updateNote]
  );

  // Thêm state để track việc save thành công
  const [saveSuccess, setSaveSuccess] = useState(false);

  const storedScore = Number(record?.ty_trong_thang || 0);

  // Khi đổi record (tháng), sync editableItems
  useEffect(() => {
    if (record?.danh_sach_check) {
      setEditableItems(
        record.danh_sach_check.map((it) => ({
          kpi: it.kpi,
          ty_trong: Number(it.ty_trong ?? 0),
          so_loi: Number(it.so_loi ?? 0),
          noi_dung_loi: String(it.noi_dung_loi ?? ""),
          ky_hieu: String(it.ky_hieu ?? ""),
          don_vi_tinh: String(it.don_vi_tinh ?? ""),
          // Thêm các field mới
          da_thuc_hien: String(it.da_thuc_hien ?? ""),
          ke_hoach_quy: String(it.ke_hoach_quy ?? ""),
          chu_ki: String(it.chu_ki ?? ""),
          nv_danh_gia: String(it.nv_danh_gia ?? ""),
          cac_do_luong: String(it.cac_do_luong ?? ""),
          bp_theo_doi: String(it.bp_theo_doi ?? ""),
        }))
      );
    } else {
      setEditableItems([]);
    }
    setUpdateNote("");
    setUpdateNoteError("");
    setEditMode(false);
    setSaveSuccess(false);
    originalItemsRef.current = []; // reset baseline khi đổi tháng/record
  }, [record?._id, activeMonth]);

  const fetchAllOfYear = async () => {
    const payload = { ma_nhan_vien: staff?.ma_nhan_vien, nam: targetYear };
    if (!payload.ma_nhan_vien) return;

    setLoading(true);
    setError("");
    try {
      const res = await checkKPIService.getAllCheckKPI(payload);
      const arr = unwrapArray(res);

      const sameYear = arr
        .filter((r) => Number(r?.nam) === Number(targetYear))
        .sort((a, b) => Number(a?.thang || 0) - Number(b?.thang || 0));

      const grouped = Object.fromEntries(MONTHS.map((m) => [m, null]));
      for (const r of sameYear) {
        const m = Number(r?.thang);
        if (!MONTHS.includes(m)) continue;
        if (!grouped[m]) {
          grouped[m] = r;
        } else {
          const t1 = new Date(grouped[m]?.ngay_tao || 0).getTime();
          const t2 = new Date(r?.ngay_tao || 0).getTime();
          if (t2 >= t1) grouped[m] = r;
        }
      }
      setByMonth(grouped);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Có lỗi khi tải danh sách Check KPI.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Gọi fetch khi modal mount + khi ma_nhan_vien hoặc targetYear đổi
  useEffect(() => {
    fetchAllOfYear();
  }, [staff?.ma_nhan_vien, targetYear]);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  // GIỐNG CheckKPISimpleModal
  const calculateTyTrongCuoi = ({
    cbqlDanhGia,
    tyTrong,
    donViTinh,
    kyHieu,
  }) => {
    const w = Number(tyTrong || 0);
    const cbql = Number(cbqlDanhGia || 0);

    const isPercentRow =
      String(donViTinh || "").trim() === "%" ||
      String(donViTinh || "").includes("%") ||
      ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

    const isErrorRow = String(donViTinh || "")
      .toLowerCase()
      .includes("lỗi");

    if (isErrorRow) {
      if (cbql === 0) return w; // 0 lỗi → giữ nguyên

      if (w >= 1 && w <= 9) {
        // 1-9%: mỗi lỗi trừ 1%
        const deduction = cbql * 1;
        return Math.max(0, w - deduction);
      } else if (w >= 10) {
        // ≥10%: mỗi lỗi trừ 1/2 tỷ trọng
        const deductionPerError = w / 2;
        const totalDeduction = cbql * deductionPerError;
        return Math.max(0, w - totalDeduction);
      }
      return w;
    } else if (isPercentRow) {
      const pct = Math.max(0, Math.min(100, cbql)); // clamp 0..100
      return Math.round(((w * pct) / 100) * 100) / 100;
    }

    // Mặc định: quy theo %
    const pct = Math.max(0, Math.min(100, cbql));
    return Math.round(((w * pct) / 100) * 100) / 100;
  };

  // ==== Nhật ký cập nhật theo từng KPI (tính từ record.updates + snapshot) ====
  const { perItemLog } = useMemo(() => {
    const resultLogs = {};
    if (!record || !Array.isArray(items) || items.length === 0) {
      return { perItemLog: resultLogs };
    }

    const updates = Array.isArray(record.updates) ? [...record.updates] : [];
    if (updates.length > 0) {
      updates.sort(
        (a, b) =>
          new Date(a?.at || 0).getTime() - new Date(b?.at || 0).getTime()
      );

      const eqNum = (a, b) => Number(a ?? 0) === Number(b ?? 0); // "" ~ 0
      const eqStr = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

      // baseline:
      // 1) nếu backend có snapshot_before -> dùng
      // 2) nếu KHÔNG có và đây là lần cập nhật đầu (updates.length===1) -> dùng
      //    ảnh trước khi sửa lưu tại client (originalItemsRef.current)
      // 3) fallback: dùng snapshot sau (ít nhất không crash)
      let prevSnap =
        updates[0]?.snapshot_before?.danh_sach_check ??
        (updates.length === 1 && originalItemsRef.current.length
          ? originalItemsRef.current
          : undefined) ??
        updates[0]?.snapshot?.danh_sach_check ??
        items;

      for (let i = 0; i < updates.length; i++) {
        const u = updates[i];
        const currSnap = Array.isArray(u?.snapshot?.danh_sach_check)
          ? u.snapshot.danh_sach_check
          : i === updates.length - 1
          ? items
          : prevSnap;

        const len = Math.max(prevSnap?.length || 0, currSnap?.length || 0);
        for (let idx = 0; idx < len; idx++) {
          const prevIt = prevSnap[idx] || {};
          const currIt = currSnap[idx] || {};

          const changed =
            !eqNum(prevIt?.so_loi, currIt?.so_loi) ||
            !eqStr(prevIt?.noi_dung_loi, currIt?.noi_dung_loi) ||
            !eqStr(prevIt?.ky_hieu, currIt?.ky_hieu) ||
            !eqStr(prevIt?.don_vi_tinh, currIt?.don_vi_tinh) ||
            !eqNum(prevIt?.da_thuc_hien, currIt?.da_thuc_hien) ||
            !eqStr(prevIt?.ke_hoach_quy, currIt?.ke_hoach_quy) ||
            !eqStr(prevIt?.chu_ki, currIt?.chu_ki) ||
            !eqNum(prevIt?.nv_danh_gia, currIt?.nv_danh_gia) ||
            !eqStr(prevIt?.cac_do_luong, currIt?.cac_do_luong) ||
            !eqStr(prevIt?.bp_theo_doi, currIt?.bp_theo_doi);

          if (changed) {
            if (!resultLogs[idx]) resultLogs[idx] = [];
            resultLogs[idx].push({
              by_name: u?.by_name || getUserFromStorage(),
              at: u?.at ? new Date(u.at) : null,
              note: u?.note || "",
              from: {
                so_loi: prevIt?.so_loi ?? 0,
                noi_dung_loi: prevIt?.noi_dung_loi ?? "",
                ky_hieu: prevIt?.ky_hieu ?? "",
                don_vi_tinh: prevIt?.don_vi_tinh ?? "",
                da_thuc_hien: prevIt?.da_thuc_hien ?? 0,
                ke_hoach_quy: prevIt?.ke_hoach_quy ?? "",
                chu_ki: prevIt?.chu_ki ?? "",
                nv_danh_gia: prevIt?.nv_danh_gia ?? 0,
                cac_do_luong: prevIt?.cac_do_luong ?? "",
                bp_theo_doi: prevIt?.bp_theo_doi ?? "",
              },
              to: {
                so_loi: currIt?.so_loi ?? 0,
                noi_dung_loi: currIt?.noi_dung_loi ?? "",
                ky_hieu: currIt?.ky_hieu ?? "",
                don_vi_tinh: currIt?.don_vi_tinh ?? "",
                da_thuc_hien: currIt?.da_thuc_hien ?? 0,
                ke_hoach_quy: currIt?.ke_hoach_quy ?? "",
                chu_ki: currIt?.chu_ki ?? "",
                nv_danh_gia: currIt?.nv_danh_gia ?? 0,
                cac_do_luong: currIt?.cac_do_luong ?? "",
                bp_theo_doi: currIt?.bp_theo_doi ?? "",
              },
            });
          }
        }
        prevSnap = currSnap;
      }
    }

    return { perItemLog: resultLogs };
  }, [record, items]);

  // Modal xem chi tiết nhật ký của 1 KPI
  const [logModal, setLogModal] = useState({ open: false, index: null });
  const openLogFor = (idx) => setLogModal({ open: true, index: idx });
  const closeLogModal = () => setLogModal({ open: false, index: null });

  // ===== Handlers cho edit & save =====
  const enterEdit = () => {
    if (!record) return;
    setEditMode(true);
    setUpdateNote("");
    setUpdateNoteError("");
    setSaveSuccess(false);

    setEditableItems(
      (originalItemsRef.current = items.map((it) => {
        const nvCalc = calculateNVDanhGia({
          daThucHien: it.da_thuc_hien ?? 0,
          tyTrong: it.ty_trong ?? 0,
          donViTinh: it.don_vi_tinh ?? "",
          kyHieu: it.ky_hieu ?? "",
        });

        return {
          kpi: it.kpi,
          ty_trong: Number(it.ty_trong ?? 0),
          so_loi: Number(it.so_loi ?? 0),
          noi_dung_loi: String(it.noi_dung_loi ?? ""),
          ky_hieu: String(it.ky_hieu ?? ""),
          don_vi_tinh: String(it.don_vi_tinh ?? ""),

          // NEW
          da_thuc_hien: String(it.da_thuc_hien ?? ""),
          ke_hoach_quy: String(it.ke_hoach_quy ?? ""),
          chu_ki: String(it.chu_ki ?? ""),
          nv_danh_gia: String(nvCalc), // ← tính lại theo logic mới
          cac_do_luong: String(it.cac_do_luong ?? ""),
          bp_theo_doi: String(it.bp_theo_doi ?? ""),
        };
      }))
    );
  };

  const cancelEdit = () => {
    setEditableItems(
      items.map((it) => ({
        kpi: it.kpi,
        ty_trong: Number(it.ty_trong ?? 0),
        so_loi: Number(it.so_loi ?? 0),
        noi_dung_loi: String(it.noi_dung_loi ?? ""),
        ky_hieu: String(it.ky_hieu ?? ""),
        don_vi_tinh: String(it.don_vi_tinh ?? ""),
        // Thêm các field mới
        da_thuc_hien: String(it.da_thuc_hien ?? ""),
        ke_hoach_quy: String(it.ke_hoach_quy ?? ""),
        chu_ki: String(it.chu_ki ?? ""),
        nv_danh_gia: String(it.nv_danh_gia ?? ""),
        cac_do_luong: String(it.cac_do_luong ?? ""),
        bp_theo_doi: String(it.bp_theo_doi ?? ""),
      }))
    );
    setUpdateNote("");
    setUpdateNoteError("");
    setEditMode(false);
    setSaveSuccess(false);
  };

  // Cập nhật field theo idx
  const updateItemField = (idx, field, value) => {
    setEditableItems((prev) => {
      const next = [...prev];
      const curr = { ...next[idx] };

      if (field === "so_loi") {
        const n = Number(value);
        curr.so_loi = Number.isNaN(n) || n < 0 ? 0 : n;
      } else if (field === "da_thuc_hien") {
        // NEW: clamp + tính NV đánh giá theo CheckKPISimpleModal
        const isPercentRow =
          String(curr.don_vi_tinh || "").includes("%") ||
          ["F1", "F2"].includes(String(curr.ky_hieu || "").toUpperCase());

        let num = Number(value);
        if (Number.isNaN(num) || num < 0) num = 0;
        if (isPercentRow && num > 100) num = 100;

        curr.da_thuc_hien = String(num);
        curr.nv_danh_gia = String(
          calculateNVDanhGia({
            daThucHien: num,
            tyTrong: curr.ty_trong,
            donViTinh: curr.don_vi_tinh,
            kyHieu: curr.ky_hieu,
          })
        );
      } else if (field === "noi_dung_loi") {
        curr.noi_dung_loi = value;
      } else if (field === "ky_hieu") {
        curr.ky_hieu = value;
      } else if (field === "don_vi_tinh") {
        curr.don_vi_tinh = value;
      } else if (field === "ke_hoach_quy") {
        curr.ke_hoach_quy = value;
      } else if (field === "chu_ki") {
        curr.chu_ki = value;
      } else if (field === "nv_danh_gia") {
        // (giữ nguyên nếu bạn có chỗ khác set thủ công; còn mặc định ta auto tính ở trên)
        curr.nv_danh_gia = value;
      } else if (field === "cac_do_luong") {
        curr.cac_do_luong = value;
      } else if (field === "bp_theo_doi") {
        curr.bp_theo_doi = value;
      }

      next[idx] = curr;
      return next;
    });
  };

  const handleSave = async () => {
    if (!record?._id) return;

    // Validate lý do cập nhật không để trống
    const trimmedNote = updateNote.trim();
    if (trimmedNote.length === 0) {
      setUpdateNoteError("Lý do cập nhật không được để trống.");
      noteRef.current?.focus();
      // Scroll to the note input nếu cần
      noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      setSaving(true);
      setSaveSuccess(false);

      const userName = getUserFromStorage();

      // Tính toán điểm cuối cùng dựa trên editableItems thực tế
      const finalScoreToSave = editableItems.reduce((total, item) => {
        const soLoi = Number(item?.so_loi ?? 0);
        const tyTrong = Number(item?.ty_trong ?? 0);
        const donViTinh = String(item?.don_vi_tinh ?? "");
        const kyHieu = String(item?.ky_hieu ?? "");

        const tyTrongCuoi = calculateTyTrongCuoi({
          cbqlDanhGia: soLoi,
          tyTrong,
          donViTinh,
          kyHieu,
        });

        return total + tyTrongCuoi;
      }, 0);

      await checkKPIService.updateCheckKPI(record._id, {
        danh_sach_check: editableItems,
        ty_trong_thang: Math.round(finalScoreToSave * 100) / 100,
        update_note: trimmedNote, // Sử dụng trimmed note
        by_name: userName,
      });

      setSaveSuccess(true);
      await fetchAllOfYear();
      setEditMode(false);
      setUpdateNote("");
      setUpdateNoteError("");
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Lưu cập nhật thất bại.";
      alert(msg);
      setSaveSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  // Đóng modal chính
  const handleClose = () => {
    if (logModal.open) return; // Không đóng nếu modal con đang mở
    onClose();
  };

  // ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (logModal.open) {
          closeLogModal();
        } else if (editMode) {
          cancelEdit();
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [logModal.open, editMode]);

  // Helper function trạng thái năm
  const getYearStatus = () => {
    const currentYear = new Date().getFullYear();
    if (targetYear > currentYear) return "future";
    if (targetYear === currentYear) return "current";
    return "past";
  };
  const yearStatus = getYearStatus();

  return (
    <>
      {/* Modal chính */}
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <div className="w-full max-w-[95vw] rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="space-y-1">
              <h3 className="text-base md:text-lg font-semibold text-slate-800">
                Chi tiết KPI đã check
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                  Mã NV:{" "}
                  <b className="ml-1 font-semibold">{staff?.ma_nhan_vien}</b>
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">
                  Họ tên: <b className="ml-1 font-semibold">{staff?.ho_ten}</b>
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-200">
                  Đơn vị: <b className="ml-1 font-semibold">{staff?.don_vi}</b>
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    yearStatus === "current"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : yearStatus === "future"
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  }`}
                >
                  Năm: <b className="ml-1 font-semibold">{targetYear}</b>
                  <span className="ml-1">
                    {yearStatus === "current"
                      ? "(Hiện tại)"
                      : yearStatus === "future"
                      ? "(Tương lai)"
                      : "(Quá khứ)"}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!editMode ? (
                <button
                  onClick={enterEdit}
                  disabled={!record}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  title="Cập nhật thông tin KPI"
                >
                  Cập nhật
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || isNoteEmpty}
                    title={
                      saving
                        ? "Đang xử lý..."
                        : isNoteEmpty
                        ? "Vui lòng nhập lý do cập nhật trước khi lưu"
                        : "Lưu các thay đổi"
                    }
                    className={`
                      relative rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${
                        saving || isNoteEmpty
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 transform hover:scale-105"
                      }
                    `}
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Đang lưu...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        Lưu thay đổi
                      </div>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={handleClose}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>

          {/* Success notification */}
          {saveSuccess && (
            <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 text-sm flex items-center gap-2">
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Cập nhật thành công! Dữ liệu đã được lưu.
            </div>
          )}

          {/* Thông tin tính điểm */}
          {record && (
            <div className="mx-4 mt-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Tỷ trọng ban đầu:</span>
                    <span className="font-semibold text-slate-800">100%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-sm">
                    Điểm cuối cùng tháng {activeMonth}/{targetYear}:
                  </span>
                  <div
                    className={`inline-flex items-center rounded-full px-4 py-2 text-lg font-bold ring-2 ${
                      storedScore < 100
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {storedScore}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Body */}
          <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
            {/* Tháng selector */}
            <div className="space-y-3">
              {/* Mobile */}
              <div className="-mx-2 px-2 md:hidden">
                <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                  {MONTHS.map((m) => {
                    const active = activeMonth === m;
                    return (
                      <button
                        key={`m-sm-${m}`}
                        onClick={() => setActiveMonth(m)}
                        className={[
                          "snap-start shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium ring-1 transition-all duration-200",
                          active
                            ? "bg-indigo-600 text-white ring-indigo-500"
                            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
                        ].join(" ")}
                        aria-pressed={active}
                      >
                        Tháng {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid grid-cols-6 lg:grid-cols-12 gap-2">
                {MONTHS.map((m) => {
                  const active = activeMonth === m;
                  return (
                    <button
                      key={`m-lg-${m}`}
                      onClick={() => setActiveMonth(m)}
                      className={[
                        "w-full px-3 py-2 rounded-xl text-sm font-medium ring-1 transition-all duration-200",
                        active
                          ? "bg-indigo-600 text-white ring-indigo-500"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      Tháng {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú cập nhật khi ở edit mode */}
            {editMode && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
                <label
                  htmlFor="update-note-input"
                  className="block text-sm font-semibold text-amber-800 mb-2"
                >
                  Lý do cập nhật: <span className="text-red-500">*</span>
                </label>
                <input
                  id="update-note-input"
                  ref={noteRef}
                  value={updateNote}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUpdateNote(v);
                    // Clear error khi user bắt đầu nhập
                    if (v.trim().length > 0) {
                      setUpdateNoteError("");
                    }
                  }}
                  onBlur={() => {
                    if (updateNote.trim().length === 0) {
                      setUpdateNoteError("Lý do cập nhật không được để trống.");
                    }
                  }}
                  placeholder="Ví dụ: Điều chỉnh theo biên bản soát ngày 20/08"
                  aria-invalid={!!updateNoteError}
                  aria-describedby={
                    updateNoteError ? "update-note-error" : undefined
                  }
                  className={`
                    w-full rounded-lg px-3 py-2.5 text-sm outline-none shadow-sm transition-all duration-200
                    ${
                      updateNoteError
                        ? "border-2 border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:bg-white"
                        : "border border-amber-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    }
                  `}
                />
                {updateNoteError && (
                  <div className="mt-2 flex items-start gap-2">
                    <svg
                      className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p
                      id="update-note-error"
                      className="text-sm text-red-600 font-medium"
                    >
                      {updateNoteError}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 font-medium ring-1 ring-amber-200">
                    Người cập nhật:{" "}
                    <span className="ml-1 font-semibold">
                      {getUserFromStorage()}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Status/error */}
            {loading && (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang tải dữ liệu năm {targetYear}...
              </div>
            )}
            {!loading && error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm flex items-start gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Bảng KPI với các cột mới theo thứ tự yêu cầu */}
            {!loading && !error && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-lg">
                <table className="w-full text-sm bg-white min-w-[1800px]">
                  <colgroup>
                    <col className="w-[8%]" /> {/* Ký hiệu */}
                    <col className="w-[20%]" /> {/* KPI */}
                    <col className="w-[8%]" /> {/* Tỷ trọng */}
                    <col className="w-[10%]" /> {/* Các đo lường */}
                    <col className="w-[8%]" /> {/* Kế hoạch quý */}
                    <col className="w-[8%]" /> {/* Đã thực hiện */}
                    <col className="w-[8%]" /> {/* Đơn vị tính */}
                    <col className="w-[8%]" /> {/* NV đánh giá */}
                    <col className="w-[8%]" /> {/* BP theo dõi */}
                    <col className="w-[6%]" /> {/* Chu kì */}
                    <col className="w-[8%]" /> {/* Số lỗi */}
                    <col className="w-[8%]" /> {/* Tỷ trọng cuối */}
                    <col className="w-[20%]" /> {/* Nội dung lỗi */}
                  </colgroup>
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr className="text-center">
                      <th className="p-3 font-bold text-slate-700">Ký hiệu</th>
                      <th className="p-3 font-bold text-slate-700">KPI</th>
                      <th className="p-3 font-bold text-slate-700">Tỷ trọng</th>
                      <th className="p-3 font-bold text-slate-700">
                        Các đo lường
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        Kế hoạch quý
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        Đã thực hiện
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        Đơn vị tính
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        NV đánh giá
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        BP theo dõi
                      </th>
                      <th className="p-3 font-bold text-slate-700">Chu kì</th>
                      <th className="p-3 font-bold text-slate-700">
                        CBQL Đánh giá
                      </th>
                      <th className="p-3 font-bold text-slate-700">
                        Tỷ trọng cuối
                      </th>
                      <th className="p-3 font-bold text-slate-700">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!record && (
                      <tr>
                        <td
                          colSpan="13"
                          className="p-6 text-center text-slate-500"
                        >
                          <div className="text-4xl mb-2">📋</div>
                          Chưa có dữ liệu check KPI cho tháng {activeMonth}/
                          {targetYear}
                        </td>
                      </tr>
                    )}
                    {record && items.length === 0 && (
                      <tr>
                        <td
                          colSpan="13"
                          className="p-6 text-center text-slate-500"
                        >
                          <div className="text-4xl mb-2">📊</div>
                          Không có danh sách KPI để check
                        </td>
                      </tr>
                    )}
                    {items.map((item, idx) => {
                      const currentItem = editMode ? editableItems[idx] : item;
                      const soLoi = Number(currentItem?.so_loi ?? 0);
                      const tyTrong = Number(currentItem?.ty_trong ?? 0);
                      const donViTinh = String(currentItem?.don_vi_tinh ?? "");
                      const kyHieu = String(currentItem?.ky_hieu ?? "");
                      const tyTrongCuoi = calculateTyTrongCuoi({
                        cbqlDanhGia: soLoi,
                        tyTrong,
                        donViTinh,
                        kyHieu,
                      });
                      const daThucHien = String(
                        currentItem?.da_thuc_hien ?? ""
                      );
                      const keHoachQuy = String(
                        currentItem?.ke_hoach_quy ?? ""
                      );
                      const chuKi = String(currentItem?.chu_ki ?? "");
                      const nvDanhGia = String(currentItem?.nv_danh_gia ?? "");
                      const cacDoLuong = String(
                        currentItem?.cac_do_luong ?? ""
                      );
                      const bpTheoDoi = String(currentItem?.bp_theo_doi ?? "");
                      const updateCount = perItemLog[idx]?.length || 0;
                      const hasUpdateHistory = updateCount > 0;

                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Ký hiệu */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={kyHieu}
                                disabled
                                readOnly
                                placeholder="F1"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-center text-sm cursor-not-allowed opacity-70"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm">
                                {kyHieu || "---"}
                              </span>
                            )}
                          </td>

                          {/* KPI */}
                          <td className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-slate-800 font-medium break-words text-sm">
                                {currentItem?.kpi || "---"}
                              </span>
                              {hasUpdateHistory && (
                                <button
                                  onClick={() => openLogFor(idx)}
                                  className="shrink-0 flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors ring-1 ring-blue-200"
                                  title="Xem lịch sử cập nhật"
                                >
                                  📝 {updateCount}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Tỷ trọng */}
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-slate-700 ring-1 ring-slate-200 text-sm">
                              {tyTrong}%
                            </span>
                          </td>

                          {/* Các đo lường */}
                          <td className="p-3">
                            {editMode ? (
                              <textarea
                                rows="2"
                                value={cacDoLuong}
                                disabled
                                readOnly
                                placeholder="Các chỉ số đo lường"
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-sm cursor-not-allowed opacity-70 resize-none"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm break-words w-24">
                                {cacDoLuong || "---"}
                              </span>
                            )}
                          </td>

                          {/* Kế hoạch quý */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={keHoachQuy}
                                disabled
                                readOnly
                                placeholder="KH quý"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-center text-sm cursor-not-allowed opacity-70"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm">
                                {keHoachQuy || "---"}
                              </span>
                            )}
                          </td>

                          {/* Đã thực hiện */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                step={
                                  (donViTinh || "")
                                    .toLowerCase()
                                    .includes("%") ||
                                  ["F1", "F2"].includes(kyHieu.toUpperCase())
                                    ? "0.1"
                                    : "1"
                                }
                                value={daThucHien}
                                onChange={(e) =>
                                  updateItemField(
                                    idx,
                                    "da_thuc_hien",
                                    e.target.value
                                  )
                                }
                                placeholder="Thực hiện"
                                className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all duration-200"
                              />
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${
                                  Number(daThucHien) > 0
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                {daThucHien || "0"}
                                {(donViTinh || "")
                                  .toLowerCase()
                                  .includes("%") ||
                                ["F1", "F2"].includes(kyHieu.toUpperCase())
                                  ? "%"
                                  : ""}
                              </span>
                            )}
                          </td>

                          {/* Đơn vị tính */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={donViTinh}
                                disabled
                                readOnly
                                placeholder="%, Lỗi"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-center text-sm cursor-not-allowed opacity-70"
                              />
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  (donViTinh || "")
                                    .toLowerCase()
                                    .includes("%") || donViTinh === "%"
                                    ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                {donViTinh || "---"}
                              </span>
                            )}
                          </td>

                          {/* NV đánh giá (tự động tính từ da_thuc_hien) */}
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${
                                Number(nvDanhGia) > 0
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                              }`}
                              title={`Gốc: ${tyTrong}% • TH: ${daThucHien}${
                                (donViTinh || "").toLowerCase().includes("%") ||
                                ["F1", "F2"].includes(kyHieu.toUpperCase())
                                  ? "%"
                                  : " (số lỗi)"
                              }`}
                            >
                              {nvDanhGia || "0"}%
                            </span>
                          </td>

                          {/* BP theo dõi */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={bpTheoDoi}
                                disabled
                                readOnly
                                placeholder="Bộ phận"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-center text-sm cursor-not-allowed opacity-70"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm">
                                {bpTheoDoi || "---"}
                              </span>
                            )}
                          </td>

                          {/* Chu kì */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <select
                                value={chuKi}
                                disabled
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-2 py-1.5 text-center text-sm cursor-not-allowed opacity-70"
                              >
                                <option value="">---</option>
                                <option value="Tuần">Tuần</option>
                                <option value="Tháng">Tháng</option>
                                <option value="Quý">Quý</option>
                                <option value="Năm">Năm</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  chuKi
                                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                {chuKi || "---"}
                              </span>
                            )}
                          </td>

                          {/* CBQL Đánh giá (số lỗi) */}
                          <td className="p-3 text-center">
                            {editMode ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step={
                                    (donViTinh || "")
                                      .toLowerCase()
                                      .includes("%") || donViTinh === "%"
                                      ? "0.1"
                                      : "1"
                                  }
                                  value={soLoi}
                                  onChange={(e) =>
                                    updateItemField(
                                      idx,
                                      "so_loi",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all duration-200"
                                />
                                {((donViTinh || "")
                                  .toLowerCase()
                                  .includes("%") ||
                                  donViTinh === "%") && (
                                  <span className="text-xs">
                                    %{/* giữ hiển thị % nếu là đơn vị % */}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${
                                  soLoi > 0
                                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                }`}
                              >
                                {soLoi}
                                {(donViTinh || "")
                                  .toLowerCase()
                                  .includes("%") || donViTinh === "%"
                                  ? "%"
                                  : ""}
                              </span>
                            )}
                          </td>

                          {/* Tỷ trọng cuối */}
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-sm font-medium ${
                                  Number(tyTrongCuoi) > 0
                                    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                                    : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                                }`}
                                title={`Tỷ trọng gốc: ${tyTrong}% • CBQL: ${soLoi}${
                                  (donViTinh || "")
                                    .toLowerCase()
                                    .includes("%") || donViTinh === "%"
                                    ? "%"
                                    : " lỗi"
                                }`}
                              >
                                {tyTrongCuoi}%
                              </span>
                            </div>
                          </td>

                          {/* Nội dung lỗi */}
                          <td className="p-3">
                            {editMode ? (
                              <textarea
                                rows="2"
                                value={String(currentItem?.noi_dung_loi ?? "")}
                                onChange={(e) =>
                                  updateItemField(
                                    idx,
                                    "noi_dung_loi",
                                    e.target.value
                                  )
                                }
                                placeholder="Mô tả chi tiết lỗi (nếu có)"
                                className="w-24 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none transition-all duration-200"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm break-words">
                                {String(currentItem?.noi_dung_loi ?? "") ||
                                  "---"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal xem nhật ký cập nhật */}
      {logModal.open && logModal.index !== null && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div>
                <h4 className="text-lg font-semibold text-slate-800">
                  Lịch sử cập nhật
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  KPI: {items[logModal.index]?.kpi || "---"}
                </p>
              </div>
              <button
                onClick={closeLogModal}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {perItemLog[logModal.index]?.length > 0 ? (
                <div className="space-y-3">
                  {perItemLog[logModal.index]
                    .slice()
                    .reverse()
                    .map((log, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
                      >
                        {/* Header thông tin cập nhật */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              #{perItemLog[logModal.index].length - idx}
                            </span>
                            <span className="text-sm font-medium text-slate-800">
                              {log.by_name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {log.at
                              ? new Intl.DateTimeFormat("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(log.at)
                              : "---"}
                          </span>
                        </div>

                        {/* Lý do cập nhật */}
                        {log.note && (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                            <div className="flex items-start gap-2">
                              <svg
                                className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div>
                                <p className="text-xs font-medium text-amber-800 mb-1">
                                  Lý do cập nhật:
                                </p>
                                <p className="text-sm text-amber-700">
                                  {log.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* So sánh thay đổi */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Trước khi thay đổi */}
                          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                            <h5 className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                              <svg
                                className="h-3 w-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Trước
                            </h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-red-700">Số lỗi:</span>
                                <span className="font-medium text-red-800">
                                  {log.from.so_loi}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-700">Nội dung:</span>
                                <span className="font-medium text-red-800 break-words max-w-32">
                                  {log.from.noi_dung_loi || "---"}
                                </span>
                              </div>
                              {log.from.ky_hieu !== log.to.ky_hieu && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">Ký hiệu:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.ky_hieu || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.don_vi_tinh !== log.to.don_vi_tinh && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">Đơn vị:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.don_vi_tinh || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.da_thuc_hien !==
                                log.to.da_thuc_hien && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">Đã TH:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.da_thuc_hien || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.ke_hoach_quy !==
                                log.to.ke_hoach_quy && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">KH quý:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.ke_hoach_quy || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.chu_ki !== log.to.chu_ki && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">Chu kì:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.chu_ki || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.nv_danh_gia !== log.to.nv_danh_gia && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">NV ĐG:</span>
                                  <span className="font-medium text-red-800">
                                    {log.from.nv_danh_gia || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.cac_do_luong !==
                                log.to.cac_do_luong && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">
                                    Đo lường:
                                  </span>
                                  <span className="font-medium text-red-800 break-words max-w-32">
                                    {log.from.cac_do_luong || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.bp_theo_doi !== log.to.bp_theo_doi && (
                                <div className="flex justify-between">
                                  <span className="text-red-700">
                                    BP theo dõi:
                                  </span>
                                  <span className="font-medium text-red-800">
                                    {log.from.bp_theo_doi || "---"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Sau khi thay đổi */}
                          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                            <h5 className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                              <svg
                                className="h-3 w-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Sau
                            </h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-emerald-700">
                                  Số lỗi:
                                </span>
                                <span className="font-medium text-emerald-800">
                                  {log.to.so_loi}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-emerald-700">
                                  Nội dung:
                                </span>
                                <span className="font-medium text-emerald-800 break-words max-w-32">
                                  {log.to.noi_dung_loi || "---"}
                                </span>
                              </div>
                              {log.from.ky_hieu !== log.to.ky_hieu && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    Ký hiệu:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.ky_hieu || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.don_vi_tinh !== log.to.don_vi_tinh && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    Đơn vị:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.don_vi_tinh || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.da_thuc_hien !==
                                log.to.da_thuc_hien && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    Đã TH:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.da_thuc_hien || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.ke_hoach_quy !==
                                log.to.ke_hoach_quy && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    KH quý:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.ke_hoach_quy || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.chu_ki !== log.to.chu_ki && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    Chu kì:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.chu_ki || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.nv_danh_gia !== log.to.nv_danh_gia && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    NV ĐG:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.nv_danh_gia || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.cac_do_luong !==
                                log.to.cac_do_luong && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    Đo lường:
                                  </span>
                                  <span className="font-medium text-emerald-800 break-words max-w-32">
                                    {log.to.cac_do_luong || "---"}
                                  </span>
                                </div>
                              )}
                              {log.from.bp_theo_doi !== log.to.bp_theo_doi && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">
                                    BP theo dõi:
                                  </span>
                                  <span className="font-medium text-emerald-800">
                                    {log.to.bp_theo_doi || "---"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-slate-500">
                    Chưa có lịch sử cập nhật chi tiết cho KPI này
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffKPIDetailModal;
