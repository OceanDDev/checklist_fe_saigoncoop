/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { formkpistaffService } from "@/services/formkpistaff.service";
import { checkKPIService } from "@/services/checkkpistaff.service";
import { toast } from "react-toastify";

// Chuẩn hoá KPI items từ Form KPI - CẬP NHẬT MỚI với logic CBQL đánh giá
const mapFormToEditable = (rec) =>
  (rec?.kpis ?? []).map((it, index) => {
    const isFirstTwo = index < 2; // F1, F2
    const da_thuc_hien = isFirstTwo ? "100" : it?.da_thuc_hien ?? "";

    // Kiểm tra đơn vị tính để xác định mặc định CBQL đánh giá
    const isPercentRow =
      String(it?.don_vi_tinh || "").trim() === "%" ||
      String(it?.don_vi_tinh || "").includes("%") ||
      ["F1", "F2"].includes(String(it?.ky_hieu || "").toUpperCase());

    const so_loi_default = isPercentRow ? "100" : "0"; // Mặc định 100% cho %, 0 cho còn lại

    // TÍNH NV đánh giá dựa trên da_thuc_hien
    const nv_danh_gia_calc = calculateNVDanhGia({
      daThucHien: da_thuc_hien,
      tyTrong: it?.ty_trong ?? 0,
      donViTinh: it?.don_vi_tinh ?? "",
      kyHieu: it?.ky_hieu ?? "",
    });

    // TÍNH ty_trong_cuoi dựa trên CBQL đánh giá
    const ty_trong_cuoi_calc = calculateTyTrongCuoi({
      cbqlDanhGia: so_loi_default,
      tyTrong: it?.ty_trong ?? 0,
      donViTinh: it?.don_vi_tinh ?? "",
      kyHieu: it?.ky_hieu ?? "",
    });

    return {
      _id: it?._id,
      kpi: it?.kpi ?? "",
      ty_trong: it?.ty_trong ?? 0,
      ky_hieu: it?.ky_hieu ?? "",
      don_vi_tinh: it?.don_vi_tinh ?? "",
      da_thuc_hien,
      ke_hoach_quy: it?.ke_hoach_quy ?? "",
      chu_ki: it?.chu_ki ?? "",
      nv_danh_gia: nv_danh_gia_calc, // dựa trên da_thuc_hien
      nv_danh_gia_goc: it?.ty_trong ?? 0, // giá trị gốc
      cac_do_luong: it?.cac_do_luong ?? "",
      bp_theo_doi: it?.bp_theo_doi ?? "",
      so_loi: so_loi_default, // CBQL đánh giá - mặc định theo đơn vị tính
      ty_trong_cuoi: ty_trong_cuoi_calc, // tỷ trọng cuối dựa trên CBQL đánh giá
      ty_trong_cuoi_goc: it?.ty_trong ?? 0, // giá trị gốc cho ty_trong_cuoi
      noi_dung_loi: it?.noi_dung_loi ?? "", // Field mới: Nội dung lỗi
    };
  });

// Function tính ty_trong_cuoi dựa trên CBQL đánh giá - LOGIC GIỐNG NV đánh giá
const calculateTyTrongCuoi = ({ cbqlDanhGia, tyTrong, donViTinh, kyHieu }) => {
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
    // Với hàng "Lỗi": logic trừ điểm dựa trên số lỗi trong CBQL đánh giá
    if (cbql === 0) return w; // 0 lỗi = giữ nguyên tỷ trọng gốc

    // Logic trừ điểm theo số lỗi
    if (w >= 1 && w <= 9) {
      // Tỷ trọng 1-9%: mỗi lỗi trừ 1%
      const deduction = cbql * 1;
      return Math.max(0, w - deduction);
    } else if (w >= 10) {
      // Tỷ trọng ≥10%: mỗi lỗi trừ một nửa tỷ trọng
      const deductionPerError = w / 2;
      const totalDeduction = cbql * deductionPerError;
      return Math.max(0, w - totalDeduction);
    }

    return w;
  } else if (isPercentRow) {
    // Với hàng %, tính theo % CBQL đánh giá
    const pct = Math.max(0, Math.min(100, cbql)); // clamp 0..100
    return Math.round(((w * pct) / 100) * 100) / 100;
  }

  // Các hàng khác: giữ nguyên logic cũ hoặc tỷ lệ theo %
  const pct = Math.max(0, Math.min(100, cbql)); // clamp 0..100
  return Math.round(((w * pct) / 100) * 100) / 100;
};

// Function tính NV đánh giá - LOGIC MỚI: trừ từ giá trị gốc
// NEW: tính NV đánh giá theo % đã thực hiện (chỉ áp cho hàng % như F1/F2)
const calculateNVDanhGia = ({ daThucHien, tyTrong, donViTinh, kyHieu }) => {
  const w = Number(tyTrong || 0);
  const th = Number(daThucHien || 0);
  const isPercentRow =
    String(donViTinh || "").trim() === "%" ||
    String(donViTinh || "").includes("%") ||
    ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

  if (!isPercentRow) {
    // Với hàng "Lỗi": áp dụng logic trừ điểm dựa trên đã thực hiện
    if (th === 0) return w; // 0 lỗi = giữ nguyên tỷ trọng gốc

    // Logic trừ điểm theo số lỗi thực hiện
    if (w >= 1 && w <= 9) {
      // Tỷ trọng 1-9%: mỗi lỗi trừ 1%
      const deduction = th * 1;
      return Math.max(0, w - deduction);
    } else if (w >= 10) {
      // Tỷ trọng ≥10%: mỗi lỗi trừ một nửa tỷ trọng
      const deductionPerError = w / 2;
      const totalDeduction = th * deductionPerError;
      return Math.max(0, w - totalDeduction);
    }

    return w;
  }

  // Với hàng %, tính theo % thực hiện
  const pct = Math.max(0, Math.min(100, th)); // clamp 0..100
  return Math.round(((w * pct) / 100) * 100) / 100;
};

// Chọn bản ghi Form KPI mới nhất
const pickNewestIndex = (arr) => {
  if (!arr?.length) return 0;
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    const a = arr[best],
      b = arr[i];
    const an = Number(a?.nam || 0),
      bn = Number(b?.nam || 0);
    const at = Number(a?.thang || 0),
      bt = Number(b?.thang || 0);
    if (bn > an || (bn === an && bt > at)) best = i;
  }
  return best;
};

// Unwrap mọi dạng response từ service
const unwrapForms = (res) => {
  console.log("Raw response từ API:", res);

  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.success === false) {
    // ném lỗi để UI hiển thị message của BE
    const err = new Error(res.message || "Không tìm thấy Form KPI");
    err._isBackendMsg = true;
    throw err;
  }

  console.log("Dữ liệu sau khi unwrap:", res);
  return [];
};

const CheckKPISimpleModal = ({ onClose, onSaved }) => {
  const [codeInput, setCodeInput] = useState("");
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");

  const [formRecord, setFormRecord] = useState(null); // 1 Form KPI
  const [formKpis, setFormKpis] = useState([]); // KPI để nhập lỗi
  const [monthInput, setMonthInput] = useState(new Date().getMonth() + 1);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Tính toán tổng điểm cuối - CẬP NHẬT MỚI: dựa trên ty_trong_cuoi thay vì điểm trừ
  const finalScore = useMemo(() => {
    let totalScore = 0;

    formKpis.forEach((item) => {
      totalScore += Number(item.ty_trong_cuoi || 0);
    });

    return Math.round(totalScore * 100) / 100;
  }, [formKpis]);

  const handleFind = async () => {
    setFindError("");
    const code = codeInput.trim();
    if (!code) {
      setFindError("Vui lòng nhập mã nhân viên.");
      return;
    }
    setFinding(true);
    try {
      // 1) thử lấy đúng tháng/năm đang chọn
      let list = await formkpistaffService.getAllFormKPI({
        ma_nhan_vien: code,
        thang: monthInput,
        nam: currentYear,
      });
      let arr = unwrapForms(list);

      // 2) nếu không có -> fallback: lấy tất cả theo mã NV rồi chọn bản mới nhất
      if (!arr.length) {
        list = await formkpistaffService.getAllFormKPI({ ma_nhan_vien: code });
        arr = unwrapForms(list);
      }

      if (!arr.length) {
        setFormRecord(null);
        setFormKpis([]);
        setFindError("Không tìm thấy Form KPI cho mã nhân viên này.");
        return;
      }

      // chọn bản mới nhất
      arr.sort((a, b) => {
        const dn = Number(b?.nam || 0) - Number(a?.nam || 0);
        return dn !== 0 ? dn : Number(b?.thang || 0) - Number(a?.thang || 0);
      });
      const rec = arr[pickNewestIndex(arr)];

      // DEBUG: Kiểm tra cấu trúc dữ liệu
      console.log("Form record nhận được:", rec);
      console.log("Form record _id:", rec?._id);
      console.log("Form record id:", rec?.id);
      console.log("Tất cả keys trong object:", Object.keys(rec || {}));
      console.log("Form record kpis:", rec?.kpis);

      if (!rec._id && !rec.id) {
        setFindError("Form KPI không có ID hợp lệ. Dữ liệu có thể bị lỗi.");
        return;
      }

      setFormRecord(rec);
      setFormKpis(mapFormToEditable(rec));
    } catch (e) {
      console.error(e);
      // Nếu là message từ BE, ưu tiên hiện ra
      setFindError(e?._isBackendMsg ? e.message : "Có lỗi khi tải Form KPI.");
    } finally {
      setFinding(false);
    }
  };

  const updateKpiField = (i, field, value) => {
    setFormKpis((prev) => {
      const next = [...prev];
      const curr = { ...next[i] };

      if (field === "da_thuc_hien") {
        // clamp 0..100 cho hàng %, còn hàng "Lỗi" thì không clamp
        const v = String(value);
        let num = Number(v);
        if (Number.isNaN(num)) num = 0;
        if (num < 0) num = 0;

        // Chỉ clamp 100 cho hàng có đơn vị %
        const isPercentRow =
          String(curr.don_vi_tinh || "").includes("%") ||
          ["F1", "F2"].includes(String(curr.ky_hieu || "").toUpperCase());

        if (isPercentRow && num > 100) num = 100;

        curr.da_thuc_hien = String(num);

        // Tính lại NV đánh giá từ da_thuc_hien
        curr.nv_danh_gia = calculateNVDanhGia({
          daThucHien: num,
          tyTrong: curr.ty_trong,
          donViTinh: curr.don_vi_tinh,
          kyHieu: curr.ky_hieu,
        });
      } else if (field === "cbql_danh_gia") {
        // Cập nhật CBQL đánh giá
        const v = String(value);
        let num = Number(v);
        if (Number.isNaN(num)) num = 0;
        if (num < 0) num = 0;

        // Chỉ clamp 100 cho hàng có đơn vị %
        const isPercentRow =
          String(curr.don_vi_tinh || "").includes("%") ||
          ["F1", "F2"].includes(String(curr.ky_hieu || "").toUpperCase());

        if (isPercentRow && num > 100) num = 100;

        curr.so_loi = String(num);

        // Tính lại ty_trong_cuoi từ cbql_danh_gia
        curr.ty_trong_cuoi = calculateTyTrongCuoi({
          cbqlDanhGia: num,
          tyTrong: curr.ty_trong,
          donViTinh: curr.don_vi_tinh,
          kyHieu: curr.ky_hieu,
        });
      } else if (field === "noi_dung_loi") {
        // Cập nhật nội dung lỗi
        curr.noi_dung_loi = String(value);
      }

      next[i] = curr;
      return next;
    });
  };

  const handleSave = async () => {
    if (!formRecord) {
      alert("Vui lòng tìm và chọn Form KPI trước khi lưu đánh giá.");
      return;
    }

    // Sử dụng id hoặc _id tuỳ backend
    const formId = formRecord._id || formRecord.id;
    if (!formId) {
      alert("Form KPI không hợp lệ (thiếu ID). Vui lòng thử tải lại Form KPI.");
      return;
    }

    if (!formKpis || formKpis.length === 0) {
      alert("Không có dữ liệu KPI để đánh giá.");
      return;
    }

    // Chuẩn hoá tháng 1..12
    let thang = parseInt(monthInput, 10);
    if (Number.isNaN(thang) || thang < 1) thang = 1;
    if (thang > 12) thang = 12;

    try {
      // Chuyển đổi dữ liệu về format mong đợi của backend - CẬP NHẬT: đảm bảo tất cả fields có giá trị
      const kpisToSave = formKpis.map((kpi, index) => {
        // Đảm bảo tất cả fields có giá trị mặc định
        const kpiData = {
          _id: kpi._id || undefined, // Giữ _id nếu có
          kpi: String(kpi.kpi || ""),
          ty_trong: Number(kpi.ty_trong || 0),
          ky_hieu: String(kpi.ky_hieu || ""),
          don_vi_tinh: String(kpi.don_vi_tinh || ""),
          da_thuc_hien: String(kpi.da_thuc_hien || "0"),
          ke_hoach_quy: String(kpi.ke_hoach_quy || ""),
          chu_ki: String(kpi.chu_ki || ""),
          nv_danh_gia: Number(kpi.nv_danh_gia || 0),
          cac_do_luong: String(kpi.cac_do_luong || ""),
          bp_theo_doi: String(kpi.bp_theo_doi || ""),
          so_loi: String(kpi.so_loi || "0"), // CBQL đánh giá
          ty_trong_cuoi: Number(kpi.ty_trong_cuoi || 0), // Tỷ trọng cuối
          noi_dung_loi: String(kpi.noi_dung_loi || ""), // Nội dung lỗi
        };

        console.log(`KPI ${index + 1} data:`, kpiData);
        return kpiData;
      });

      // Log dữ liệu trước khi gửi
      console.log("=== DATA GỬI ĐI ===");
      console.log("Form ID:", formId);
      console.log("Tháng:", thang);
      console.log("Năm:", currentYear);
      console.log("Final Score:", finalScore);
      console.log("KPIs to save:", kpisToSave);
      console.log("Ma nhan vien:", formRecord.ma_nhan_vien);

      const payloadData = {
        form_kpi_id: formId,
        thang,
        nam: currentYear,
        danh_sach_check: kpisToSave,
        ty_trong_thang: Number(finalScore || 0),
      };

      console.log("=== PAYLOAD CUỐI CÙNG ===", payloadData);

      // Lưu qua checkform (ưu tiên theo form_kpi_id)
      let created = null;
      try {
        console.log("Thử createCheckKPI với form_kpi_id...");
        created = await checkKPIService.createCheckKPI(payloadData);
        console.log("createCheckKPI thành công:", created);
      } catch (error1) {
        console.log("createCheckKPI thất bại, error:", error1);

        // Fallback: nếu BE không có route create theo form_kpi_id
        try {
          console.log("Thử createCheckKPIFromStaff với ma_nhan_vien...");
          const fallbackPayload = {
            ma_nhan_vien: formRecord.ma_nhan_vien,
            thang,
            nam: currentYear,
            danh_sach_check: kpisToSave,
            ty_trong_thang: Number(finalScore || 0),
          };
          console.log("Fallback payload:", fallbackPayload);

          created = await checkKPIService.createCheckKPIFromStaff(
            fallbackPayload
          );
          console.log("createCheckKPIFromStaff thành công:", created);
        } catch (error2) {
          console.log("createCheckKPIFromStaff cũng thất bại:", error2);
          throw error1; // Ném lỗi đầu tiên
        }
      }

      toast.success("Đã lưu đánh giá KPI thành công!", { autoClose: 2500 });
      if (typeof onSaved === "function") await onSaved();
      onClose?.();
    } catch (e) {
      console.error("=== LỖI CUỐI CÙNG ===");
      console.error("Error object:", e);
      console.error("Error message:", e?.message);
      console.error("Error response:", e?.response?.data);

      // Hiển thị thông tin lỗi chi tiết hơn
      let errorMessage = "Vui lòng thử lại.";
      if (e?.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e?.message) {
        errorMessage = e.message;
      }

      toast.error(`Lưu thất bại: ${errorMessage}`, { autoClose: 3000 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kpi-review-title"
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Panel wrapper (đổi max-width theo formRecord) */}
      <div
        className={[
          "relative z-10 mx-auto my-8 w-full px-4 sm:px-6",
          formRecord ? "max-w-[95vw]" : "max-w-md",
        ].join(" ")}
      >
        {/* Panel */}
        <div className="w-full rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10 max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 shrink-0">
            <h3
              id="kpi-review-title"
              className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight"
            >
              Đánh giá KPI
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Đóng
            </button>
          </div>

          {/* Body (scroll ở body) */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">
              {/* Tìm mã NV */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFind()}
                  placeholder="Nhập mã nhân viên (vd: 23475)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                />
                <button
                  onClick={handleFind}
                  disabled={finding}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {finding ? "Đang tải..." : "Lấy Form KPI"}
                </button>
              </div>
              {findError && (
                <p className="text-sm text-rose-600">{findError}</p>
              )}

              {/* Thông tin nhân viên + tháng/năm + bảng KPI */}
              {formRecord && (
                <div className="space-y-4">
                  {/* Info nhân viên */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-inset ring-slate-200">
                      Mã NV:{" "}
                      <b className="ml-1 font-semibold">
                        {formRecord.ma_nhan_vien}
                      </b>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Họ tên:{" "}
                      <b className="ml-1 font-semibold">{formRecord.ho_ten}</b>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-inset ring-indigo-200">
                      Đơn vị:{" "}
                      <b className="ml-1 font-semibold">{formRecord.don_vi}</b>
                    </span>
                  </div>

                  {/* Tháng / Năm */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-700">
                      Tháng chấm:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={monthInput}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) {
                          const clamped = Math.min(
                            12,
                            Math.max(1, Math.trunc(v))
                          );
                          setMonthInput(clamped);
                        }
                      }}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    />
                    <span className="text-sm text-slate-600">
                      Năm:{" "}
                      <b className="font-semibold text-slate-800">
                        {currentYear}
                      </b>
                    </span>
                  </div>

                  {/* Thông tin tính điểm (chỉ hiển thị điểm cuối) */}
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">
                            Tổng tỷ trọng KPI:
                          </span>
                          <span className="font-semibold text-slate-800">
                            {finalScore}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-sm">
                          Điểm cuối cùng:
                        </span>
                        <div
                          className={[
                            "inline-flex items-center rounded-full px-4 py-2 text-lg font-bold ring-2",
                            finalScore < 100
                              ? "bg-orange-50 text-orange-700 ring-orange-200"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                          ].join(" ")}
                        >
                          {finalScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bảng KPI */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
                    <table className="w-full text-sm bg-white min-w-[2200px]">
                      <colgroup>
                        <col className="w-[6%]" />
                        <col className="w-[16%]" />
                        <col className="w-[5%]" />
                        <col className="w-[10%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[5%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[5%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[18%]" />
                      </colgroup>
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <tr className="text-center">
                          <th className="p-3 font-bold text-slate-700">
                            Ký hiệu
                          </th>
                          <th className="p-3 font-bold text-slate-700">KPI</th>
                          <th className="p-3 font-bold text-slate-700">
                            Tỷ trọng
                          </th>
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
                          <th className="p-3 font-bold text-slate-700">
                            Chu kì
                          </th>
                          <th className="p-3 font-bold text-slate-700">
                            CBQL Đánh giá
                          </th>
                          <th className="p-3 font-bold text-slate-700">
                            Tỷ trọng cuối
                          </th>
                          <th className="p-3 font-bold text-slate-700">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formKpis.map((row, i) => {
                          const cbqlDanhGia = Number(row.so_loi || 0);
                          const tyTrongCuoi = Number(row.ty_trong_cuoi || 0);
                          const donViTinh = String(row.don_vi_tinh ?? "");
                          const nvDanhGia = Number(row.nv_danh_gia || 0);
                          const daThucHien = Number(row.da_thuc_hien || 0);

                          return (
                            <tr
                              key={row._id || i}
                              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="p-3 text-center">
                                <span className="text-slate-600 text-sm">
                                  {row.ky_hieu || "---"}
                                </span>
                              </td>

                              <td className="p-3">
                                <span className="text-slate-800 font-medium break-words text-sm">
                                  {row.kpi || "---"}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-slate-700 ring-1 ring-inset ring-slate-200 text-sm">
                                  {row.ty_trong}%
                                </span>
                              </td>

                              <td className="p-3">
                                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600 min-h-[2.5rem] flex items-center">
                                  {row.cac_do_luong || "---"}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm text-slate-600">
                                  {row.ke_hoach_quy || "---"}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={row.da_thuc_hien}
                                  onChange={(e) =>
                                    updateKpiField(
                                      i,
                                      "da_thuc_hien",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Thực hiện"
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                />
                              </td>

                              <td className="p-3 text-center">
                                <span
                                  className={[
                                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                                    donViTinh.toLowerCase().includes("%") ||
                                    donViTinh === "%"
                                      ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200"
                                      : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
                                  ].join(" ")}
                                >
                                  {donViTinh || "---"}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={[
                                      "inline-flex items-center rounded-full px-2 py-1 text-sm font-medium",
                                      nvDanhGia > 0
                                        ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                                        : "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
                                    ].join(" ")}
                                    title={`Gốc: ${row.nv_danh_gia_goc}% ${
                                      daThucHien > 0
                                        ? `- Thực hiện: ${daThucHien}%`
                                        : ""
                                    }`}
                                  >
                                    {nvDanhGia}%
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm text-slate-600">
                                  {row.bp_theo_doi || "---"}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm text-slate-600">
                                  {row.chu_ki || "---"}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step={
                                      donViTinh.toLowerCase().includes("%") ||
                                      donViTinh === "%"
                                        ? "0.1"
                                        : "1"
                                    }
                                    value={cbqlDanhGia}
                                    onChange={(e) =>
                                      updateKpiField(
                                        i,
                                        "cbql_danh_gia",
                                        e.target.value
                                      )
                                    }
                                    className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                                  />
                                  {(donViTinh.toLowerCase().includes("%") ||
                                    donViTinh === "%") && (
                                    <span className="text-xs">%</span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={[
                                      "inline-flex items-center rounded-full px-2 py-1 text-sm font-medium",
                                      tyTrongCuoi > 0
                                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
                                        : "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
                                    ].join(" ")}
                                    title={`Gốc: ${row.ty_trong_cuoi_goc}% - CBQL: ${cbqlDanhGia}%`}
                                  >
                                    {tyTrongCuoi}%
                                  </span>
                                </div>
                              </td>

                              <td className="p-3">
                                <textarea
                                  value={row.noi_dung_loi}
                                  onChange={(e) =>
                                    updateKpiField(
                                      i,
                                      "noi_dung_loi",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Mô tả (nếu có)..."
                                  rows="2"
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 resize-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {formRecord && (
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/80 bg-slate-50 rounded-b-2xl shrink-0">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  Đánh giá cho:{" "}
                  <strong className="text-slate-800">
                    {formRecord.ho_ten}
                  </strong>
                </span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">
                  Tháng <strong className="text-slate-800">{monthInput}</strong>{" "}
                  / {currentYear}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Lưu đánh giá
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckKPISimpleModal;
