import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminChecklistForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tieu_de: "",
    mo_ta: "",
    kiem_tra_ben_ngoai: [{ noidung: "" }],
    kiem_tra_khi_van_hanh: [{ noidung: "" }],
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleItemChange = (section, index, value) => {
    const updated = [...form[section]];
    updated[index].noidung = value;
    setForm({ ...form, [section]: updated });
  };

  const handleAddItem = (section) => {
    setForm({
      ...form,
      [section]: [...form[section], { noidung: "" }],
    });
  };

  const handleRemoveItem = (section, index) => {
    const updated = form[section].filter((_, i) => i !== index);
    setForm({ ...form, [section]: updated });
  };

  const handleSubmit = async () => {
    try {
      await checkListFormService.createCheckListForm(form);
      toast.success("✅ Tạo checklist thành công!", {
        position: "top-center",
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      toast.error("❌ Có lỗi xảy ra khi tạo form!",err, {
        position: "top-center",
        autoClose: 2500,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <ToastContainer />
      <div className="max-w-3xl mx-auto p-8 bg-white border-2 border-blue-200 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold mb-6 text-blue-700">📝 Tạo Checklist Form</h2>

        {/* Tiêu đề */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700">Tiêu đề</label>
          <input
            className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập tiêu đề"
            value={form.tieu_de}
            onChange={(e) => handleChange("tieu_de", e.target.value)}
          />
        </div>

        {/* Mô tả */}
        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium text-gray-700">Mô tả</label>
          <textarea
            className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập mô tả"
            value={form.mo_ta}
            rows={3}
            onChange={(e) => handleChange("mo_ta", e.target.value)}
          />
        </div>

        {/* Kiểm tra bên ngoài */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Kiểm tra bên ngoài</h4>
          {form.kiem_tra_ben_ngoai.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                className="border border-gray-300 p-2 flex-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={item.noidung}
                onChange={(e) =>
                  handleItemChange("kiem_tra_ben_ngoai", index, e.target.value)
                }
                placeholder={`Mục ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem("kiem_tra_ben_ngoai", index)}
                className="text-red-500 text-sm hover:underline"
              >
                Xoá
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem("kiem_tra_ben_ngoai")}
            className="text-blue-600 text-sm font-medium hover:underline mt-1"
          >
            + Thêm mục
          </button>
        </div>

        {/* Kiểm tra khi vận hành */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Kiểm tra khi vận hành</h4>
          {form.kiem_tra_khi_van_hanh.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <input
                className="border border-gray-300 p-2 flex-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={item.noidung}
                onChange={(e) =>
                  handleItemChange("kiem_tra_khi_van_hanh", index, e.target.value)
                }
                placeholder={`Mục ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => handleRemoveItem("kiem_tra_khi_van_hanh", index)}
                className="text-red-500 text-sm hover:underline"
              >
                Xoá
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddItem("kiem_tra_khi_van_hanh")}
            className="text-blue-600 text-sm font-medium hover:underline mt-1"
          >
            + Thêm mục
          </button>
        </div>

        {/* Nút tạo */}
        <div className="text-right">
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            ✅ Tạo Form
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminChecklistForm;
