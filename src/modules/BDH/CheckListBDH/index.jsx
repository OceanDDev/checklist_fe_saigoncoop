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

useEffect(() => {
  const fetchForm = async () => {
    try {
      const result = await checkListFormServiceBDH.getByIdCheckListBDHForm(formId);
      console.log("Dữ liệu form:", result); // <-- KIỂM TRA Ở ĐÂY
      setForm(result);
    } catch (err) {
      console.error("Lỗi khi tải form:", err);
      toast.error("Không thể tải form checklist.");
    }
  };
  if (formId) fetchForm();
}, [formId]);


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

  const transformedMucChecklist = form.cac_muc.map((section) => ({
    ten_muc: section.ten_muc,
    cong_viec: section.cong_viec.map((job) => ({
      noidung: job.noidung,
      da_chon: selectedJobs.some((j) => j.noidung === job.noidung),
    })),
  }));

  const payload = {
    ma_nhan_vien: userInfo.employeeId,
    ho_ten: userInfo.userName,
    don_vi: userInfo.department,
    ghi_chu: "",
    cac_muc: transformedMucChecklist,
    cong_viec_khac: customJobs.map((job) => ({
      noidung: job.noidung,
      da_chon: true,
    })),
  };

  try {
    await checkListBDHService.createCheckListBDH(formId, payload);
    toast.success("✅ Gửi checklist thành công!");
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

    {form.cac_muc?.map((section, sectionIdx) => (
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
    ))}
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
    ✅ Gửi Checklist
  </button>
</div>

  );
};

export default ChecklistBDHMobile;
