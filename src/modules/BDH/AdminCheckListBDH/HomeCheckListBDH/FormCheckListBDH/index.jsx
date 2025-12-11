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
        cong_viec: [{ noidung: "", chi_tiet: [{ noi_dung_chi_tiet: "" }] }],
      },
    ],
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

  const addSection = () => {
    setForm({
      ...form,
      cac_muc: [
        ...form.cac_muc,
        { ten_muc: "", cong_viec: [{ noidung: "", chi_tiet: [{ noi_dung_chi_tiet: "" }] }] },
      ],
    });
  };

  const removeSection = (index) => {
    const updated = form.cac_muc.filter((_, i) => i !== index);
    setForm({ ...form, cac_muc: updated });
  };

  const addJobToSection = (sectionIdx) => {
    const updated = [...form.cac_muc];
    updated[sectionIdx].cong_viec.push({ noidung: "", chi_tiet: [{ noi_dung_chi_tiet: "" }] });
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
    // Khởi tạo chi_tiet nếu chưa tồn tại
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

        {/* Danh sách các mục (section) */}
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

              {/* Công việc trong mục này */}
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

                  {/* Chi tiết của công việc */}
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
    </div>
  );
};

export default AdminChecklistFormBDH;