import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { checkListFormService } from "@/services/checklistform.service";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HomeCheckList = () => {
  const [checklists, setChecklists] = useState([]);
  const navigate = useNavigate();

  const fetchedRef = useRef(false); // 👈 FLAG chống gọi lặp

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const res = await checkListFormService.getCheckListForm();
        const sorted = [...res].sort(
          (a, b) =>
            new Date(b.createdAt || b.ngay_tao) -
            new Date(a.createdAt || a.ngay_tao)
        );
        setChecklists(sorted);
      } catch (error) {
        console.error("Lỗi khi gọi API checklist form:", error);
      }
    };

    if (!fetchedRef.current) {
      fetchedRef.current = true; // đánh dấu đã fetch
      fetchChecklists();
    }
  }, []);

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("📋 Đã copy link!", {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  return (
    <div className="px-4 py-10 max-w-7xl mx-auto">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <button
          onClick={() => navigate("/checklistform")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
        >
          Tạo Checklist
        </button>
      </div>

      {/* Danh sách checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {checklists.map((form) => {
          const fullLink = `${window.location.origin}/checklist/fill/${form._id}`;
          return (
            <div
              key={form._id}
              onClick={() => navigate(`/checklistform/${form._id}`)}
              className="cursor-pointer p-5 rounded-xl border border-gray-200 bg-white shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl hover:border-blue-500 group"
            >
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                {form.tieu_de || "Không có tiêu đề"}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(fullLink);
                }}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded shadow transition-all duration-300"
              >
                📎 Copy link
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeCheckList;
