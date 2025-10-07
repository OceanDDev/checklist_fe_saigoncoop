/* eslint-disable react/prop-types */
import { useState } from "react";
import { toast } from "react-toastify";
import { checkListBDHService } from "@/services/checklistbdh.service";

const VeSinhFormHandler = ({ form, userInfo, formId, onSuccess, onError }) => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [customJobs, setCustomJobs] = useState([]);
  const [newJob, setNewJob] = useState("");
  const [jobCounts, setJobCounts] = useState({});
  const [customJobCounts, setCustomJobCounts] = useState({});

  const toggleJob = (job) => {
    const exists = selectedJobs.find((item) => item.noidung === job.noidung);
    if (exists) {
      setSelectedJobs(selectedJobs.filter((item) => item.noidung !== job.noidung));
      // Xóa số lần khi bỏ check
      setJobCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[job.noidung];
        return newCounts;
      });
    } else {
      setSelectedJobs([...selectedJobs, { noidung: job.noidung }]);
      // Set mặc định = 1 khi check
      setJobCounts(prev => ({
        ...prev,
        [job.noidung]: 1
      }));
    }
  };

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
    
    // Khởi tạo số lần = 1 cho công việc khác
    setCustomJobCounts(prev => ({
      ...prev,
      [jobText]: 1
    }));
    
    setNewJob("");
  };

  const handleSubmit = async () => {
    if (!userInfo?.employeeId || !formId) {
      toast.error("Thông tin nhân viên không hợp lệ.");
      return;
    }

    const transformedMucChecklist = form.cac_muc.map((section) => ({
      ten_muc: section.ten_muc,
      cong_viec: section.cong_viec.map((job) => {
        const isSelected = selectedJobs.some((j) => j.noidung === job.noidung);
        return {
          noidung: job.noidung,
          da_chon: isSelected,
          so_lan: isSelected ? (jobCounts[job.noidung] || 1) : 0,
        };
      }),
    }));

    const transformedCustomJobs = customJobs.map((job) => ({
      noidung: job.noidung,
      da_chon: true,
      so_lan: customJobCounts[job.noidung] || 1,
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
              {section.cong_viec.map((job, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg bg-white shadow hover:bg-gray-50 transition-all"
                >
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-blue-600 w-4 h-4"
                      checked={selectedJobs.some((j) => j.noidung === job.noidung)}
                      onChange={() => toggleJob(job)}
                    />
                    <span className="text-sm text-gray-800">{job.noidung}</span>
                  </label>
                  
                  {/* Nút +/- chỉ hiện khi checkbox được chọn */}
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
                </div>
              ))}
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

export default VeSinhFormHandler;