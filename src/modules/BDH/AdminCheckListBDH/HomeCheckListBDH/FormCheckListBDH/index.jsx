import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { checkListFormServiceBDH } from "@/services/checklistbdhform.service";

const AdminChecklistFormBDH = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tieu_de: "",
    mo_ta: "",
    cac_muc: [
      {
        ten_muc: "",
        cong_viec: [{ 
          noidung: "", 
          chi_tiet: [{ noi_dung_chi_tiet: "" }],
          quy_dinh: { loai: "ngày", ngay_trong_tuan: null, ngay_trong_thang: null, tan_suat: 1, phat_sinh: false }
        }],
      },
    ],
  });

  const [showQuyDinhModal, setShowQuyDinhModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState({ sectionIdx: null, jobIdx: null });
  const [tempQuyDinh, setTempQuyDinh] = useState({
    loai: "ngày",
    ngay_trong_tuan: null,
    ngay_trong_thang: null,
    tan_suat: 1,
    phat_sinh: false
  });

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const res = await checkListFormServiceBDH.getByIdCheckListBDHForm(id);
          setForm(res);
        } catch (error) {
          toast.error("❌ Không tải được form để sửa");
          console.error(error);
        }
      })();
    }
  }, [id]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSectionChange = (index, value) => {
    const updated = [...form.cac_muc];
    updated[index].ten_muc = value;
    setForm({ ...form, cac_muc: updated });
  };

  const handleJobChange = (sectionIdx, jobIdx, value) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec[jobIdx].noidung = value;
    setForm({ ...form, cac_muc: updated });
  };

  const handleChiTietChange = (sectionIdx, jobIdx, chiTietIdx, value) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec[jobIdx].chi_tiet[chiTietIdx].noi_dung_chi_tiet = value;
    setForm({ ...form, cac_muc: updated });
  };

  const openQuyDinhModal = (sectionIdx, jobIdx) => {
    const currentQuyDinh = form.cac_muc[sectionIdx].cong_viec[jobIdx].quy_dinh || {
      loai: "ngày",
      ngay_trong_tuan: null,
      ngay_trong_thang: null,
      tan_suat: 1,
      phat_sinh: false
    };
    setSelectedJob({ sectionIdx, jobIdx });
    setTempQuyDinh(currentQuyDinh);
    setShowQuyDinhModal(true);
  };

  // ✅ Hàm thay đổi loại quy định (với logic reset và hỗ trợ phát sinh)
  const changeLoaiQuyDinh = (newLoai) => {
    setTempQuyDinh({
      loai: newLoai,
      ngay_trong_tuan: newLoai === "tuần" ? [] : null,
      ngay_trong_thang: newLoai === "tháng" ? [] : null,
      tan_suat: tempQuyDinh.tan_suat || 1,
      phat_sinh: newLoai === "phát sinh" ? true : false
    });
  };

  const saveQuyDinh = () => {
    // ✅ Bỏ qua validate nếu là phát sinh
    if (tempQuyDinh.loai !== "phát sinh") {
      if (tempQuyDinh.loai === "tuần" && (!tempQuyDinh.ngay_trong_tuan || tempQuyDinh.ngay_trong_tuan.length === 0)) {
        toast.warning("⚠️ Vui lòng chọn ít nhất 1 ngày trong tuần!");
        return;
      }
      
      if (tempQuyDinh.loai === "tháng" && (!tempQuyDinh.ngay_trong_thang || tempQuyDinh.ngay_trong_thang.length === 0)) {
        toast.warning("⚠️ Vui lòng chọn ít nhất 1 ngày trong tháng!");
        return;
      }
    }

    const updated = [...form.cac_muc];
    updated[selectedJob.sectionIdx].cong_viec[selectedJob.jobIdx].quy_dinh = tempQuyDinh;
    setForm({ ...form, cac_muc: updated });
    setShowQuyDinhModal(false);
    toast.success("✅ Đã lưu quy định!");
  };

  const toggleNgayTrongTuan = (day) => {
    const current = tempQuyDinh.ngay_trong_tuan || [];
    if (current.includes(day)) {
      setTempQuyDinh({
        ...tempQuyDinh,
        ngay_trong_tuan: current.filter(d => d !== day)
      });
    } else {
      setTempQuyDinh({
        ...tempQuyDinh,
        ngay_trong_tuan: [...current, day].sort()
      });
    }
  };

  const toggleNgayTrongThang = (day) => {
    const current = tempQuyDinh.ngay_trong_thang || [];
    if (current.includes(day)) {
      setTempQuyDinh({
        ...tempQuyDinh,
        ngay_trong_thang: current.filter(d => d !== day)
      });
    } else {
      setTempQuyDinh({
        ...tempQuyDinh,
        ngay_trong_thang: [...current, day].sort((a, b) => a - b)
      });
    }
  };

  // ✅ Hiển thị quy định với hỗ trợ phát sinh
  const displayQuyDinh = (quyDinh) => {
    if (!quyDinh) return "Chưa có quy định";
    
    if (quyDinh.loai === "phát sinh" || quyDinh.phat_sinh === true) {
      return "⚡ Phát sinh";
    }
    
    if (quyDinh.loai === "ngày") return "📅 Hàng ngày";
    
    if (quyDinh.loai === "tuần") {
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const selected = (quyDinh.ngay_trong_tuan || []).map(d => days[d]).join(", ");
      return selected ? `📅 Hàng tuần: ${selected}` : "📅 Hàng tuần (chưa chọn ngày)";
    }
    
    if (quyDinh.loai === "tháng") {
      const selected = (quyDinh.ngay_trong_thang || []).join(", ");
      return selected ? `📅 Hàng tháng: Ngày ${selected}` : "📅 Hàng tháng (chưa chọn ngày)";
    }
    
    return "Chưa có quy định";
  };

  const addSection = () => {
    setForm({
      ...form,
      cac_muc: [
        ...form.cac_muc,
        { ten_muc: "", cong_viec: [{ 
          noidung: "", 
          chi_tiet: [{ noi_dung_chi_tiet: "" }],
          quy_dinh: { loai: "ngày", ngay_trong_tuan: null, ngay_trong_thang: null, tan_suat: 1, phat_sinh: false }
        }] },
      ],
    });
  };

  const removeSection = (index) => {
    const updated = form.cac_muc.filter((_, i) => i !== index);
    setForm({ ...form, cac_muc: updated });
  };

  const addJobToSection = (sectionIdx) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec.push({ 
      noidung: "", 
      chi_tiet: [{ noi_dung_chi_tiet: "" }],
      quy_dinh: { loai: "ngày", ngay_trong_tuan: null, ngay_trong_thang: null, tan_suat: 1, phat_sinh: false }
    });
    setForm({ ...form, cac_muc: updated });
  };

  const removeJobFromSection = (sectionIdx, jobIdx) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec = updated[sectionIdx].cong_viec.filter(
      (_, i) => i !== jobIdx
    );
    setForm({ ...form, cac_muc: updated });
  };

  const addChiTietToJob = (sectionIdx, jobIdx) => {
    const updated = [...form.cac_muc];
    if (!updated[sectionIdx].cong_viec[jobIdx].chi_tiet) {
      updated[sectionIdx].cong_viec[jobIdx].chi_tiet = [];
    }
    updated[sectionIdx].cong_viec[jobIdx].chi_tiet.push({ noi_dung_chi_tiet: "" });
    setForm({ ...form, cac_muc: updated });
  };

  const removeChiTietFromJob = (sectionIdx, jobIdx, chiTietIdx) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec[jobIdx].chi_tiet = updated[sectionIdx].cong_viec[jobIdx].chi_tiet.filter(
      (_, i) => i !== chiTietIdx
    );
    setForm({ ...form, cac_muc: updated });
  };

  const handleSubmit = async () => {
    try {
      if (id) {
        await checkListFormServiceBDH.updateCheckListBDHForm(id, form);
        toast.success("✅ Cập nhật thành công!");
      } else {
        await checkListFormServiceBDH.createCheckListBDHForm(form);
        toast.success("✅ Tạo checklist thành công!");
      }

      setTimeout(() => navigate("/checklistbdh"), 1500);
    } catch (err) {
      toast.error("❌ Lỗi khi lưu form!");
      console.error("Submit error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <ToastContainer />
      <div className="max-w-4xl mx-auto p-8 bg-white border border-blue-200 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-blue-700">
          {id ? "✏️ Cập nhật Checklist" : "📝 Tạo Checklist BDH"}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Tiêu đề</label>
          <input
            className="w-full p-2 border rounded-md"
            value={form.tieu_de}
            onChange={(e) => handleChange("tieu_de", e.target.value)}
            placeholder="Nhập tiêu đề checklist"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Mô tả</label>
          <textarea
            className="w-full p-2 border rounded-md"
            value={form.mo_ta}
            onChange={(e) => handleChange("mo_ta", e.target.value)}
            placeholder="Nhập mô tả"
            rows={3}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-blue-700">
            Danh sách các mục công việc
          </label>

          {form.cac_muc.map((section, sectionIdx) => (
            <div
              key={sectionIdx}
              className="mb-6 border rounded-md p-4 bg-blue-50 border-blue-200"
            >
              <div className="flex justify-between items-center mb-2">
                <input
                  className="w-full p-2 border rounded-md"
                  value={section.ten_muc}
                  onChange={(e) =>
                    handleSectionChange(sectionIdx, e.target.value)
                  }
                  placeholder={`Tên mục ${sectionIdx + 1} (VD: Văn Phòng)`}
                />
                <button
                  onClick={() => removeSection(sectionIdx)}
                  className="text-red-600 text-sm ml-3 hover:underline"
                >
                  Xoá mục
                </button>
              </div>

              {section.cong_viec.map((job, jobIdx) => (
                <div key={jobIdx} className="mb-4 border-l-4 border-green-400 pl-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      className="flex-1 p-2 border rounded-md font-medium"
                      value={job.noidung}
                      onChange={(e) =>
                        handleJobChange(sectionIdx, jobIdx, e.target.value)
                      }
                      placeholder={`Công việc ${jobIdx + 1}`}
                    />
                    
                    <button
                      onClick={() => openQuyDinhModal(sectionIdx, jobIdx)}
                      className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm whitespace-nowrap"
                      title="Cài đặt quy định"
                    >
                      📅 Quy định
                    </button>
                    
                    <button
                      onClick={() => addChiTietToJob(sectionIdx, jobIdx)}
                      className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm"
                      title="Thêm chi tiết"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeJobFromSection(sectionIdx, jobIdx)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Xoá
                    </button>
                  </div>

                  <div className="ml-4 mb-2 text-xs text-gray-600">
                    {displayQuyDinh(job.quy_dinh)}
                  </div>

                  {job.chi_tiet && job.chi_tiet.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {job.chi_tiet.map((detail, chiTietIdx) => (
                        <div key={chiTietIdx} className="flex items-center gap-2">
                          <span className="text-gray-400">→</span>
                          <input
                            className="flex-1 p-2 border rounded-md text-sm bg-white"
                            value={detail.noi_dung_chi_tiet}
                            onChange={(e) =>
                              handleChiTietChange(sectionIdx, jobIdx, chiTietIdx, e.target.value)
                            }
                            placeholder={`Chi tiết ${chiTietIdx + 1}`}
                          />
                          <button
                            onClick={() => removeChiTietFromJob(sectionIdx, jobIdx, chiTietIdx)}
                            className="text-red-400 text-xs hover:underline"
                          >
                            Xoá
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addJobToSection(sectionIdx)}
                className="text-blue-600 text-sm hover:underline"
              >
                + Thêm công việc
              </button>
            </div>
          ))}

          <button
            onClick={addSection}
            className="text-green-700 font-medium hover:underline"
          >
            ➕ Thêm mục công việc
          </button>
        </div>

        <div className="text-right">
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            {id ? "💾 Cập nhật" : "✅ Tạo Checklist"}
          </button>
        </div>
      </div>

      {/* ✅ Modal Quy Định với Phát Sinh */}
      {showQuyDinhModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-purple-700">📅 Cài đặt Quy định</h3>

            {/* ✅ Chọn loại quy định với Phát Sinh */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Loại quy định</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => changeLoaiQuyDinh("ngày")}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    tempQuyDinh.loai === "ngày"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Hàng ngày
                </button>
                <button
                  onClick={() => changeLoaiQuyDinh("tuần")}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    tempQuyDinh.loai === "tuần"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Hàng tuần
                </button>
                <button
                  onClick={() => changeLoaiQuyDinh("tháng")}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    tempQuyDinh.loai === "tháng"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Hàng tháng
                </button>
                <button
                  onClick={() => changeLoaiQuyDinh("phát sinh")}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    tempQuyDinh.loai === "phát sinh"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  ⚡ Phát sinh
                </button>
              </div>
            </div>

            {/* Hiển thị thông báo nếu là phát sinh */}
            {tempQuyDinh.loai === "phát sinh" && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  ℹ️ Công việc phát sinh không có lịch trình cố định và sẽ được thực hiện khi cần thiết.
                </p>
              </div>
            )}

            {/* Chọn ngày trong tuần */}
            {tempQuyDinh.loai === "tuần" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Chọn các ngày trong tuần <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleNgayTrongTuan(idx)}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        (tempQuyDinh.ngay_trong_tuan || []).includes(idx)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chọn ngày trong tháng */}
            {tempQuyDinh.loai === "tháng" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Chọn các ngày trong tháng <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleNgayTrongThang(day)}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        (tempQuyDinh.ngay_trong_thang || []).includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowQuyDinhModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={saveQuyDinh}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Lưu quy định
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChecklistFormBDH;