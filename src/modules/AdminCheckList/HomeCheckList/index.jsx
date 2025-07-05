import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HomeCheckList = () => {
  const [checklists, setChecklists] = useState([]);
  const navigate = useNavigate();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchChecklists();
    }
  }, []);

  const fetchChecklists = async () => {
    try {
      const res = await checkListFormService.getCheckListForm();
      const sorted = [...res].sort(
        (a, b) =>
          new Date(b.createdAt || b.ngay_tao) - new Date(a.createdAt || a.ngay_tao)
      );
      setChecklists(sorted);
    } catch (error) {
      console.error("Lỗi khi gọi API checklist form:", error);
    }
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("📋 Đã copy link!", {
      position: "top-center",
      autoClose: 2000,
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xoá checklist này không?")) {
      try {
        await checkListFormService.deleteCheckListForm(id);
        toast.success("🗑️ Xoá thành công!");
        fetchChecklists();
      } catch (err) {
        toast.error("❌ Lỗi khi xoá checklist!");
        console.error("Lỗi delete:", err);
      }
    }
  };

  const handleEdit = (id) => {
    navigate(`/checklistform/edit/${id}`);
  };

  return (
    <div className="px-4 py-10 max-w-6xl mx-auto">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Danh sách Checklist</h1>
        <button
          onClick={() => navigate("/checklistform")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow transition-transform hover:scale-105"
        >
          ➕ Tạo Checklist
        </button>
      </div>

      {/* Danh sách checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {checklists.map((form) => {
          const fullLink = `${window.location.origin}/checklist/fill/${form._id}`;
          return (
            <div
              key={form._id}
              className="flex flex-col justify-between h-full p-5 rounded-xl border border-gray-200 bg-white shadow hover:shadow-lg transition-all duration-200"
            >
              <div
                onClick={() => navigate(`/checklistform/${form._id}`)}
                className="cursor-pointer"
              >
                <h3
                  className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                  title="Xem chi tiết"
                >
                  {form.tieu_de || "Không có tiêu đề"}
                </h3>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => handleCopy(fullLink)}
                  title="Copy link"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded transition"
                >
                  📎 Link
                </button>

                <button
                  onClick={() => handleEdit(form._id)}
                  title="Chỉnh sửa"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded transition"
                >
                  ✏️ Sửa
                </button>

                <button
                  onClick={() => handleDelete(form._id)}
                  title="Xoá checklist"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition"
                >
                  🗑️ Xoá
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeCheckList;
