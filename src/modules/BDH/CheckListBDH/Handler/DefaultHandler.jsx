/* eslint-disable react/prop-types */
import { useState } from "react";
import { toast } from "react-toastify";
import { checkListBDHService } from "@/services/checklistbdh.service";

const DefaultHandler = ({ form, userInfo, formId, onSuccess, onError }) => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState({});
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");
  const [expandedJobs, setExpandedJobs] = useState({});

  // ✅ Hàm kiểm tra công việc có hiển thị hôm nay không
  const shouldShowToday = (quy_dinh) => {
    if (!quy_dinh) return true;

    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    
    const dayOfWeek = vietnamTime.getDay();
    const dayOfMonth = vietnamTime.getDate();

    // ✅ Phát sinh → luôn hiển thị
    if (quy_dinh.loai === "phát sinh" || quy_dinh.loai === "phat_sinh") {
      return true;
    }

    if (quy_dinh.loai === "ngày") {
      return true;
    }

    if (quy_dinh.loai === "tuần") {
      if (!quy_dinh.ngay_trong_tuan || quy_dinh.ngay_trong_tuan.length === 0) {
        return false;
      }
      return quy_dinh.ngay_trong_tuan.includes(dayOfWeek);
    }

    if (quy_dinh.loai === "tháng") {
      if (!quy_dinh.ngay_trong_thang || quy_dinh.ngay_trong_thang.length === 0) {
        return false;
      }
      return quy_dinh.ngay_trong_thang.includes(dayOfMonth);
    }

    return true;
  };

  // ✅ Kiểm tra loại quy định để hiển thị badge
  const getScheduleBadge = (quy_dinh) => {
    if (!quy_dinh) return null;

    const badges = {
      "phát sinh": {
        text: "Phát sinh",
        bgColor: "bg-orange-500",
        icon: "⚡"
      },
      "phat_sinh": {
        text: "Phát sinh",
        bgColor: "bg-orange-500",
        icon: "⚡"
      },
      "tuần": {
        text: "Hàng tuần",
        bgColor: "bg-blue-500",
        icon: "📅"
      },
      "tháng": {
        text: "Hàng tháng",
        bgColor: "bg-purple-500",
        icon: "📆"
      }
    };

    return badges[quy_dinh.loai] || null;
  };

  // ✅ Kiểm tra xem công việc có quy định đặc biệt không
  const hasSpecialSchedule = (quy_dinh) => {
    if (!quy_dinh) return false;
    return ["phát sinh", "phat_sinh", "tuần", "tháng"].includes(quy_dinh.loai);
  };

  const toggleExpand = (sectionIdx, jobIdx) => {
    const key = `${sectionIdx}-${jobIdx}`;
    setExpandedJobs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleJob = (sectionIdx, jobIdx, job) => {
    const key = `${sectionIdx}-${jobIdx}`;
    const exists = selectedJobs.find((item) => item.key === key);
    
    if (exists) {
      setSelectedJobs(selectedJobs.filter((item) => item.key !== key));
      const newSelectedDetails = { ...selectedDetails };
      delete newSelectedDetails[key];
      setSelectedDetails(newSelectedDetails);
    } else {
      setSelectedJobs([...selectedJobs, { key, sectionIdx, jobIdx, noidung: job.noidung }]);
      if (job.chi_tiet && job.chi_tiet.length > 0) {
        const allDetailIndexes = job.chi_tiet.map((_, idx) => idx);
        setSelectedDetails(prev => ({
          ...prev,
          [key]: allDetailIndexes
        }));
      }
    }
  };

  const toggleDetail = (sectionIdx, jobIdx, detailIdx) => {
    const jobKey = `${sectionIdx}-${jobIdx}`;
    
    setSelectedDetails(prev => {
      const current = prev[jobKey] || [];
      if (current.includes(detailIdx)) {
        return {
          ...prev,
          [jobKey]: current.filter(idx => idx !== detailIdx)
        };
      } else {
        return {
          ...prev,
          [jobKey]: [...current, detailIdx]
        };
      }
    });
  };

  const addCustomJob = () => {
    const jobText = newJob.trim();
    if (!jobText) return;
    
    const newJobObj = { noidung: jobText, chi_tiet: [] };
    setCustomJobs([...customJobs, newJobObj]);
    setNewJob("");
  };

  const handleSubmit = async () => {
    if (!userInfo?.employeeId || !formId) {
      toast.error("Thông tin nhân viên không hợp lệ.");
      return;
    }

    const transformedMucChecklist = form.cac_muc.map((section, sectionIdx) => ({
      ten_muc: section.ten_muc,
      cong_viec: section.cong_viec
        .filter(job => shouldShowToday(job.quy_dinh))
        .map((job, jobIdx) => {
          const jobKey = `${sectionIdx}-${jobIdx}`;
          const isJobSelected = selectedJobs.some((j) => j.key === jobKey);
          const selectedDetailIndexes = selectedDetails[jobKey] || [];

          return {
            noidung: job.noidung,
            da_chon: isJobSelected,
            quy_dinh: job.quy_dinh,
            chi_tiet: (job.chi_tiet || []).map((detail, detailIdx) => ({
              noi_dung_chi_tiet: detail.noi_dung_chi_tiet,
              da_chon: isJobSelected && selectedDetailIndexes.includes(detailIdx),
            })),
          };
        }),
    }));

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
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-screen max-w-3xl mx-auto shadow-sm">
      <h2 className="text-center text-xl font-bold text-blue-700 mb-6 uppercase tracking-wide">
        {form.tieu_de}
      </h2>

      {form.mo_ta && (
        <p className="text-gray-600 mb-6 text-sm text-center italic">{form.mo_ta}</p>
      )}

      <div className="mb-6 text-sm text-gray-800 space-y-1 bg-white p-4 rounded-lg border shadow">
        <p><strong className="text-gray-500">Mã nhân viên:</strong> {userInfo.employeeId}</p>
        <p><strong className="text-gray-500">Họ và tên:</strong> {userInfo.userName}</p>
        <p><strong className="text-gray-500">Bộ phận:</strong> {userInfo.department}</p>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-blue-700 mb-4 border-b pb-2 border-blue-100">
          📋 Danh sách công việc
        </h3>

        {form.cac_muc.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-6">
            <p className="font-semibold text-gray-900 mb-3">
              🔹 {section.ten_muc}
            </p>
            <div className="space-y-3">
              {section.cong_viec.map((job, jobIdx) => {
                const isScheduledToday = shouldShowToday(job.quy_dinh);
                
                if (!isScheduledToday) {
                  return null;
                }

                const jobKey = `${sectionIdx}-${jobIdx}`;
                const isJobSelected = selectedJobs.some((j) => j.key === jobKey);
                const isExpanded = expandedJobs[jobKey];
                const hasDetails = job.chi_tiet && job.chi_tiet.length > 0;
                
                // ✅ Lấy thông tin badge
                const badge = getScheduleBadge(job.quy_dinh);
                const isSpecial = hasSpecialSchedule(job.quy_dinh);
                const isPhatSinh = job.quy_dinh?.loai === "phát sinh" || job.quy_dinh?.loai === "phat_sinh";
                
                return (
                  <div 
                    key={jobIdx} 
                    className={`border rounded-lg shadow transition-all duration-300 ${
                      isPhatSinh
                        ? "border-orange-400 bg-gradient-to-r from-orange-50 to-red-50 ring-2 ring-orange-300"
                        : isSpecial
                        ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-blue-300"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-all">
                      <label className="flex items-center gap-3 w-full cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-600 w-4 h-4"
                          checked={isJobSelected}
                          onChange={() => toggleJob(sectionIdx, jobIdx, job)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span 
                          className={`text-sm font-medium flex-1 ${
                            isPhatSinh 
                              ? "text-orange-900 font-bold" 
                              : isSpecial 
                              ? "text-blue-900 font-semibold" 
                              : "text-gray-800"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (hasDetails) toggleExpand(sectionIdx, jobIdx);
                          }}
                        >
                          {job.noidung}
                        </span>
                        
                        {/* ✅ Badge hiển thị loại công việc */}
                        {badge && (
                          <span className={`px-2.5 py-1 ${badge.bgColor} text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1 ${
                            isPhatSinh ? "animate-pulse" : ""
                          }`}>
                            <span>{badge.icon}</span>
                            <span>{badge.text}</span>
                          </span>
                        )}
                      </label>
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpand(sectionIdx, jobIdx)}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      )}
                    </div>

                    {/* Chi tiết */}
                    {hasDetails && isExpanded && (
                      <div className={`px-3 pb-3 pl-10 space-y-2 border-t ${
                        isPhatSinh 
                          ? "bg-orange-50/50" 
                          : isSpecial 
                          ? "bg-blue-50/50" 
                          : "bg-gray-50"
                      }`}>
                        {job.chi_tiet.map((detail, detailIdx) => (
                          <label
                            key={detailIdx}
                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-1"
                          >
                            <input
                              type="checkbox"
                              className="accent-green-600 w-3 h-3"
                              checked={isJobSelected && (selectedDetails[jobKey] || []).includes(detailIdx)}
                              onChange={() => toggleDetail(sectionIdx, jobIdx, detailIdx)}
                              disabled={!isJobSelected}
                            />
                            <span className="text-xs">→ {detail.noi_dung_chi_tiet}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Nhập công việc khác..."
            value={newJob}
            onChange={(e) => setNewJob(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomJob()}
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
        className="bg-green-600 text-white w-full py-3 mt-6 rounded-lg font-semibold text-base hover:bg-green-700 shadow-md transition"
      >
        ✅ Gửi Checklist
      </button>
    </div>
  );
};

export default DefaultHandler;