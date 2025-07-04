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
    checklist_groups: [
      {
        label: "",
        items: [{ noidung: "" }],
      },
    ],
    option: [
      {
        label: "",
        choices: [""],
      },
    ],
  });

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleGroupLabelChange = (groupIndex, value) => {
    const updated = [...form.checklist_groups];
    updated[groupIndex].label = value;
    setForm({ ...form, checklist_groups: updated });
  };

  const handleItemChange = (groupIndex, itemIndex, value) => {
    const updatedGroups = [...form.checklist_groups];
    updatedGroups[groupIndex].items[itemIndex].noidung = value;
    setForm({ ...form, checklist_groups: updatedGroups });
  };

  const handleAddItem = (groupIndex) => {
    const updatedGroups = [...form.checklist_groups];
    updatedGroups[groupIndex].items.push({ noidung: "" });
    setForm({ ...form, checklist_groups: updatedGroups });
  };

  const handleRemoveItem = (groupIndex, itemIndex) => {
    const updatedGroups = [...form.checklist_groups];
    updatedGroups[groupIndex].items = updatedGroups[groupIndex].items.filter(
      (_, i) => i !== itemIndex
    );
    setForm({ ...form, checklist_groups: updatedGroups });
  };

  const handleAddGroup = () => {
    setForm({
      ...form,
      checklist_groups: [...form.checklist_groups, { label: "", items: [{ noidung: "" }] }],
    });
  };

  const handleRemoveGroup = (groupIndex) => {
    const updatedGroups = form.checklist_groups.filter((_, i) => i !== groupIndex);
    setForm({ ...form, checklist_groups: updatedGroups });
  };

  // Option handlers remain unchanged
  const handleOptionLabelChange = (index, value) => {
    const updated = [...form.option];
    updated[index].label = value;
    setForm({ ...form, option: updated });
  };

  const handleChoiceChange = (optIndex, choiceIndex, value) => {
    const updated = [...form.option];
    updated[optIndex].choices[choiceIndex] = value;
    setForm({ ...form, option: updated });
  };

  const handleAddChoice = (optIndex) => {
    const updated = [...form.option];
    updated[optIndex].choices.push("");
    setForm({ ...form, option: updated });
  };

  const handleRemoveChoice = (optIndex, choiceIndex) => {
    const updated = [...form.option];
    updated[optIndex].choices = updated[optIndex].choices.filter((_, i) => i !== choiceIndex);
    setForm({ ...form, option: updated });
  };

  const handleAddOption = () => {
    setForm({ ...form, option: [...form.option, { label: "", choices: [""] }] });
  };

  const handleRemoveOption = (index) => {
    const updated = form.option.filter((_, i) => i !== index);
    setForm({ ...form, option: updated });
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
      toast.error("❌ Có lỗi xảy ra khi tạo form!", {
        position: "top-center",
        autoClose: 2500,
      });err
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <ToastContainer />
      <div className="max-w-4xl mx-auto p-8 bg-white border-2 border-blue-200 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold mb-6 text-blue-700">📝 Tạo Checklist Form</h2>

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700">Tiêu đề</label>
          <input
            className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập tiêu đề"
            value={form.tieu_de}
            onChange={(e) => handleChange("tieu_de", e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium text-gray-700">Mô tả</label>
          <textarea
            className="border border-gray-300 p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập mô tả"
            rows={3}
            value={form.mo_ta}
            onChange={(e) => handleChange("mo_ta", e.target.value)}
          />
        </div>

        {/* Checklist Groups */}
        {form.checklist_groups.map((group, gIdx) => (
          <div key={gIdx} className="mb-6 border rounded p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <input
                className="border border-gray-300 p-2 flex-1 rounded-md"
                placeholder="Tên danh mục (VD: Kiểm tra bên ngoài)"
                value={group.label}
                onChange={(e) => handleGroupLabelChange(gIdx, e.target.value)}
              />
              <button
                onClick={() => handleRemoveGroup(gIdx)}
                className="text-red-500 text-sm hover:underline"
              >
                Xoá danh mục
              </button>
            </div>

            {group.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-2 mb-1">
                <input
                  className="border border-gray-300 p-2 flex-1 rounded-md"
                  placeholder={`Mục ${iIdx + 1}`}
                  value={item.noidung}
                  onChange={(e) => handleItemChange(gIdx, iIdx, e.target.value)}
                />
                <button
                  onClick={() => handleRemoveItem(gIdx, iIdx)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Xoá
                </button>
              </div>
            ))}
            <button
              onClick={() => handleAddItem(gIdx)}
              className="text-blue-600 text-sm hover:underline mt-1"
            >
              + Thêm mục kiểm tra
            </button>
          </div>
        ))}
        <button
          onClick={handleAddGroup}
          className="text-green-600 text-sm font-medium hover:underline mb-6"
        >
          + Thêm danh mục mới
        </button>

        {/* Options (unchanged) */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">🧩 Tuỳ chọn người dùng (Option)</h4>
          {form.option.map((opt, optIndex) => (
            <div key={optIndex} className="border border-gray-200 p-4 rounded-lg mb-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="border border-gray-300 p-2 flex-1 rounded-md"
                  placeholder="Nhập tiêu đề (label), ví dụ: Khu vực kiểm tra"
                  value={opt.label}
                  onChange={(e) => handleOptionLabelChange(optIndex, e.target.value)}
                />
                <button
                  onClick={() => handleRemoveOption(optIndex)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Xoá option
                </button>
              </div>
              {opt.choices.map((choice, choiceIndex) => (
                <div key={choiceIndex} className="flex items-center gap-2 mb-1">
                  <input
                    className="border border-gray-300 p-2 flex-1 rounded-md"
                    placeholder={`Lựa chọn ${choiceIndex + 1}`}
                    value={choice}
                    onChange={(e) => handleChoiceChange(optIndex, choiceIndex, e.target.value)}
                  />
                  <button
                    onClick={() => handleRemoveChoice(optIndex, choiceIndex)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Xoá
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddChoice(optIndex)}
                className="text-blue-500 text-sm hover:underline mt-1"
              >
                + Thêm lựa chọn
              </button>
            </div>
          ))}
          <button
            onClick={handleAddOption}
            className="text-green-600 font-medium text-sm hover:underline"
          >
            + Thêm Option mới
          </button>
        </div>

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
