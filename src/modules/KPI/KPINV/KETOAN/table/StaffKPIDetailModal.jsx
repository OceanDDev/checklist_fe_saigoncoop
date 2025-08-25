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

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

// Helper function để lấy thông tin user từ localStorage
const getUserFromStorage = () => {
  try {
    const possibleKeys = ['user', 'userData', 'auth', 'currentUser', 'loginUser', 'userInfo'];
    for (const key of possibleKeys) {
      const userData = localStorage.getItem(key);
      if (userData) {
        const parsed = JSON.parse(userData);
        const userName = parsed.name ||
                         parsed.ho_ten ||
                         parsed.fullName ||
                         parsed.username ||
                         parsed.ten ||
                         parsed.displayName ||
                         parsed.user_name ||
                         (parsed.user && (parsed.user.name || parsed.user.ho_ten || parsed.user.fullName));
        if (userName) return userName;
      }
    }
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
  }
  return 'Unknown User';
};

// Function tính điểm trừ dựa trên tỷ trọng và số lỗi (hoặc %) - CẬP NHẬT
const calculateDeduction = (tyTrong, soLoi, donViTinh = "") => {
  const weight = Number(tyTrong || 0);
  const errors = Number(soLoi || 0);
  if (errors === 0) return 0;

  // Nếu đơn vị là %
  if ((donViTinh || "").toLowerCase().includes('%') || donViTinh === '%') {
    // Ví dụ: tyTrong 5, nhập 90 => trừ 5 * 90 / 100 = 4.5
    return (weight * errors) / 100;
  }

  // Đơn vị là Lỗi
  if (weight >= 1 && weight <= 9) {
    return errors * 1; // mỗi lỗi trừ 1%
  } else if (weight >= 10) {
    // mỗi lỗi trừ nửa tỷ trọng (không làm tròn)
    const deductionPerError = weight / 2;
    return errors * deductionPerError;
  }
  return 0;
};

const StaffKPIDetailModal = ({ staff, onClose, selectedYear }) => {
  // Sử dụng selectedYear từ props, fallback về năm hiện tại
  const targetYear = useMemo(() => Number(selectedYear || new Date().getFullYear()), [selectedYear]);

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

  // Map tháng -> record
  const [byMonth, setByMonth] = useState(() =>
    Object.fromEntries(MONTHS.map((m) => [m, null]))
  );
  const record = byMonth[activeMonth];
  const items = Array.isArray(record?.danh_sach_check) ? record.danh_sach_check : [];

  // ==== Edit mode state ====
  const [editMode, setEditMode] = useState(false);
  const [editableItems, setEditableItems] = useState([]);
  const [updateNote, setUpdateNote] = useState("");
  const [updateNoteError, setUpdateNoteError] = useState("");
  const noteRef = useRef(null);
  const isNoteEmpty = useMemo(() => updateNote.trim().length === 0, [updateNote]);

  // Thêm state để track việc save thành công
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tính toán tổng điểm trừ và cập nhật tỷ trọng tháng trực tiếp
  const { totalDeduction, finalWeight } = useMemo(() => {
    const currentItems = editMode ? editableItems : items;
    let deduction = 0;
    currentItems.forEach(item => {
      deduction += calculateDeduction(item.ty_trong, item.so_loi, item.don_vi_tinh);
    });

    const baseWeight = 100;
    const final = Math.max(0, baseWeight - deduction);
    return {
      totalDeduction: Math.round(deduction * 100) / 100, // 2 chữ số thập phân
      finalWeight: Math.round(final * 100) / 100
    };
  }, [editMode, editableItems, items]);

  // Khi đổi record (tháng), sync editableItems
  useEffect(() => {
    if (record?.danh_sach_check) {
      setEditableItems(record.danh_sach_check.map(it => ({
        kpi: it.kpi,
        ty_trong: Number(it.ty_trong ?? 0),
        so_loi: Number(it.so_loi ?? 0),
        noi_dung_loi: String(it.noi_dung_loi ?? ""),
        ky_hieu: String(it.ky_hieu ?? ""),
        don_vi_tinh: String(it.don_vi_tinh ?? "")
      })));
    } else {
      setEditableItems([]);
    }
    setUpdateNote("");
    setUpdateNoteError("");
    setEditMode(false);
    setSaveSuccess(false);
  }, [record?._id, activeMonth]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const msg = e?.response?.data?.message || e?.message || "Có lỗi khi tải danh sách Check KPI.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Gọi fetch khi modal mount + khi ma_nhan_vien hoặc targetYear đổi
  useEffect(() => {
    fetchAllOfYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.ma_nhan_vien, targetYear]);

  // lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  // ==== Nhật ký cập nhật theo từng KPI (tính từ record.updates + snapshot) ====
  const { perItemLog, countByIndex } = useMemo(() => {
    const resultLogs = {}; // index -> [{ by_name, at, note, from, to }]
    const counts = {};     // index -> count

    if (!record || !Array.isArray(items) || items.length === 0) {
      return { perItemLog: resultLogs, countByIndex: counts };
    }

    const updates = Array.isArray(record.updates) ? [...record.updates] : [];
    if (updates.length > 0) {
      updates.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

      // baseline snapshot
      let prevSnap = items.map(item => ({
        ...item,
        so_loi: 0,
        noi_dung_loi: "",
        ky_hieu: item.ky_hieu || "",
        don_vi_tinh: item.don_vi_tinh || ""
      }));

      if (updates[0]?.snapshot_before?.danh_sach_check) {
        prevSnap = updates[0].snapshot_before.danh_sach_check;
      }

      for (let i = 0; i < updates.length; i++) {
        const u = updates[i];
        const currSnap = Array.isArray(u?.snapshot?.danh_sach_check)
          ? u.snapshot.danh_sach_check
          : (i === updates.length - 1 ? items : prevSnap);

        const len = Math.max(prevSnap?.length || 0, currSnap?.length || 0);
        for (let idx = 0; idx < len; idx++) {
          const prevIt = prevSnap[idx] || {};
          const currIt = currSnap[idx] || {};
          const changed =
            Number(prevIt?.so_loi ?? 0) !== Number(currIt?.so_loi ?? 0) ||
            String(prevIt?.noi_dung_loi ?? "").trim() !== String(currIt?.noi_dung_loi ?? "").trim() ||
            String(prevIt?.ky_hieu ?? "").trim() !== String(currIt?.ky_hieu ?? "").trim() ||
            String(prevIt?.don_vi_tinh ?? "").trim() !== String(currIt?.don_vi_tinh ?? "").trim();

          if (changed) {
            if (!resultLogs[idx]) resultLogs[idx] = [];
            if (!counts[idx]) counts[idx] = 0;
            counts[idx] += 1;

            resultLogs[idx].push({
              by_name: u?.by_name || getUserFromStorage(),
              at: u?.at ? new Date(u.at) : null,
              note: u?.note || "",
              from: {
                so_loi: prevIt?.so_loi ?? 0,
                noi_dung_loi: prevIt?.noi_dung_loi ?? "",
                ky_hieu: prevIt?.ky_hieu ?? "",
                don_vi_tinh: prevIt?.don_vi_tinh ?? "",
              },
              to: {
                so_loi: currIt?.so_loi ?? 0,
                noi_dung_loi: currIt?.noi_dung_loi ?? "",
                ky_hieu: currIt?.ky_hieu ?? "",
                don_vi_tinh: currIt?.don_vi_tinh ?? "",
              },
            });
          }
        }

        prevSnap = currSnap;
      }
    } else if (typeof record.so_lan_update === 'number' && record.so_lan_update > 0) {
      const countPerItem = Math.max(1, Math.floor(record.so_lan_update / items.length));
      for (let idx = 0; idx < items.length; idx++) {
        counts[idx] = countPerItem;
      }
    }

    return { perItemLog: resultLogs, countByIndex: counts };
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
    setEditableItems(items.map(it => ({
      kpi: it.kpi,
      ty_trong: Number(it.ty_trong ?? 0),
      so_loi: Number(it.so_loi ?? 0),
      noi_dung_loi: String(it.noi_dung_loi ?? ""),
      ky_hieu: String(it.ky_hieu ?? ""),
      don_vi_tinh: String(it.don_vi_tinh ?? "")
    })));
  };

  const cancelEdit = () => {
    setEditableItems(items.map(it => ({
      kpi: it.kpi,
      ty_trong: Number(it.ty_trong ?? 0),
      so_loi: Number(it.so_loi ?? 0),
      noi_dung_loi: String(it.noi_dung_loi ?? ""),
      ky_hieu: String(it.ky_hieu ?? ""),
      don_vi_tinh: String(it.don_vi_tinh ?? "")
    })));
    setUpdateNote("");
    setUpdateNoteError("");
    setEditMode(false);
    setSaveSuccess(false);
  };

  // Cập nhật field theo idx
  const updateItemField = (idx, field, value) => {
    setEditableItems(prev => {
      const next = [...prev];
      const curr = { ...next[idx] };
      if (field === "so_loi") {
        const n = Number(value);
        curr.so_loi = Number.isNaN(n) || n < 0 ? 0 : n;
      } else if (field === "noi_dung_loi") {
        curr.noi_dung_loi = value;
      } else if (field === "ky_hieu") {
        curr.ky_hieu = value;
      } else if (field === "don_vi_tinh") {
        curr.don_vi_tinh = value;
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
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validate độ dài tối thiểu (tùy chọn)
    if (trimmedNote.length < 10) {
      setUpdateNoteError("Lý do cập nhật phải có ít nhất 10 ký tự.");
      noteRef.current?.focus();
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);

      const userName = getUserFromStorage();

      await checkKPIService.updateCheckKPI(record._id, {
        danh_sach_check: editableItems,
        ty_trong_thang: finalWeight, // Tỷ trọng tháng = 100 - tổng điểm trừ
        update_note: trimmedNote, // Sử dụng trimmed note
        by_name: userName
      });

      setSaveSuccess(true);
      await fetchAllOfYear();
      setEditMode(false);
      setUpdateNote("");
      setUpdateNoteError("");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lưu cập nhật thất bại.";
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
      if (e.key === 'Escape') {
        if (logModal.open) {
          closeLogModal();
        } else if (editMode) {
          cancelEdit();
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [logModal.open, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function trạng thái năm
  const getYearStatus = () => {
    const currentYear = new Date().getFullYear();
    if (targetYear > currentYear) return 'future';
    if (targetYear === currentYear) return 'current';
    return 'past';
  };
  const yearStatus = getYearStatus();

  return (
    <>
      {/* Modal chính */}
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <div className="w-full max-w-7xl rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
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
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  yearStatus === 'current'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : yearStatus === 'future'
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}>
                  Năm: <b className="ml-1 font-semibold">{targetYear}</b>
                  <span className="ml-1">
                    {yearStatus === 'current' ? '(Hiện tại)' : yearStatus === 'future' ? '(Tương lai)' : '(Quá khứ)'}
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
                  title="Cập nhật số lỗi & nội dung lỗi"
                >
                  ✏️ Cập nhật
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
                      ${saving || isNoteEmpty
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 transform hover:scale-105"
                      }
                    `}
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang lưu...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
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
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Tổng điểm trừ:</span>
                    <span className={`font-bold ${totalDeduction > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      -{totalDeduction}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-sm">Tỷ trọng tháng {activeMonth}/{targetYear}:</span>
                  <div className={`inline-flex items-center rounded-full px-4 py-2 text-lg font-bold ring-2 ${
                    finalWeight < 100 
                      ? 'bg-orange-50 text-orange-700 ring-orange-200' 
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  }`}>
                    {finalWeight}%
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

            {/* Ghi chú cập nhật khi ở edit mode */}
            {editMode && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
                <label htmlFor="update-note-input" className="block text-sm font-semibold text-amber-800 mb-2">
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
                  aria-describedby={updateNoteError ? "update-note-error" : undefined}
                  className={`
                    w-full rounded-lg px-3 py-2.5 text-sm outline-none shadow-sm transition-all duration-200
                    ${updateNoteError 
                      ? "border-2 border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:bg-white" 
                      : "border border-amber-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                    }
                  `}
                />
                {updateNoteError && (
                  <div className="mt-2 flex items-start gap-2">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p id="update-note-error" className="text-sm text-red-600 font-medium">
                      {updateNoteError}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 font-medium ring-1 ring-amber-200">
                    Người cập nhật: <span className="ml-1 font-semibold">{getUserFromStorage()}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Status/error */}
            {loading && (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tải dữ liệu năm {targetYear}...
              </div>
            )}
            {!loading && error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm flex items-start gap-2">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Bảng KPI */}
            {!loading && !error && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-lg">
                <table className="w-full text-sm table-fixed bg-white">
                  <colgroup>
                    <col className="w-[30%]" /> {/* KPI */}
                    <col className="w-[8%]" />  {/* Ký hiệu */}
                    <col className="w-[8%]" />  {/* Đơn vị */}
                    <col className="w-[8%]" />  {/* Tỷ trọng */}
                    <col className="w-[8%]" />  {/* Lỗi / % nhập */}
                    <col className="w-[10%]" /> {/* Điểm trừ */}
                    <col className="w-[28%]" /> {/* Nội dung lỗi */}
                  </colgroup>
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr className="text-center">
                      <th className="p-4 font-bold text-slate-700">KPI</th>
                      <th className="p-4 font-bold text-slate-700">Ký hiệu</th>
                      <th className="p-4 font-bold text-slate-700">Đơn vị</th>
                      <th className="p-4 font-bold text-slate-700">Tỷ trọng</th>
                      <th className="p-4 font-bold text-slate-700">Lỗi</th>
                      <th className="p-4 font-bold text-slate-700">Điểm trừ</th>
                      <th className="p-4 font-bold text-slate-700">Nội dung lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!record && (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-500">
                          <div className="text-4xl mb-2">📋</div>
                          Chưa có dữ liệu check KPI cho tháng {activeMonth}/{targetYear}
                        </td>
                      </tr>
                    )}
                    {record && items.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-500">
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
                      const diemTru = calculateDeduction(tyTrong, soLoi, donViTinh);
                      const hasUpdateHistory = countByIndex[idx] > 0;

                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-slate-800 font-medium break-words">
                                {currentItem?.kpi || '---'}
                              </span>
                              {hasUpdateHistory && (
                                <button
                                  onClick={() => openLogFor(idx)}
                                  className="shrink-0 flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors ring-1 ring-blue-200"
                                  title="Xem lịch sử cập nhật"
                                >
                                  📝 {countByIndex[idx]}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Ký hiệu */}
                          <td className="p-4 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={kyHieu}
                                onChange={(e) => updateItemField(idx, "ky_hieu", e.target.value)}
                                placeholder="VD: F1"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all duration-200"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm">
                                {kyHieu || '---'}
                              </span>
                            )}
                          </td>

                          {/* Đơn vị tính */}
                          <td className="p-4 text-center">
                            {editMode ? (
                              <input
                                type="text"
                                value={donViTinh}
                                onChange={(e) => updateItemField(idx, "don_vi_tinh", e.target.value)}
                                placeholder="VD: %, Lỗi"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all duration-200"
                              />
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                (donViTinh || "").toLowerCase().includes('%') || donViTinh === '%'
                                  ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                  : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                              }`}>
                                {donViTinh || '---'}
                              </span>
                            )}
                          </td>

                          {/* Tỷ trọng */}
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                              {tyTrong}%
                            </span>
                          </td>

                          {/* Lỗi / % nhập */}
                          <td className="p-4 text-center">
                            {editMode ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step={((donViTinh || "").toLowerCase().includes('%') || donViTinh === '%') ? "0.1" : "1"}
                                  value={soLoi}
                                  onChange={(e) => updateItemField(idx, "so_loi", e.target.value)}
                                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all duration-200"
                                />
                                {((donViTinh || "").toLowerCase().includes('%') || donViTinh === '%') && <span>%</span>}
                              </div>
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                                soLoi > 0
                                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              }`}>
                                {soLoi}{((donViTinh || "").toLowerCase().includes('%') || donViTinh === '%') ? '%' : ''}
                              </span>
                            )}
                          </td>

                          {/* Điểm trừ */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${
                              diemTru > 0
                                ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                                : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
                            }`}>
                              -{diemTru.toFixed(1)}%
                            </span>
                          </td>

                          {/* Nội dung lỗi */}
                          <td className="p-4">
                            {editMode ? (
                              <textarea
                                rows="2"
                                value={String(currentItem?.noi_dung_loi ?? "")}
                                onChange={(e) => updateItemField(idx, "noi_dung_loi", e.target.value)}
                                placeholder="Mô tả chi tiết lỗi (nếu có)"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none transition-all duration-200"
                              />
                            ) : (
                              <span className="text-slate-600 text-sm break-words">
                                {String(currentItem?.noi_dung_loi ?? "").trim() || "---"}
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

      {/* Modal con - Chi tiết lịch sử cập nhật của 1 KPI */}
      {logModal.open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h4 className="text-lg font-semibold text-slate-800">
                Lịch sử cập nhật - {items[logModal.index]?.kpi}
              </h4>
              <button
                onClick={closeLogModal}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {perItemLog[logModal.index]?.length > 0 ? (
                <div className="space-y-3">
                  {perItemLog[logModal.index].map((log, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:bg-slate-100">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 ring-1 ring-blue-200 font-medium">
                            #{i + 1}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{log.by_name}</span>
                            <span>•</span>
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <span>{log.at ? log.at.toLocaleString('vi-VN') : '---'}</span>
                          </div>
                        </div>
                      </div>

                      {log.note && (
                        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                          <div className="flex items-start gap-2">
                            <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="text-sm text-amber-800 font-medium">Ghi chú: </span>
                              <span className="text-sm text-amber-700">{log.note}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                          <h5 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                            </svg>
                            Trước khi cập nhật
                          </h5>
                          <div className="space-y-1 text-sm text-red-700">
                            <div><strong>Ký hiệu:</strong> {log.from.ky_hieu || 'Không có'}</div>
                            <div><strong>Đơn vị tính:</strong> {log.from.don_vi_tinh || 'Không có'}</div>
                            <div><strong>Số lỗi:</strong> {log.from.so_loi}</div>
                            <div><strong>Nội dung:</strong> <em>{log.from.noi_dung_loi || 'Không có'}</em></div>
                          </div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                          <h5 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Sau khi cập nhật
                          </h5>
                          <div className="space-y-1 text-sm text-emerald-700">
                            <div><strong>Ký hiệu:</strong> {log.to.ky_hieu || 'Không có'}</div>
                            <div><strong>Đơn vị tính:</strong> {log.to.don_vi_tinh || 'Không có'}</div>
                            <div><strong>Số lỗi:</strong> {log.to.so_loi}</div>
                            <div><strong>Nội dung:</strong> <em>{log.to.noi_dung_loi || 'Không có'}</em></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">Không có lịch sử cập nhật chi tiết</h3>
                  <p className="text-sm">
                    {countByIndex[logModal.index] > 0
                      ? `Chỉ có thông tin tổng số lần cập nhật: ${countByIndex[logModal.index]}`
                      : 'KPI này chưa được cập nhật lần nào'
                    }
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