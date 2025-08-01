/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";
import { checkListBDHService } from "@/services/checklistbdh.service";
import UserInfoFormBDH from "./infoUserBDH";

const ChecklistBDHMobile = () => {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // State cho số lần thực hiện của form Vệ sinh
  const [jobCounts, setJobCounts] = useState({});
  const [customJobCounts, setCustomJobCounts] = useState({});

  // Constants cho logic Tổ Trưởng
  const TO_TRUONG_ID = "24373";
  const QUAN_LY_ID = "34278";
  const TO_TRUONG_FORM_TITLE = "TỔ TRƯỞNG ";
  const VE_SINH_FORM_TITLE = "VỆ SINH 14H HẰNG NGÀY ";
  const EXCLUDED_SECTION = "XUẤT HÀNG SLL";

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
        console.log("Dữ liệu form:", result);
        setForm(result);
      } catch (err) {
        console.error("Lỗi khi tải form:", err);
        toast.error("Không thể tải form checklist.");
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // Kiểm tra quyền truy cập section theo mã nhân viên
  const canAccessSection = (sectionName) => {
    const isToTruongForm = form?.tieu_de === TO_TRUONG_FORM_TITLE;
    if (!isToTruongForm) return true; // Form khác thì hiện tất cả

    const { employeeId } = userInfo;
    
    if (employeeId === TO_TRUONG_ID) {
      // Tổ trưởng: Thấy tất cả trừ "XUẤT HÀNG SLL"
      return sectionName !== EXCLUDED_SECTION;
    } else if (employeeId === QUAN_LY_ID) {
      // Quản lý: Chỉ thấy "XUẤT HÀNG SLL"
      return sectionName === EXCLUDED_SECTION;
    }
    
    // Nhân viên khác không có quyền với form này
    return false;
  };

  // Kiểm tra có phải nhân viên được phép không
  const isAuthorizedEmployee = () => {
    const isToTruongForm = form?.tieu_de === TO_TRUONG_FORM_TITLE;
    if (!isToTruongForm) return true; // Form khác thì ai cũng được

    const { employeeId } = userInfo;
    return employeeId === TO_TRUONG_ID || employeeId === QUAN_LY_ID;
  };

  const toggleJob = (job) => {
    const exists = selectedJobs.find((item) => item.noidung === job.noidung); 
    if (exists) {
      setSelectedJobs(selectedJobs.filter((item) => item.noidung !== job.noidung));
      
      // Nếu là form vệ sinh và bỏ check, xóa số lần
      if (form?.tieu_de === VE_SINH_FORM_TITLE) {
        setJobCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[job.noidung];
          return newCounts;
        });
      }
    } else {
      setSelectedJobs([...selectedJobs, { noidung: job.noidung }]);
      
      // Nếu là form vệ sinh và check, set mặc định = 1
      if (form?.tieu_de === VE_SINH_FORM_TITLE) {
        setJobCounts(prev => ({
          ...prev,
          [job.noidung]: 1
        }));
      }
    }
  };

  // Hàm tăng giảm số lần cho công việc thường
  const incrementJobCount = (jobContent) => {
    setJobCounts(prev => ({
      ...prev,
      [jobContent]: (prev[jobContent] || 0) + 1
    }));
  };

  const decrementJobCount = (jobContent) => {
    setJobCounts(prev => ({
      ...prev,
      [jobContent]: Math.max((prev[jobContent] || 0) - 1, 0)
    }));
  };

  // Hàm tăng giảm số lần cho công việc khác
  const incrementCustomJobCount = (jobContent) => {
    setCustomJobCounts(prev => ({
      ...prev,
      [jobContent]: (prev[jobContent] || 0) + 1
    }));
  };

  const decrementCustomJobCount = (jobContent) => {
    setCustomJobCounts(prev => ({
      ...prev,
      [jobContent]: Math.max((prev[jobContent] || 0) - 1, 0)
    }));
  };

  const addCustomJob = () => {
    const jobText = newJob.trim();
    if (!jobText) return;
    
    const newJobObj = { noidung: jobText };
    setCustomJobs([...customJobs, newJobObj]);
    
    // Nếu là form vệ sinh, khởi tạo số lần = 1 (vì đã được thêm = đã chọn)
    if (form?.tieu_de === VE_SINH_FORM_TITLE) {
      setCustomJobCounts(prev => ({
        ...prev,
        [jobText]: 1
      }));
    }
    
    setNewJob("");
  };

  const handleSubmit = async () => {
    if (!userInfo?.employeeId || !formId) {
      toast.error("Thông tin nhân viên không hợp lệ.");
      return;
    }

    // Kiểm tra quyền cho form Tổ Trưởng
    if (!isAuthorizedEmployee()) {
      toast.error("Bạn không có quyền thực hiện checklist này.");
      return;
    }

    // Lọc sections theo quyền
    const filteredSections = form.cac_muc.filter(section => 
      canAccessSection(section.ten_muc)
    );

    const isVeSinhForm = form?.tieu_de === VE_SINH_FORM_TITLE;

    const transformedMucChecklist = filteredSections.map((section) => ({
      ten_muc: section.ten_muc,
      cong_viec: section.cong_viec.map((job) => {
        if (isVeSinhForm) {
          // Form vệ sinh: lưu da_chon và so_lan
          const isSelected = selectedJobs.some((j) => j.noidung === job.noidung);
          return {
            noidung: job.noidung,
            da_chon: isSelected,
            so_lan: isSelected ? (jobCounts[job.noidung] || 1) : 0,
          };
        } else {
          // Form khác: chỉ lưu da_chon
          return {
            noidung: job.noidung,
            da_chon: selectedJobs.some((j) => j.noidung === job.noidung),
          };
        }
      }),
    }));

    // Xử lý công việc khác
    const transformedCustomJobs = customJobs.map((job) => {
      if (isVeSinhForm) {
        // Form vệ sinh: lưu da_chon và so_lan
        return {
          noidung: job.noidung,
          da_chon: true, // Công việc khác được thêm = đã chọn
          so_lan: customJobCounts[job.noidung] || 1,
        };
      } else {
        // Form khác: chỉ lưu da_chon
        return {
          noidung: job.noidung,
          da_chon: true,
        };
      }
    });

    const payload = {
      ma_nhan_vien: userInfo.employeeId,
      ho_ten: userInfo.userName,
      don_vi: userInfo.department,
      ghi_chu: "",
      cac_muc: transformedMucChecklist,
      cong_viec_khac: transformedCustomJobs,
      // Metadata để track thời gian tạo
      thoi_gian_tao: new Date().toISOString(),
    };

    try {
      // Luôn tạo mới checklist
      await checkListBDHService.createCheckListBDH(formId, payload);
      toast.success("✅ Gửi checklist thành công!");
      
      // Reset form sau khi gửi thành công
      setSelectedJobs([]);
      setCustomJobs([]);
      setJobCounts({});
      setCustomJobCounts({});
      navigate("/thank-you");
    } catch (err) {
      console.error("Lỗi khi gửi checklist:", err);
      toast.error("❌ Gửi checklist thất bại.");
    }
  };

  if (!isConfirmed) {
    return (
      <UserInfoFormBDH
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={(info) => {
          setUserInfo(info);
          setIsConfirmed(true);
        }}
        formId={formId}
      />
    );
  }

  if (!form) {
    return <p className="p-4 text-gray-600 text-center">Đang tải form...</p>;
  }

  // Kiểm tra quyền truy cập
  if (form?.tieu_de === TO_TRUONG_FORM_TITLE && !isAuthorizedEmployee()) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 font-medium">
          ❌ Bạn không có quyền truy cập form này
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Form này chỉ dành cho Tổ trưởng (24373) và Quản lý (34278)
        </p>
      </div>
    );
  }

  // Lọc sections theo quyền
  const visibleSections = form.cac_muc?.filter(section => 
    canAccessSection(section.ten_muc)
  ) || [];

  const isVeSinhForm = form?.tieu_de === VE_SINH_FORM_TITLE;

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
        
        {/* Hiển thị vai trò cho form Tổ Trưởng */}
        {form?.tieu_de === TO_TRUONG_FORM_TITLE && (
          <p><strong className="text-blue-600">Vai trò:</strong> 
            {userInfo.employeeId === TO_TRUONG_ID ? " 👨‍💼 Tổ trưởng" : " 👨‍💻 Quản lý"}
          </p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-blue-700 mb-4 border-b pb-2 border-blue-100">
          📋 Danh sách công việc
          {form?.tieu_de === TO_TRUONG_FORM_TITLE && (
            <span className="text-xs text-gray-500 ml-2">
              ({userInfo.employeeId === TO_TRUONG_ID ? "Tất cả trừ Xuất hàng SLL" : "Chỉ Xuất hàng SLL"})
            </span>
          )}
        </h3>

        {visibleSections.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Không có công việc nào để hiển thị cho quyền của bạn.
          </p>
        ) : (
          visibleSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-6">
              <p className="font-semibold text-gray-900 mb-3">
                🔹 {section.ten_muc}
              </p>
              <div className="space-y-3">
                {section.cong_viec.map((job, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white shadow hover:bg-gray-50 transition-all"
                  >
                    {isVeSinhForm ? (
                      // UI cho form vệ sinh: Checkbox + nút +/- khi được chọn
                      <>
                        <label className="flex items-center gap-3 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-blue-600 w-4 h-4"
                            checked={selectedJobs.some((j) => j.noidung === job.noidung)}
                            onChange={() => toggleJob(job)}
                          />
                          <span className="text-sm text-gray-800">{job.noidung}</span>
                        </label>
                        
                        {/* Hiện nút +/- chỉ khi checkbox được chọn */}
                        {selectedJobs.some((j) => j.noidung === job.noidung) && (
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={() => decrementJobCount(job.noidung)}
                              className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition text-lg font-bold"
                            >
                              -
                            </button>
                            <span className="min-w-[2rem] text-center font-semibold text-gray-700">
                              {jobCounts[job.noidung] || 1}
                            </span>
                            <button
                              onClick={() => incrementJobCount(job.noidung)}
                              className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition text-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      // UI checkbox cho các form khác
                      <label className="flex items-center gap-3 w-full cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-blue-600 w-4 h-4"
                          checked={selectedJobs.some((j) => j.noidung === job.noidung)}
                          onChange={() => toggleJob(job)}
                        />
                        <span className="text-sm text-gray-800">{job.noidung}</span>
                      </label>
                    )}
                  </div>
                ))}
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
              {isVeSinhForm ? (
                // UI cho công việc khác của form vệ sinh - có nút +/-
                <>
                  <span className="text-sm text-gray-700 flex-1">• {job.noidung}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementCustomJobCount(job.noidung)}
                      className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition text-lg font-bold"
                    >
                      -
                    </button>
                    <span className="min-w-[2rem] text-center font-semibold text-gray-700">
                      {customJobCounts[job.noidung] || 1}
                    </span>
                    <button
                      onClick={() => incrementCustomJobCount(job.noidung)}
                      className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </>
              ) : (
                // UI cho các form khác - hiển thị dạng list
                <span className="text-sm text-gray-700">• {job.noidung}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Nhập công việc khác..."
            value={newJob}
            onChange={(e) => setNewJob(e.target.value)}
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

export default ChecklistBDHMobile;