/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { checkListBDHService } from "@/services/checklistbdh.service";

// Định nghĩa quyền truy cập cho từng mã nhân viên
const EMPLOYEE_PERMISSIONS = {
  20952: {
    sections: [
      "QUẢN LÝ ĐIỀU HÀNH CÔNG VIỆC CHUNG TRONG TỔ",
      "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
      "QUẢN LÝ TỒN KHO",
      "TRANG THIẾT BỊ",
      "CẬP NHẬT VÀ PHÂN BỔ HÀNG HÓA",
      "KIỂM TRA, ĐIỀU PHỐI",
      "BÁO CÁO VÀ CÔNG VIỆC KHÁC",
      "XLBB VÀ PHÁT SINH",
    ],
    excludedJobs: {
      "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"],
    },
  },
  40303: {
    sections: [
      "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
      "QUẢN LÝ TỒN KHO",
      "TRANG THIẾT BỊ",
      "KIỂM TRA, ĐIỀU PHỐI",
      "BÁO CÁO VÀ CÔNG VIỆC KHÁC",
      "XLBB VÀ PHÁT SINH",
    ],
    excludedJobs: {
      "ĐIỀU PHỐI NHẬP - XUẤT HÀNG": ["SẮP XẾP NHÂN SỰ NHẬP HÀNG SLL"],
      "TRANG THIẾT BỊ": ["KIỂM TRA VẬN HÀNH XE NÂNG"],
    },
    includedJobs: {
      "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"],
    },
  },
  23204: {
    sections: [
      "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
      "QUẢN LÝ TỒN KHO",
      "TRANG THIẾT BỊ",
      "KIỂM TRA, ĐIỀU PHỐI",
      "BÁO CÁO VÀ CÔNG VIỆC KHÁC",
      "XLBB VÀ PHÁT SINH",
    ],
    excludedJobs: {
      "ĐIỀU PHỐI NHẬP - XUẤT HÀNG": ["SẮP XẾP NHÂN SỰ NHẬP HÀNG SLL"],
      "TRANG THIẾT BỊ": ["KIỂM TRA VẬN HÀNH XE NÂNG"],
      "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"],
    },
  },
};

const RESTRICTED_FORM_ID = "687f155b32fbc64dbf1c0bb0";

// ✅ Hàm kiểm tra công việc có được mở khóa hôm nay không
const isUnlockedToday = (quy_dinh) => {
  if (!quy_dinh) return true;

  const now = new Date();
  const vietnamTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );

  const dayOfWeek = vietnamTime.getDay();
  const dayOfMonth = vietnamTime.getDate();

  if (
    quy_dinh.loai === "phát sinh" ||
    quy_dinh.loai === "phat_sinh" ||
    quy_dinh.loai === "ngày"
  ) {
    return true;
  }

  if (quy_dinh.loai === "tuần") {
    if (!quy_dinh.ngay_trong_tuan || quy_dinh.ngay_trong_tuan.length === 0) {
      return false;
    }
    return quy_dinh.ngay_trong_tuan.includes(dayOfWeek);
  }

  if (quy_dinh.loai === "tháng") {
    if (
      !quy_dinh.ngay_trong_thang ||
      quy_dinh.ngay_trong_thang.length === 0
    ) {
      return false;
    }
    return quy_dinh.ngay_trong_thang.includes(dayOfMonth);
  }

  return true;
};

// ✅ Tạo thông báo lịch cho công việc bị khóa
const getScheduleNote = (quy_dinh) => {
  if (!quy_dinh || isUnlockedToday(quy_dinh)) return null;

  const daysOfWeek = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  if (quy_dinh.loai === "tuần" && quy_dinh.ngay_trong_tuan) {
    const days = quy_dinh.ngay_trong_tuan
      .map((d) => daysOfWeek[d])
      .join(", ");
    return `🔒 Công việc này chỉ mở vào: ${days}`;
  }

  if (quy_dinh.loai === "tháng" && quy_dinh.ngay_trong_thang) {
    const days = quy_dinh.ngay_trong_thang.sort((a, b) => a - b).join(", ");
    return `🔒 Công việc này chỉ mở vào ngày: ${days} hàng tháng`;
  }

  return null;
};

// ✅ Kiểm tra loại quy định để hiển thị badge
const getScheduleBadge = (quy_dinh) => {
  if (!quy_dinh) return null;

  const badges = {
    "phát sinh": {
      text: "Phát sinh",
      bgColor: "bg-orange-500",
      icon: "⚡",
    },
    phat_sinh: {
      text: "Phát sinh",
      bgColor: "bg-orange-500",
      icon: "⚡",
    },
    tuần: {
      text: "Hàng tuần",
      bgColor: "bg-blue-500",
      icon: "📅",
    },
    tháng: {
      text: "Hàng tháng",
      bgColor: "bg-purple-500",
      icon: "📆",
    },
  };

  return badges[quy_dinh.loai] || null;
};

// ✅ Kiểm tra có quy định đặc biệt không
const hasSpecialSchedule = (quy_dinh) => {
  if (!quy_dinh) return false;
  return ["phát sinh", "phat_sinh", "tuần", "tháng"].includes(quy_dinh.loai);
};

const NhapHandler = ({ form, userInfo, formId, onSuccess, onError }) => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");

  const isRestricted = formId === RESTRICTED_FORM_ID;

  const hasPermission = useMemo(() => {
    if (!isRestricted) return true;
    return Object.prototype.hasOwnProperty.call(
      EMPLOYEE_PERMISSIONS,
      userInfo.employeeId,
    );
  }, [isRestricted, userInfo.employeeId]);

  const allowedSections = useMemo(() => {
    if (!isRestricted) {
      return form.cac_muc?.map((section) => section.ten_muc) || [];
    }

    const permissions = EMPLOYEE_PERMISSIONS[userInfo.employeeId];
    if (!permissions) {
      return [];
    }
    return permissions.sections;
  }, [isRestricted, form.cac_muc, userInfo.employeeId]);

  const canAccessSection = useCallback((sectionName) => {
    return allowedSections.includes(sectionName);
  }, [allowedSections]);

  const canAccessJob = useCallback((sectionName, jobContent) => {
    if (!isRestricted) {
      return true;
    }

    const permissions = EMPLOYEE_PERMISSIONS[userInfo.employeeId];
    if (!permissions) {
      return false;
    }

    if (permissions.includedJobs && permissions.includedJobs[sectionName]) {
      return permissions.includedJobs[sectionName].includes(jobContent);
    }

    if (permissions.excludedJobs && permissions.excludedJobs[sectionName]) {
      return !permissions.excludedJobs[sectionName].includes(jobContent);
    }

    return true;
  }, [isRestricted, userInfo.employeeId]);

  // ✅ Lọc công việc theo quyền (không lọc theo lịch trình nữa)
  const getFilteredJobs = useCallback((section) => {
    if (!section?.cong_viec) return [];
    return section.cong_viec.filter((job) =>
      canAccessJob(section.ten_muc, job.noidung),
    );
  }, [canAccessJob]);

  const toggleExpand = useCallback((sectionIdx, jobIdx) => {
    const key = `${sectionIdx}-${jobIdx}`;
    setExpandedJobs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const toggleJob = useCallback((sectionIdx, jobIdx, job) => {
    const key = `${sectionIdx}-${jobIdx}`;

    setSelectedJobs((prevJobs) => {
      const exists = prevJobs.some((item) => item.key === key);
      if (exists) {
        return prevJobs.filter((item) => item.key !== key);
      } else {
        if (job.chi_tiet && job.chi_tiet.length > 0) {
          const allDetailIndexes = job.chi_tiet.map((_, idx) => idx);
          setSelectedDetails((prev) => ({
            ...prev,
            [key]: allDetailIndexes,
          }));
        }
        return [
          ...prevJobs,
          { key, sectionIdx, jobIdx, noidung: job.noidung },
        ];
      }
    });
  }, []);

  const toggleDetail = useCallback((sectionIdx, jobIdx, detailIdx) => {
    const jobKey = `${sectionIdx}-${jobIdx}`;

    setSelectedDetails((prev) => {
      const current = prev[jobKey] || [];
      if (current.includes(detailIdx)) {
        return {
          ...prev,
          [jobKey]: current.filter((idx) => idx !== detailIdx),
        };
      } else {
        return {
          ...prev,
          [jobKey]: [...current, detailIdx],
        };
      }
    });
  }, []);

  const addCustomJob = useCallback(() => {
    const jobText = newJob.trim();
    if (!jobText) return;

    const newJobObj = { noidung: jobText, chi_tiet: [] };
    setCustomJobs((prev) => [...prev, newJobObj]);
    setNewJob("");
  }, [newJob]);

  const removeCustomJob = useCallback((idx) => {
    setCustomJobs((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const visibleSections = useMemo(() => {
    return form.cac_muc?.filter((section) => canAccessSection(section.ten_muc)) || [];
  }, [form.cac_muc, canAccessSection]);

  const handleSubmit = useCallback(async () => {
    if (!userInfo?.employeeId || !formId) {
      toast.error("Thông tin nhân viên không hợp lệ.");
      return;
    }

    if (!hasPermission) {
      toast.error("❌ Mã nhân viên không có quyền truy cập form này.");
      return;
    }

    const filteredSections = visibleSections;

    if (filteredSections.length === 0) {
      toast.error("Không có công việc nào được phân quyền cho bạn.");
      return;
    }

    const transformedMucChecklist = filteredSections.map(
      (section, sectionIdx) => {
        const filteredJobs = getFilteredJobs(section);

        return {
          ten_muc: section.ten_muc,
          cong_viec: filteredJobs.map((job, jobIdx) => {
            const jobKey = `${sectionIdx}-${jobIdx}`;
            const isJobSelected = selectedJobs.some((j) => j.key === jobKey);
            const selectedDetailIndexes = selectedDetails[jobKey] || [];

            return {
              noidung: job.noidung,
              da_chon: isJobSelected,
              quy_dinh: job.quy_dinh,
              chi_tiet: (job.chi_tiet || []).map((detail, detailIdx) => ({
                noi_dung_chi_tiet: detail.noi_dung_chi_tiet,
                da_chon:
                  isJobSelected && selectedDetailIndexes.includes(detailIdx),
              })),
            };
          }),
        };
      },
    );

    const transformedCustomJobs = customJobs.map((job) => ({
      noidung: job.noidung,
      da_chon: true,
      chi_tiet: [],
    }));

    const payload = {
      ma_nhan_vien: userInfo.employeeId,
      ho_ten: userInfo.userName,
      don_vi: userInfo.department,
      ghi_chu: "",
      cac_muc: transformedMucChecklist,
      cong_viec_khac: transformedCustomJobs,
      thoi_gian_tao: new Date().toISOString(),
    };

    try {
      await checkListBDHService.createCheckListBDH(formId, payload);
      onSuccess();
    } catch (err) {
      onError(err);
    }
  }, [
    userInfo,
    formId,
    hasPermission,
    visibleSections,
    getFilteredJobs,
    selectedJobs,
    selectedDetails,
    customJobs,
    onSuccess,
    onError,
  ]);

  if (isRestricted && !hasPermission) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen max-w-3xl mx-auto shadow-sm">
        <h2 className="text-center text-xl font-bold text-blue-700 mb-6 uppercase tracking-wide">
          {form.tieu_de}
        </h2>

        <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
          <p className="text-red-700 text-lg font-semibold mb-2">
            ⛔ Không có quyền truy cập
          </p>
          <p className="text-red-600">
            Mã nhân viên <strong>{userInfo.employeeId}</strong> không có quyền
            truy cập form này.
          </p>
          <p className="text-sm text-gray-600 mt-3">
            Vui lòng liên hệ bộ phận IT nếu bạn cần được cấp quyền.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen max-w-3xl mx-auto shadow-sm">
      <h2 className="text-center text-xl font-bold text-blue-700 mb-6 uppercase tracking-wide">
        {form.tieu_de}
      </h2>

      {form.mo_ta && (
        <p className="text-gray-600 mb-6 text-sm text-center italic">
          {form.mo_ta}
        </p>
      )}

      <div className="mb-6 text-sm text-gray-800 space-y-1 bg-white p-4 rounded-lg border shadow">
        <p>
          <strong className="text-gray-500">Mã nhân viên:</strong>{" "}
          {userInfo.employeeId}
        </p>
        <p>
          <strong className="text-gray-500">Họ và tên:</strong>{" "}
          {userInfo.userName}
        </p>
        <p>
          <strong className="text-gray-500">Bộ phận:</strong>{" "}
          {userInfo.department}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-blue-700 mb-4 border-b pb-2 border-blue-100">
          📋 Danh sách công việc
        </h3>

        {visibleSections.length === 0 ? (
          <p className="text-gray-500 text-center py-4 bg-yellow-50 rounded-lg">
            ⚠️ Không có công việc nào được phân quyền cho bạn.
          </p>
        ) : (
          visibleSections.map((section, sectionIdx) => {
            const filteredJobs = getFilteredJobs(section);

            if (filteredJobs.length === 0) return null;

            return (
              <div key={sectionIdx} className="mb-6">
                <p className="font-semibold text-gray-900 mb-3 bg-blue-50 p-2 rounded">
                  🔹 {section.ten_muc}
                </p>
                <div className="space-y-3">
                  {filteredJobs.map((job, jobIdx) => {
                    const jobKey = `${sectionIdx}-${jobIdx}`;
                    const isJobSelected = selectedJobs.some(
                      (j) => j.key === jobKey,
                    );
                    const isExpanded = expandedJobs[jobKey];
                    const hasDetails = job.chi_tiet && job.chi_tiet.length > 0;

                    // ✅ Kiểm tra công việc có được mở khóa không
                    const isUnlocked = isUnlockedToday(job.quy_dinh);
                    const scheduleNote = getScheduleNote(job.quy_dinh);

                    // ✅ Lấy thông tin badge
                    const badge = getScheduleBadge(job.quy_dinh);
                    const isSpecial = hasSpecialSchedule(job.quy_dinh);
                    const isPhatSinh =
                      job.quy_dinh?.loai === "phát sinh" ||
                      job.quy_dinh?.loai === "phat_sinh";

                    return (
                      <div
                        key={jobIdx}
                        className={`border rounded-lg shadow transition-all duration-300 ${!isUnlocked
                            ? "border-gray-300 bg-gray-100 opacity-60"
                            : isPhatSinh
                              ? "border-orange-400 bg-gradient-to-r from-orange-50 to-red-50 ring-2 ring-orange-300"
                              : isSpecial
                                ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-blue-300"
                                : "border-gray-200 bg-white"
                          }`}
                      >
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-all">
                          <label
                            className={`flex items-center gap-3 w-full ${isUnlocked ? "cursor-pointer" : "cursor-not-allowed"}`}
                          >
                            <input
                              type="checkbox"
                              className="accent-blue-600 w-4 h-4"
                              checked={isJobSelected}
                              onChange={() =>
                                toggleJob(sectionIdx, jobIdx, job)
                              }
                              onClick={(e) => e.stopPropagation()}
                              disabled={!isUnlocked}
                            />
                            <span
                              className={`text-sm font-medium flex-1 ${!isUnlocked
                                  ? "text-gray-500"
                                  : isPhatSinh
                                    ? "text-orange-900 font-bold"
                                    : isSpecial
                                      ? "text-blue-900 font-semibold"
                                      : "text-gray-800"
                                }`}
                              onClick={(e) => {
                                e.preventDefault();
                                if (hasDetails && isUnlocked)
                                  toggleExpand(sectionIdx, jobIdx);
                              }}
                            >
                              {job.noidung}
                            </span>

                            {/* ✅ Badge hiển thị loại công việc */}
                            {badge && (
                              <span
                                className={`px-2.5 py-1 ${badge.bgColor
                                  } text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1 ${isPhatSinh ? "animate-pulse" : ""
                                  } ${!isUnlocked ? "opacity-50" : ""}`}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.text}</span>
                              </span>
                            )}
                          </label>
                          {hasDetails && isUnlocked && (
                            <button
                              onClick={() => toggleExpand(sectionIdx, jobIdx)}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          )}
                        </div>

                        {/* ✅ Hiển thị thông báo lịch cho công việc bị khóa */}
                        {!isUnlocked && scheduleNote && (
                          <div className="px-3 pb-3 text-xs text-gray-600 italic border-t border-gray-300 bg-gray-50 py-2">
                            {scheduleNote}
                          </div>
                        )}

                        {/* Chi tiết */}
                        {hasDetails && isExpanded && isUnlocked && (
                          <div
                            className={`px-3 pb-3 pl-10 space-y-2 border-t ${isPhatSinh
                                ? "bg-orange-50/50"
                                : isSpecial
                                  ? "bg-blue-50/50"
                                  : "bg-gray-50"
                              }`}
                          >
                            {job.chi_tiet.map((detail, detailIdx) => (
                              <label
                                key={detailIdx}
                                className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-1"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-green-600 w-3 h-3"
                                  checked={
                                    isJobSelected &&
                                    (selectedDetails[jobKey] || []).includes(
                                      detailIdx,
                                    )
                                  }
                                  onChange={() =>
                                    toggleDetail(sectionIdx, jobIdx, detailIdx)
                                  }
                                  disabled={!isJobSelected}
                                />
                                <span className="text-xs">
                                  → {detail.noi_dung_chi_tiet}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-blue-700 mb-3 border-b pb-2 border-blue-100">
          ✏️ Công việc khác
        </h3>

        <div className="space-y-3 mb-4">
          {customJobs.map((job, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 border rounded-lg bg-white shadow"
            >
              <span className="text-sm text-gray-700">• {job.noidung}</span>
              <button
                onClick={() => removeCustomJob(idx)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Nhập công việc khác..."
            value={newJob}
            onChange={(e) => setNewJob(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCustomJob()}
            className="border border-gray-300 rounded-md px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button
            onClick={addCustomJob}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 shadow transition"
          >
            Thêm
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={visibleSections.length === 0}
        className={`w-full py-3 mt-6 rounded-lg font-semibold text-base shadow-md transition ${visibleSections.length === 0
            ? "bg-gray-400 cursor-not-allowed text-white"
            : "bg-green-600 text-white hover:bg-green-700"
          }`}
      >
        ✅ Gửi Checklist
      </button>
    </div>
  );
};

export default NhapHandler;
