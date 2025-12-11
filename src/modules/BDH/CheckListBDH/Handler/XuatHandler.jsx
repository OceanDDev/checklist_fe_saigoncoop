/* eslint-disable react/prop-types */
import { useState } from "react";
import { toast } from "react-toastify";
import { checkListBDHService } from "@/services/checklistbdh.service";

const XuatHandler = ({ form, userInfo, formId, onSuccess, onError }) => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");

  // Định nghĩa quyền truy cập cho từng mã nhân viên
  const EMPLOYEE_PERMISSIONS = {
    "24373": ["QUẢN LÝ NHÂN SỰ", "XUẤT HÀNG", "KIỂM TRA VÀ QUẢN LÝ SỰ CỐ", "BÁO CÁO"],
    "30541": ["XLĐH", "SOẠN HÀNG", "KIỂM TRA VÀ QUẢN LÝ SỰ CỐ", "BÁO CÁO"],
    "34278": ["XUẤT HÀNG SLL"]
  };

  const RESTRICTED_FORM_ID = "687f110132fbc64dbf1c0ac3";

  const isRestrictedForm = () => {
    return formId === RESTRICTED_FORM_ID;
  };

  const hasPermission = () => {
    if (!isRestrictedForm()) return true;
    return Object.prototype.hasOwnProperty.call(EMPLOYEE_PERMISSIONS, userInfo.employeeId);
  };

  const getAllowedSections = () => {
    if (!isRestrictedForm()) {
      return form.cac_muc?.map(section => section.ten_muc) || [];
    }
    
    const permissions = EMPLOYEE_PERMISSIONS[userInfo.employeeId];
    if (!permissions) {
      return [];
    }
    return permissions;
  };

  const canAccessSection = (sectionName) => {
    const allowedSections = getAllowedSections();
    return allowedSections.includes(sectionName);
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
      // Bỏ chọn công việc
      setSelectedJobs(selectedJobs.filter((item) => item.key !== key));
    } else {
      // Chọn công việc
      setSelectedJobs([...selectedJobs, { key, sectionIdx, jobIdx, noidung: job.noidung }]);
      // Auto chọn tất cả chi tiết khi chọn công việc cha
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

    if (!hasPermission()) {
      toast.error("❌ Mã nhân viên không có quyền truy cập form này.");
      return;
    }

    const filteredSections = form.cac_muc.filter(section => 
      canAccessSection(section.ten_muc)
    );

    if (filteredSections.length === 0) {
      toast.error("Không có công việc nào được phân quyền cho bạn.");
      return;
    }

    const transformedMucChecklist = filteredSections.map((section, sectionIdx) => ({
      ten_muc: section.ten_muc,
      cong_viec: section.cong_viec.map((job, jobIdx) => {
        const jobKey = `${sectionIdx}-${jobIdx}`;
        const isJobSelected = selectedJobs.some((j) => j.key === jobKey);
        const selectedDetailIndexes = selectedDetails[jobKey] || [];

        return {
          noidung: job.noidung,
          da_chon: isJobSelected,
          chi_tiet: (job.chi_tiet || []).map((detail, detailIdx) => ({
            noi_dung_chi_tiet: detail.noi_dung_chi_tiet,
            da_chon: selectedDetailIndexes.includes(detailIdx),
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

  const visibleSections = form.cac_muc?.filter(section => 
    canAccessSection(section.ten_muc)
  ) || [];

  if (isRestrictedForm() && !hasPermission()) {
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
            Mã nhân viên <strong>{userInfo.employeeId}</strong> không có quyền truy cập form này.
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

        {visibleSections.length === 0 ? (
          <p className="text-gray-500 text-center py-4 bg-yellow-50 rounded-lg">
            ⚠️ Không có công việc nào được phân quyền cho bạn.
          </p>
        ) : (
          visibleSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-6">
              <p className="font-semibold text-gray-900 mb-3 bg-blue-50 p-2 rounded">
                🔹 {section.ten_muc}
              </p>
              <div className="space-y-3">
                {section.cong_viec.map((job, jobIdx) => {
                  const jobKey = `${sectionIdx}-${jobIdx}`;
                  const isJobSelected = selectedJobs.some((j) => j.key === jobKey);
                  const isExpanded = expandedJobs[jobKey];
                  const hasDetails = job.chi_tiet && job.chi_tiet.length > 0;
                  
                  return (
                    <div key={jobIdx} className="border rounded-lg bg-white shadow">
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-all">
                        <label className="flex items-center gap-3 w-full cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-blue-600 w-4 h-4"
                            checked={isJobSelected}
                            onChange={() => toggleJob(sectionIdx, jobIdx, job)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span 
                            className="text-sm font-medium text-gray-800 flex-1"
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasDetails) toggleExpand(sectionIdx, jobIdx);
                            }}
                          >
                            {job.noidung}
                          </span>
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
                        <div className="px-3 pb-3 pl-10 space-y-2 border-t bg-gray-50">
                          {job.chi_tiet.map((detail, detailIdx) => (
                            <label
                              key={detailIdx}
                              className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-1"
                            >
                              <input
                                type="checkbox"
                                className="accent-green-600 w-3 h-3"
                                checked={(selectedDetails[jobKey] || []).includes(detailIdx)}
                                onChange={() => toggleDetail(sectionIdx, jobIdx, detailIdx)}
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
          ))
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
                onClick={() => setCustomJobs(customJobs.filter((_, i) => i !== idx))}
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
        className={`w-full py-3 mt-6 rounded-lg font-semibold text-base shadow-md transition ${
          visibleSections.length === 0
            ? "bg-gray-400 cursor-not-allowed text-white"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        ✅ Gửi Checklist
      </button>
    </div>
  );
};

export default XuatHandler;