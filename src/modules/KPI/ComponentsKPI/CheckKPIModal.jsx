/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useMemo, useState, useCallback } from "react";
import { formkpistaffService } from "@/services/formkpistaff.service";
import { checkKPIService } from "@/services/checkkpistaff.service";
import { toast } from "react-toastify";
import SubKpiModal from "./SubKpiModal";
import { ROLE_KPI } from "@/configs/constants";

const mapFormToEditable = (rec) =>
  (rec?.kpis ?? []).map((it, index) => {
    const isFirstTwo = index < 2; // F1, F2
    const kyHieu = String(it?.ky_hieu || "");
    const donViTinh = String(it?.don_vi_tinh || "");
    const kpiPhuData = rec?.kpi_phu || null;

    // ✅ Phân biệt các loại đơn vị tính
    const kyHieuUpper = kyHieu.toUpperCase();
    const isDiemUnit = donViTinh.toLowerCase().includes("điểm");
    const isLanUnit = donViTinh.toLowerCase().includes("lần");

    // C3 (Điểm) → Max 4.1
    const isC3Diem = kyHieuUpper === "C3" && isDiemUnit;

    // C1, C2, ... (Điểm) → Max 100
    const isOtherDiem = isDiemUnit && !isC3Diem;

    // ✅ Set mặc định cho "Đã thực hiện"
    let da_thuc_hien;
    if (isFirstTwo) {
      da_thuc_hien = "100"; // F1, F2 mặc định 100%
    } else if (isC3Diem) {
      da_thuc_hien = "4.1"; // C3 (Điểm) mặc định 4.1
    } else if (isLanUnit) {
      da_thuc_hien = "12"; // Đơn vị "Lần" mặc định 12
    } else {
      da_thuc_hien = it?.da_thuc_hien ?? ""; // C1, C2 không set mặc định
    }

    // ✅ Set mặc định cho "CBQL Đánh giá" (so_loi)
    const isPercentRow =
      donViTinh.trim() === "%" ||
      donViTinh.includes("%") ||
      ["F1", "F2"].includes(kyHieu.toUpperCase());

    let so_loi_default;
    if (isC3Diem) {
      so_loi_default = "4.1"; // C3 (Điểm) mặc định 4.1
    } else if (isLanUnit) {
      so_loi_default = "12"; // Đơn vị "Lần" mặc định 12
    } else if (isOtherDiem) {
      so_loi_default = "100"; // C1, C2 mặc định 100
    } else if (isPercentRow) {
      so_loi_default = "100"; // % mặc định 100
    } else {
      so_loi_default = "0"; // Lỗi mặc định 0
    }

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
      nv_danh_gia: nv_danh_gia_calc,
      nv_danh_gia_goc: it?.ty_trong ?? 0,
      cac_do_luong: it?.cac_do_luong ?? "",
      bp_theo_doi: it?.bp_theo_doi ?? "",
      so_loi: so_loi_default,
      ty_trong_cuoi: ty_trong_cuoi_calc,
      ty_trong_cuoi_goc: it?.ty_trong ?? 0,
      noi_dung_loi: it?.noi_dung_loi ?? "",
      kpi_phu: kpiPhuData,
    };
  });

// Function tính ty_trong_cuoi dựa trên CBQL đánh giá
const calculateTyTrongCuoi = ({
  cbqlDanhGia,
  tyTrong,
  donViTinh,
  kyHieu,
  daThucHien,
  keHoachQuy,
}) => {
  const w = Number(tyTrong || 0);
  const cbql = Number(cbqlDanhGia || 0);

  // ✅ LOGIC ĐƠN VỊ "LẦN" (Max = 12)
  if (
    String(donViTinh || "")
      .toLowerCase()
      .includes("lần")
  ) {
    const MAX_LAN = 12;
    const score = Math.min(cbql, MAX_LAN);
    return Math.round((score / MAX_LAN) * w * 100) / 100;
  }

  // ===== LOGIC KPI C3 (Đơn vị tính = Điểm, Max cố định = 4.1) =====
  if (
    String(kyHieu || "").toUpperCase() === "C3" &&
    String(donViTinh || "")
      .toLowerCase()
      .includes("điểm")
  ) {
    const MAX_SCORE = 4.1;
    const score = cbql > 0 ? cbql : MAX_SCORE;
    const limitedScore = Math.min(score, MAX_SCORE);
    const result = (limitedScore / MAX_SCORE) * w;
    return Math.round(result * 100) / 100;
  }

  // ✅ LOGIC C1, C2, ... (Điểm) - Max 100
  if (
    String(donViTinh || "")
      .toLowerCase()
      .includes("điểm")
  ) {
    const MAX_SCORE = 100;
    const score = Math.min(cbql, MAX_SCORE);
    return Math.round((score / MAX_SCORE) * w * 100) / 100;
  }

  const isPercentRow =
    String(donViTinh || "").trim() === "%" ||
    String(donViTinh || "").includes("%") ||
    ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

  const isErrorRow = String(donViTinh || "")
    .toLowerCase()
    .includes("lỗi");

  // ===== LOGIC CŨ: Hàng "Lỗi" =====
  if (isErrorRow) {
    if (cbql === 0) return w;

    if (w >= 1 && w <= 9) {
      const deduction = cbql * 1;
      return Math.max(0, w - deduction);
    } else if (w >= 10) {
      const deductionPerError = w / 2;
      const totalDeduction = cbql * deductionPerError;
      return Math.max(0, w - totalDeduction);
    }
    return w;
  }

  // ===== LOGIC CŨ: Hàng % (F1, F2, ...) =====
  if (isPercentRow) {
    const pct = Math.max(0, Math.min(100, cbql));
    return Math.round(((w * pct) / 100) * 100) / 100;
  }

  // Default fallback
  const pct = Math.max(0, Math.min(100, cbql));
  return Math.round(((w * pct) / 100) * 100) / 100;
};

// Function tính NV đánh giá
const calculateNVDanhGia = ({
  daThucHien,
  tyTrong,
  donViTinh,
  kyHieu,
  userRoles,
}) => {
  const w = Number(tyTrong || 0);
  const th = Number(daThucHien || 0);

  // ✅ LOGIC ĐƠN VỊ "LẦN" (Max = 12)
  if (
    String(donViTinh || "")
      .toLowerCase()
      .includes("lần")
  ) {
    const MAX_LAN = 12;
    const score = Math.min(th, MAX_LAN);
    return Math.round((score / MAX_LAN) * w * 100) / 100;
  }

  // ===== LOGIC MỚI: KPI C3 (Điểm) =====
  const isC3Diem =
    String(kyHieu || "").toUpperCase() === "C3" &&
    String(donViTinh || "")
      .toLowerCase()
      .includes("điểm");

  if (isC3Diem) {
    const MAX_SCORE = 4.1;
    const score = Math.min(th, MAX_SCORE);
    return Math.round((score / MAX_SCORE) * w * 100) / 100;
  }

  // ✅ LOGIC C1, C2, ... (Điểm) - Max 100
  if (
    String(donViTinh || "")
      .toLowerCase()
      .includes("điểm")
  ) {
    const MAX_SCORE = 100;
    const score = Math.min(th, MAX_SCORE);
    return Math.round((score / MAX_SCORE) * w * 100) / 100;
  }

  const isPercentRow =
    String(donViTinh || "").trim() === "%" ||
    String(donViTinh || "").includes("%") ||
    ["F1", "F2"].includes(String(kyHieu || "").toUpperCase());

  if (!isPercentRow) {
    // Hàng "Lỗi": trừ từ tỷ trọng gốc theo số lỗi đã thực hiện
    if (th === 0) return w;
    if (w >= 1 && w <= 9) {
      const deduction = th * 1;
      return Math.max(0, w - deduction);
    } else if (w >= 10) {
      const deductionPerError = w / 2;
      const totalDeduction = th * deductionPerError;
      return Math.max(0, w - totalDeduction);
    }
    return w;
  }

  // Hàng % (hoặc F1/F2): tính theo % thực hiện
  const pct = Math.max(0, Math.min(100, th));
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
    const aq = Number(a?.quy || 0),
      bq = Number(b?.quy || 0);
    if (bn > an || (bn === an && bq > aq)) best = i;
  }
  return best;
};

// Unwrap response
const unwrapForms = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.success === false) {
    const err = new Error(res.message || "Không tìm thấy Form KPI");
    err._isBackendMsg = true;
    throw err;
  }
  return [];
};

const CheckKPIModal = ({ onClose, onSaved, selectedYear, userRoles }) => {
  const [codeInput, setCodeInput] = useState("");
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState("");

  const [formRecord, setFormRecord] = useState(null);
  const [formKpis, setFormKpis] = useState([]);

  const [showSubKpiModal, setShowSubKpiModal] = useState(false);
  const [currentKpiPhu, setCurrentKpiPhu] = useState([]);
  const [kpiPhuAffectedIndex, setKpiPhuAffectedIndex] = useState(null);
  const [kpiPhuErrorsAdded, setKpiPhuErrorsAdded] = useState(0);

  const handleOpenSubKpiModal = () => {
    const savedKpiPhu = formKpis[0]?.kpi_phu || formRecord?.kpi_phu || [];
    setCurrentKpiPhu(savedKpiPhu);
    setShowSubKpiModal(true);
  };

  const handleCloseSubKpiModal = () => {
    setShowSubKpiModal(false);
  };

  // Kiểm tra quyền chấm KPI cho nhân viên
  const canScoreStaff = useCallback(
    (staff) => {
      if (!staff || !userRoles) return false;

      const donViChinh =
        typeof staff.don_vi === "object"
          ? staff.don_vi?.chinh || ""
          : staff.don_vi || "";
      const donViPhu =
        typeof staff.don_vi === "object" ? staff.don_vi?.phu || "" : "";

      const isPhuNhapHang = donViPhu.trim().toLowerCase() === "nhập hàng";
      const isPhuXuatHang = donViPhu.trim().toLowerCase() === "xuất hàng";

      // PGD: Toàn quyền
      if (userRoles.includes(ROLE_KPI.PGD)) {
        return true;
      }

      // ✅ MỚI: TOTRUONGXUAT1 được chấm TẤT CẢ nhân viên Hỗ Trợ
      const isChinhHoTro = donViChinh.trim().toLowerCase() === "hỗ trợ";
      if (isChinhHoTro && userRoles.includes(ROLE_KPI.TOTRUONGXUAT1)) {
        return true;
      }

      // ✅ ƯU TIÊN: Kiểm tra đơn vị PHỤ trước
      if (isPhuXuatHang) {
        return userRoles.some((r) =>
          [ROLE_KPI.TOTRUONGXUAT1, ROLE_KPI.TOTRUONGXUAT2].includes(r),
        );
      }

      if (isPhuNhapHang) {
        return userRoles.includes(ROLE_KPI.TOTRUONGNHAP);
      }

      // ✅ Nếu KHÔNG có đơn vị phụ → Dựa vào đơn vị CHÍNH
      const isChinhXuatHang = donViChinh.trim().toLowerCase() === "xuất hàng";
      const isChinhNhapHang = donViChinh.trim().toLowerCase() === "nhập hàng";

      if (isChinhXuatHang) {
        return userRoles.some((r) =>
          [ROLE_KPI.TOTRUONGXUAT1, ROLE_KPI.TOTRUONGXUAT2].includes(r),
        );
      }

      if (isChinhNhapHang) {
        return userRoles.includes(ROLE_KPI.TOTRUONGNHAP);
      }

      return false;
    },
    [userRoles],
  );

  // ✅ HÀM XỬ LÝ SAVE KPI PHỤ
  const handleSaveSubKpi = (updatedSubKpis) => {
    const totalSubKpiErrors = updatedSubKpis.reduce(
      (sum, item) => sum + Number(item.so_loi || 0),
      0,
    );

    const errorsToDistribute = Math.floor(totalSubKpiErrors / 3);

    setFormKpis((prev) => {
      let updated = prev.map((kpi) => ({
        ...kpi,
        kpi_phu: updatedSubKpis,
      }));
      setKpiPhuAffectedIndex(null);
      setKpiPhuErrorsAdded(0);

      if (errorsToDistribute > 0) {
        const eligibleKpis = updated
          .map((kpi, index) => ({
            index,
            ty_trong: Number(kpi?.ty_trong || 999),
            ky_hieu: String(kpi?.ky_hieu || "").toUpperCase(),
            don_vi_tinh: String(kpi?.don_vi_tinh || ""),
          }))
          .filter(
            (item) =>
              !["F1", "F2"].includes(item.ky_hieu) &&
              !(
                item.ky_hieu === "C3" &&
                item.don_vi_tinh.toLowerCase().includes("điểm")
              ),
          );

        if (eligibleKpis.length === 0) {
          toast.warning(
            `Có ${errorsToDistribute} lỗi từ KPI phụ nhưng không có KPI nào đủ điều kiện để trừ điểm (tất cả là F1/F2/C3)`,
            { autoClose: 4000 },
          );
          return updated;
        }

        let lowestIndex = eligibleKpis[0].index;
        let lowestTyTrong = eligibleKpis[0].ty_trong;

        for (let i = 1; i < eligibleKpis.length; i++) {
          if (eligibleKpis[i].ty_trong < lowestTyTrong) {
            lowestTyTrong = eligibleKpis[i].ty_trong;
            lowestIndex = eligibleKpis[i].index;
          }
        }

        const kpi = { ...updated[lowestIndex] };
        const donViTinh = String(kpi.don_vi_tinh || "");

        const isPercentKPI =
          donViTinh.trim() === "%" || donViTinh.includes("%");
        if (isPercentKPI) {
          const tyTrongGoc = Number(kpi.ty_trong || 0);

          // ✅ Trừ trực tiếp từ TỶ TRỌNG GỐC, không dùng tỷ trọng cuối cũ
          const newTyTrongCuoi = Math.max(
            0,
            tyTrongGoc - errorsToDistribute, // ✅ Trừ từ tỷ trọng gốc
          );
          kpi.ty_trong_cuoi = newTyTrongCuoi;

          // ✅ Tính ngược CBQL từ tỷ trọng cuối
          let newCBQL = 100;
          if (tyTrongGoc > 0) {
            newCBQL =
              Math.round((newTyTrongCuoi / tyTrongGoc) * 100 * 100) / 100;
            newCBQL = Math.max(0, Math.min(100, newCBQL));
          }
          kpi.so_loi = String(newCBQL);

          toast.info(
            `📊 KPI "${kpi.kpi}" (${tyTrongGoc}%): ${totalSubKpiErrors} lỗi KPI phụ → Trừ ${errorsToDistribute}% | Tỷ trọng: ${tyTrongGoc}% → ${newTyTrongCuoi}% | CBQL: ${newCBQL}%`,
            { autoClose: 5000 },
          );
        } else {
          // ✅ CHỈ GHI ĐÈ = số lỗi từ KPI phụ, KHÔNG cộng thêm
          kpi.so_loi = String(errorsToDistribute);

          kpi.ty_trong_cuoi = calculateTyTrongCuoi({
            cbqlDanhGia: kpi.so_loi,
            tyTrong: kpi.ty_trong,
            donViTinh: kpi.don_vi_tinh,
            kyHieu: kpi.ky_hieu,
          });

          toast.info(
            `⚠️ KPI "${kpi.kpi}" (${lowestTyTrong}%): ${totalSubKpiErrors} lỗi KPI phụ → ${errorsToDistribute} lỗi. Tỷ trọng: ${kpi.ty_trong_cuoi}%`,
            { autoClose: 5000 },
          );
        }

        updated[lowestIndex] = kpi;
        setKpiPhuAffectedIndex(lowestIndex);
        setKpiPhuErrorsAdded(errorsToDistribute);
      }

      return updated;
    });

    setShowSubKpiModal(false);
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = checkKPIService.getQuarterFromMonth(currentMonth);
  const [quarterInput, setQuarterInput] = useState(currentQuarter);

  const currentYear = useMemo(
    () => selectedYear || new Date().getFullYear(),
    [selectedYear],
  );

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
      let list = await formkpistaffService.getAllFormKPI({
        ma_nhan_vien: code,
        quy: quarterInput,
        nam: currentYear,
      });
      let arr = unwrapForms(list);

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

      arr.sort((a, b) => {
        const dn = Number(b?.nam || 0) - Number(a?.nam || 0);
        return dn !== 0 ? dn : Number(b?.quy || 0) - Number(a?.quy || 0);
      });

      const formsInQuarter = arr.filter(
        (r) => Number(r?.quy) === Number(quarterInput),
      );

      let rec;
      if (formsInQuarter.length > 0) {
        rec = formsInQuarter[0];
        console.log("✅ Tìm thấy Form KPI cho Quý", quarterInput);
      } else {
        rec = arr[pickNewestIndex(arr)];
        toast.warning(
          `Không tìm thấy Form KPI cho Quý ${quarterInput}/${currentYear}. Đang sử dụng Form KPI Quý ${rec?.quy || "?"}/${rec?.nam || "?"}`,
          { autoClose: 4000 },
        );
      }

      if (!rec._id && !rec.id) {
        setFindError("Form KPI không có ID hợp lệ. Dữ liệu có thể bị lỗi.");
        return;
      }

      if (!canScoreStaff(rec)) {
        setFormRecord(null);
        setFormKpis([]);

        const donViChinh =
          typeof rec.don_vi === "object"
            ? rec.don_vi?.chinh || ""
            : rec.don_vi || "";
        const donViPhu =
          typeof rec.don_vi === "object" ? rec.don_vi?.phu || "" : "";
        const isPhuNhapHang = donViPhu.trim().toLowerCase() === "nhập hàng";
        const isPhuXuatHang = donViPhu.trim().toLowerCase() === "xuất hàng";

        let errorMessage = "";

        if (isPhuXuatHang) {
          errorMessage = `⚠️ Bạn không có quyền chấm KPI cho nhân viên "${rec.ho_ten}" (${rec.ma_nhan_vien}) có đơn vị phụ "Xuất hàng". Chỉ Tổ trưởng Xuất (TOTRUONGXUAT1/2) hoặc PGD mới được chấm!`;
        } else if (isPhuNhapHang) {
          errorMessage = `⚠️ Bạn không có quyền chấm KPI cho nhân viên "${rec.ho_ten}" (${rec.ma_nhan_vien}) có đơn vị phụ "Nhập hàng". Chỉ Tổ trưởng Nhập (TOTRUONGNHAP) hoặc PGD mới được chấm!`;
        } else if (donViChinh.trim().toLowerCase() === "nhập hàng") {
          errorMessage = `⚠️ Bạn không có quyền chấm KPI cho nhân viên "${rec.ho_ten}" (${rec.ma_nhan_vien}) thuộc Nhập hàng. Chỉ Tổ trưởng Nhập (TOTRUONGNHAP) hoặc PGD mới được chấm!`;
        } else if (donViChinh.trim().toLowerCase() === "xuất hàng") {
          errorMessage = `⚠️ Bạn không có quyền chấm KPI cho nhân viên "${rec.ho_ten}" (${rec.ma_nhan_vien}) thuộc Xuất hàng. Chỉ Tổ trưởng Xuất (TOTRUONGXUAT1/2) hoặc PGD mới được chấm!`;
        } else {
          errorMessage = `⚠️ Bạn không có quyền chấm KPI cho nhân viên "${rec.ho_ten}" (${rec.ma_nhan_vien}).`;
        }

        toast.error(errorMessage, { autoClose: 5000 });
        setFinding(false);
        return;
      }

      setFormRecord(rec);
      setFormKpis(mapFormToEditable(rec));
    } catch (e) {
      console.error(e);
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
        const v = String(value);
        let num = Number(v);
        if (Number.isNaN(num)) num = 0;
        if (num < 0) num = 0;

        const isC3Diem =
          String(curr.ky_hieu || "").toUpperCase() === "C3" &&
          String(curr.don_vi_tinh || "")
            .toLowerCase()
            .includes("điểm");

        const isLanUnit = String(curr.don_vi_tinh || "")
          .toLowerCase()
          .includes("lần");

        // ✅ Giới hạn theo loại KPI
        if (isC3Diem) {
          if (num > 4.1) num = 4.1;
        } else if (isLanUnit) {
          if (num > 12) num = 12;
        } else if (
          String(curr.don_vi_tinh || "")
            .toLowerCase()
            .includes("điểm")
        ) {
          if (num > 100) num = 100;
        } else {
          const isPercentRow =
            String(curr.don_vi_tinh || "").includes("%") ||
            ["F1", "F2"].includes(String(curr.ky_hieu || "").toUpperCase());
          if (isPercentRow && num > 100) num = 100;
        }

        curr.da_thuc_hien = String(num);

        curr.nv_danh_gia = calculateNVDanhGia({
          daThucHien: num,
          tyTrong: curr.ty_trong,
          donViTinh: curr.don_vi_tinh,
          kyHieu: curr.ky_hieu,
        });
      } else if (field === "cbql_danh_gia") {
        const v = String(value);
        let num = Number(v);
        if (Number.isNaN(num)) num = 0;
        if (num < 0) num = 0;

        const isC3Diem =
          String(curr.ky_hieu || "").toUpperCase() === "C3" &&
          String(curr.don_vi_tinh || "")
            .toLowerCase()
            .includes("điểm");

        const isLanUnit = String(curr.don_vi_tinh || "")
          .toLowerCase()
          .includes("lần");

        // ✅ Giới hạn theo loại KPI
        if (isC3Diem) {
          if (num > 4.1) num = 4.1;
        } else if (isLanUnit) {
          if (num > 12) num = 12;
        } else if (
          String(curr.don_vi_tinh || "")
            .toLowerCase()
            .includes("điểm")
        ) {
          if (num > 100) num = 100;
        } else {
          const isPercentRow =
            String(curr.don_vi_tinh || "").includes("%") ||
            ["F1", "F2"].includes(String(curr.ky_hieu || "").toUpperCase());
          if (isPercentRow && num > 100) num = 100;
        }

        curr.so_loi = String(num);

        curr.ty_trong_cuoi = calculateTyTrongCuoi({
          cbqlDanhGia: num,
          tyTrong: curr.ty_trong,
          donViTinh: curr.don_vi_tinh,
          kyHieu: curr.ky_hieu,
        });
      } else if (field === "noi_dung_loi") {
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

    const formId = formRecord._id || formRecord.id;
    if (!formId) {
      alert("Form KPI không hợp lệ (thiếu ID). Vui lòng thử tải lại Form KPI.");
      return;
    }

    if (!formKpis || formKpis.length === 0) {
      alert("Không có dữ liệu KPI để đánh giá.");
      return;
    }

    let quy = parseInt(quarterInput, 10);
    if (Number.isNaN(quy) || quy < 1) quy = 1;
    if (quy > 4) quy = 4;

    try {
      let existingRecords = [];
      try {
        console.log("🔍 Bắt đầu kiểm tra trùng lặp cho:", {
          form_kpi_id: formId,
          quy: quy,
          nam: currentYear,
        });

        const allCheckResult = await checkKPIService.getAllCheckKPI({
          nam: currentYear,
        });

        let allRecords = [];
        if (Array.isArray(allCheckResult)) {
          allRecords = allCheckResult;
        } else if (allCheckResult?.data && Array.isArray(allCheckResult.data)) {
          allRecords = allCheckResult.data;
        }

        existingRecords = allRecords.filter((record) => {
          const recordMaNV = record.ma_nhan_vien;
          const recordQuy = Number(record.quy);
          const recordNam = Number(record.nam);

          const isMatch =
            recordMaNV === formRecord.ma_nhan_vien &&
            recordQuy === quy &&
            recordNam === currentYear;

          return isMatch;
        });

        if (existingRecords.length > 0) {
          existingRecords.forEach((rec, idx) => {});
        }
      } catch (checkError) {
        console.error("❌ Lỗi khi kiểm tra:", checkError);
        console.error("❌ Chi tiết lỗi:", JSON.stringify(checkError, null, 2));
      }

      if (existingRecords.length > 0) {
        toast.error(
          `❌ Đã tồn tại bản ghi đánh giá KPI cho ${formRecord.ho_ten} (${formRecord.ma_nhan_vien}) - Quý ${quy}/${currentYear}. Không thể chấm lại!`,
          { autoClose: 4000 },
        );
        return;
      }

      const kpisToSave = formKpis.map((kpi) => ({
        kpi: String(kpi.kpi || ""),
        ty_trong: Number(kpi.ty_trong || 0),
        ty_trong_cuoi: Number(kpi.ty_trong_cuoi || 0),
        ky_hieu: String(kpi.ky_hieu || ""),
        don_vi_tinh: String(kpi.don_vi_tinh || ""),
        da_thuc_hien: String(kpi.da_thuc_hien || "0"),
        ke_hoach_quy: String(kpi.ke_hoach_quy || ""),
        chu_ki: String(kpi.chu_ki || ""),
        nv_danh_gia: Number(kpi.nv_danh_gia || 0),
        cac_do_luong: String(kpi.cac_do_luong || ""),
        bp_theo_doi: String(kpi.bp_theo_doi || ""),
        so_loi: Number(kpi.so_loi || 0),
        noi_dung_loi: String(kpi.noi_dung_loi || ""),
      }));

      const kpiPhuToSave = formKpis[0]?.kpi_phu || null;

      const payloadData = {
        form_kpi_id: formId,
        quy,
        nam: currentYear,
        danh_sach_check: kpisToSave,
        kpi_phu: kpiPhuToSave,
        ty_trong_quy: Number(finalScore || 0),
      };
      const created = await checkKPIService.createCheckKPI(payloadData);

      toast.success("✅ Đã lưu đánh giá KPI thành công!", { autoClose: 2500 });
      if (typeof onSaved === "function") await onSaved();
      onClose?.();
    } catch (e) {
      let errorMessage = "Vui lòng thử lại.";

      if (e?.response?.data?.message) {
        errorMessage = e.response.data.message;

        if (
          errorMessage.includes("đã tồn tại") ||
          errorMessage.includes("duy nhất")
        ) {
          toast.error(
            `❌ Đã tồn tại bản ghi đánh giá KPI cho ${formRecord.ho_ten} - Quý ${quy}/${currentYear}. Không thể chấm lại!`,
            { autoClose: 4000 },
          );
          return;
        }
      } else if (e?.message) {
        errorMessage = e.message;
      }

      toast.error(`Lưu thất bại: ${errorMessage}`, { autoClose: 3000 });
    }
  };

  const getQuarterMonths = (quy) => {
    const months = checkKPIService.getMonthsFromQuarter(quy);
    return `Tháng ${months.start} - ${months.end}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kpi-review-title"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div
        className={[
          "relative z-10 mx-auto my-8 w-full px-4 sm:px-6",
          formRecord ? "max-w-[95vw]" : "max-w-md",
        ].join(" ")}
      >
        <div className="w-full rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10 max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 shrink-0">
            <h3
              id="kpi-review-title"
              className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight"
            >
              Đánh giá KPI theo Quý
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">
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

              {formRecord && (
                <div className="space-y-4">
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
                      <b className="ml-1 font-semibold">
                        {formRecord.don_vi?.chinh}
                        {formRecord.don_vi?.phu
                          ? ` - ${formRecord.don_vi.phu}`
                          : ""}
                      </b>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-slate-700">Quý chấm:</label>
                    <select
                      value={quarterInput}
                      onChange={(e) => setQuarterInput(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      <option value={1}>Quý 1 (T1-T3)</option>
                      <option value={2}>Quý 2 (T4-T6)</option>
                      <option value={3}>Quý 3 (T7-T9)</option>
                      <option value={4}>Quý 4 (T10-T12)</option>
                    </select>
                    <span className="text-sm text-slate-600">
                      Năm:{" "}
                      <b className="font-semibold text-slate-800">
                        {currentYear}
                      </b>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 ring-1 ring-inset ring-blue-200">
                      {getQuarterMonths(quarterInput)}
                    </span>
                  </div>

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

                  {formRecord?.kpi_phu && formRecord.kpi_phu.length > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600">
                          <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">
                            Chấm điểm KPI Phụ
                          </h4>
                          <p className="text-xs text-slate-600">
                            {formRecord.kpi_phu.length} KPI phụ cần chấm điểm
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenSubKpiModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-all"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Chấm điểm KPI Phụ
                      </button>
                    </div>
                  )}

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
                                      e.target.value,
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
                                        e.target.value,
                                      )
                                    }
                                    title={
                                      kpiPhuAffectedIndex === i &&
                                      kpiPhuErrorsAdded > 0
                                        ? `⚠️ Có ${kpiPhuErrorsAdded} lỗi từ KPI phụ đã được tự động thêm vào`
                                        : ""
                                    }
                                    className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm outline-none focus-visible:ring-2 transition-all ${
                                      kpiPhuAffectedIndex === i &&
                                      kpiPhuErrorsAdded > 0
                                        ? "border-rose-500 bg-rose-50 text-rose-700 focus-visible:ring-rose-300 font-semibold"
                                        : "border-slate-300 focus-visible:ring-indigo-300"
                                    }`}
                                  />
                                  {(donViTinh.toLowerCase().includes("%") ||
                                    donViTinh === "%") && (
                                    <span
                                      className={`text-xs ${
                                        kpiPhuAffectedIndex === i &&
                                        kpiPhuErrorsAdded > 0
                                          ? "text-rose-700 font-semibold"
                                          : ""
                                      }`}
                                    >
                                      %
                                    </span>
                                  )}
                                  {kpiPhuAffectedIndex === i &&
                                    kpiPhuErrorsAdded > 0 && (
                                      <span className="ml-1 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                                        {kpiPhuErrorsAdded}% từ KPI phụ
                                      </span>
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
                                      e.target.value,
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
                  Quý <strong className="text-slate-800">{quarterInput}</strong>{" "}
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
      {showSubKpiModal && (
        <SubKpiModal
          kpiName="KPI Phụ"
          subKpis={currentKpiPhu}
          onClose={handleCloseSubKpiModal}
          onSave={handleSaveSubKpi}
        />
      )}
    </div>
  );
};

export default CheckKPIModal;
