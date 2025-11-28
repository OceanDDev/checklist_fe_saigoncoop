/* eslint-disable react/prop-types */
import { useState } from "react";
import { toast } from "react-toastify";
import { checkListBDHService } from "@/services/checklistbdh.service";

const NhapHandler = ({ form, userInfo, formId, onSuccess, onError }) => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");

  // Định nghĩa quyền truy cập cho từng mã nhân viên
  const EMPLOYEE_PERMISSIONS = {
    "20952": {
      sections: [
        "QUẢN LÝ ĐIỀU HÀNH CÔNG VIỆC CHUNG TRONG TỔ",
        "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
        "QUẢN LÝ TỒN KHO",
        "TRANG THIẾT BỊ",
        "CẬP NHẬT VÀ PHÂN BỔ HÀNG HÓA",
        "KIỂM TRA, ĐIỀU PHỐI",
        "BÁO CÁO VÀ CÔNG VIỆC KHÁC"
      ],
      excludedJobs: {
        "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"]
      }
    },
    "40303": {
      sections: [
        "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
        "QUẢN LÝ TỒN KHO",
        "TRANG THIẾT BỊ",
        "KIỂM TRA, ĐIỀU PHỐI",
        "BÁO CÁO VÀ CÔNG VIỆC KHÁC"
      ],
      excludedJobs: {
        "ĐIỀU PHỐI NHẬP - XUẤT HÀNG": ["SẮP XẾP NHÂN SỰ NHẬP HÀNG SLL"],
        "TRANG THIẾT BỊ": ["KIỂM TRA VẬN HÀNH XE NÂNG"]
      },
      includedJobs: {
        "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"]
      }
    },
    "23204": {
      sections: [
        "ĐIỀU PHỐI NHẬP - XUẤT HÀNG",
        "QUẢN LÝ TỒN KHO",
        "TRANG THIẾT BỊ",
        "KIỂM TRA, ĐIỀU PHỐI",
        "BÁO CÁO VÀ CÔNG VIỆC KHÁC"
      ],
      excludedJobs: {
        "ĐIỀU PHỐI NHẬP - XUẤT HÀNG": ["SẮP XẾP NHÂN SỰ NHẬP HÀNG SLL"],
        "TRANG THIẾT BỊ": ["KIỂM TRA VẬN HÀNH XE NÂNG"],
        "KIỂM TRA, ĐIỀU PHỐI": ["KIỂM TRA TEM VÀ ĐỊNH VỊ HÀNG"]
      }
    }
  };

  // Chỉ áp dụng phân quyền cho form này (theo _id)
  const RESTRICTED_FORM_ID = "687f155b32fbc64dbf1c0bb0";

  // Kiểm tra form có áp dụng phân quyền không
  const isRestrictedForm = () => {
    return formId === RESTRICTED_FORM_ID;
  };

  // Kiểm tra mã NV có quyền truy cập không
  const hasPermission = () => {
    if (!isRestrictedForm()) return true;
    return Object.prototype.hasOwnProperty.call(EMPLOYEE_PERMISSIONS, userInfo.employeeId);
  };

  // Lấy danh sách section được phép truy cập
  const getAllowedSections = () => {
    // Nếu không phải form có phân quyền, cho phép xem tất cả
    if (!isRestrictedForm()) {
      return form.cac_muc?.map(section => section.ten_muc) || [];
    }
    
    // Nếu là form có phân quyền
    const permissions = EMPLOYEE_PERMISSIONS[userInfo.employeeId];
    // Nếu không có trong danh sách phân quyền, trả về mảng rỗng
    if (!permissions) {
      return [];
    }
    return permissions.sections;
  };

  // Kiểm tra có thể truy cập section này không
  const canAccessSection = (sectionName) => {
    const allowedSections = getAllowedSections();
    return allowedSections.includes(sectionName);
  };

  // Kiểm tra công việc có được phép hiển thị không
  const canAccessJob = (sectionName, jobContent) => {
    if (!isRestrictedForm()) {
      return true;
    }

    const permissions = EMPLOYEE_PERMISSIONS[userInfo.employeeId];
    if (!permissions) {
      return false;
    }

    // Kiểm tra includedJobs (chỉ hiển thị các job này)
    if (permissions.includedJobs && permissions.includedJobs[sectionName]) {
      return permissions.includedJobs[sectionName].includes(jobContent);
    }

    // Kiểm tra excludedJobs (ẩn các job này)
    if (permissions.excludedJobs && permissions.excludedJobs[sectionName]) {
      return !permissions.excludedJobs[sectionName].includes(jobContent);
    }

    return true;
  };

  // Lọc công việc theo quyền
  const getFilteredJobs = (section) => {
    return section.cong_viec.filter(job => 
      canAccessJob(section.ten_muc, job.noidung)
    );
  };

  const toggleJob = (job) => {
    const exists = selectedJobs.find((item) => item.noidung === job.noidung);
    if (exists) {
      setSelectedJobs(selectedJobs.filter((item) => item.noidung !== job.noidung));
    } else {
      setSelectedJobs([...selectedJobs, { noidung: job.noidung }]);
    }
  };

  const addCustomJob = () => {
    const jobText = newJob.trim();
    if (!jobText) return;
    
    const newJobObj = { noidung: jobText };
    setCustomJobs([...customJobs, newJobObj]);
    setNewJob("");
  };

  const handleSubmit = async () => {
    if (!userInfo?.employeeId || !formId) {
      toast.error("Thông tin nhân viên không hợp lệ.");
      return;
    }

    // Kiểm tra quyền truy cập
    if (!hasPermission()) {
      toast.error("❌ Mã nhân viên không có quyền truy cập form này.");
      return;
    }

    // Lọc sections theo quyền
    const filteredSections = form.cac_muc.filter(section => 
      canAccessSection(section.ten_muc)
    );

    if (filteredSections.length === 0) {
      toast.error("Không có công việc nào được phân quyền cho bạn.");
      return;
    }

    const transformedMucChecklist = filteredSections.map((section) => {
      const filteredJobs = getFilteredJobs(section);
      
      return {
        ten_muc: section.ten_muc,
        cong_viec: filteredJobs.map((job) => ({
          noidung: job.noidung,
          da_chon: selectedJobs.some((j) => j.noidung === job.noidung),
        })),
      };
    });

    const transformedCustomJobs = customJobs.map((job) => ({
      noidung: job.noidung,
      da_chon: true,
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

  // Lọc sections theo quyền
  const visibleSections = form.cac_muc?.filter(section => 
    canAccessSection(section.ten_muc)
  ) || [];

  // Nếu là form có phân quyền và không có quyền, hiển thị thông báo
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

      {/* Thông tin nhân viên */}
      <div className="mb-6 text-sm text-gray-800 space-y-1 bg-white p-4 rounded-lg border shadow">
        <p><strong className="text-gray-500">Mã nhân viên:</strong> {userInfo.employeeId}</p>
        <p><strong className="text-gray-500">Họ và tên:</strong> {userInfo.userName}</p>
        <p><strong className="text-gray-500">Bộ phận:</strong> {userInfo.department}</p>
      </div>

      {/* Danh sách công việc */}
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
            
            // Chỉ hiển thị section nếu có công việc
            if (filteredJobs.length === 0) return null;
            
            return (
              <div key={sectionIdx} className="mb-6">
                <p className="font-semibold text-gray-900 mb-3 bg-blue-50 p-2 rounded">
                  🔹 {section.ten_muc}
                </p>
                <div className="space-y-3">
                  {filteredJobs.map((job, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white shadow hover:bg-gray-50 transition-all"
                    >
                      <label className="flex items-center gap-3 w-full cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-600 w-4 h-4"
                          checked={selectedJobs.some((j) => j.noidung === job.noidung)}
                          onChange={() => toggleJob(job)}
                        />
                        <span className="text-sm text-gray-800">{job.noidung}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Công việc khác */}
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

      {/* Nút submit */}
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

export default NhapHandler;