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
  const [existingChecklist, setExistingChecklist] = useState(null);

  // Constants cho logic Tổ Trưởng
  const TO_TRUONG_ID = "24373";
  const QUAN_LY_ID = "34278";
  const TO_TRUONG_FORM_TITLE = "TỔ TRƯỞNG ";
  const EXCLUDED_SECTION = "XUẤT HÀNG SLL";

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
        console.log("Dữ liệu form:", result);
        setForm(result);

        // Nếu là form "TỔ TRƯỞNG", kiểm tra checklist đã tồn tại
        if (result?.tieu_de === TO_TRUONG_FORM_TITLE) {
          await checkExistingChecklist();
        }
      } catch (err) {
        console.error("Lỗi khi tải form:", err);
        toast.error("Không thể tải form checklist.");
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  const checkExistingChecklist = async () => {
    try {
      // Tìm checklist đã tồn tại cho form này
      const existing = await checkListBDHService.getChecklistByFormId(formId);
      if (existing) {
        setExistingChecklist(existing);
        
        // Load dữ liệu đã check trước đó
        const preSelectedJobs = [];
        existing.cac_muc?.forEach(section => {
          section.cong_viec?.forEach(job => {
            if (job.da_chon) {
              preSelectedJobs.push({ noidung: job.noidung });
            }
          });
        });
        setSelectedJobs(preSelectedJobs);
        
        // Load công việc khác đã thêm
        if (existing.cong_viec_khac) {
          setCustomJobs(existing.cong_viec_khac.filter(job => job.da_chon));
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra checklist tồn tại:", err);
    }
  };



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
    } else {
      setSelectedJobs([...selectedJobs, { noidung: job.noidung }]);
    }
  };

  const addCustomJob = () => {
    const jobText = newJob.trim();
    if (!jobText) return;
    setCustomJobs([...customJobs, { noidung: jobText }]);
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

    const transformedMucChecklist = filteredSections.map((section) => ({
      ten_muc: section.ten_muc,
      cong_viec: section.cong_viec.map((job) => ({
        noidung: job.noidung,
        da_chon: selectedJobs.some((j) => j.noidung === job.noidung),
      })),
    }));

    // Nếu có checklist tồn tại, merge data
    let finalMucChecklist = transformedMucChecklist;
    if (existingChecklist && form?.tieu_de === TO_TRUONG_FORM_TITLE) {
      // Merge với data cũ, ưu tiên data mới
      const existingSections = existingChecklist.cac_muc || [];
      const mergedSections = [...existingSections];

      transformedMucChecklist.forEach(newSection => {
        const existingIndex = mergedSections.findIndex(
          existing => existing.ten_muc === newSection.ten_muc
        );
        
        if (existingIndex !== -1) {
          // Update section đã tồn tại
          mergedSections[existingIndex] = newSection;
        } else {
          // Thêm section mới
          mergedSections.push(newSection);
        }
      });

      finalMucChecklist = mergedSections;
    }

    // Xác định ai là người check cuối (ưu tiên Tổ trưởng)
    const finalUserInfo = userInfo.employeeId === TO_TRUONG_ID 
      ? userInfo 
      : (existingChecklist ? existingChecklist : userInfo);

    const payload = {
      ma_nhan_vien: finalUserInfo.employeeId,
      ho_ten: finalUserInfo.userName,
      don_vi: finalUserInfo.department,
      ghi_chu: existingChecklist?.ghi_chu || "",
      cac_muc: finalMucChecklist,
      cong_viec_khac: customJobs.map((job) => ({
        noidung: job.noidung,
        da_chon: true,
      })),
      // Metadata để track ai đã check
      nguoi_check_cuoi: userInfo.employeeId,
      thoi_gian_check: new Date().toISOString(),
    };

    try {
      if (existingChecklist && form?.tieu_de === TO_TRUONG_FORM_TITLE) {
        // Update checklist tồn tại
        await checkListBDHService.updateCheckListBDH(existingChecklist._id, payload);
        toast.success("✅ Cập nhật checklist thành công!");
      } else {
        // Tạo mới
        await checkListBDHService.createCheckListBDH(formId, payload);
        toast.success("✅ Gửi checklist thành công!");
      }
      
      setSelectedJobs([]);
      setCustomJobs([]);
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
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white shadow hover:bg-gray-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      className="accent-blue-600 w-4 h-4"
                      checked={selectedJobs.some((j) => j.noidung === job.noidung)}
                      onChange={() => toggleJob(job)}
                    />
                    <span className="text-sm text-gray-800">{job.noidung}</span>
                  </label>
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

        <ul className="list-disc list-inside text-sm text-gray-700 mb-4 pl-3">
          {customJobs.map((job, idx) => (
            <li key={idx}>{job.noidung}</li>
          ))}
        </ul>

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
        ✅ {existingChecklist && form?.tieu_de === TO_TRUONG_FORM_TITLE ? "Cập nhật" : "Gửi"} Checklist
      </button>
    </div>
  );
};

export default ChecklistBDHMobile;