/* eslint-disable react/prop-types */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AddCuaHangDialog = ({ onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    maCH: "",
    tenCH: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.maCH.trim()) {
      alert("Vui lòng nhập Mã cửa hàng!");
      return;
    }
    if (!formData.tenCH.trim()) {
      alert("Vui lòng nhập Tên cửa hàng!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        maCH: formData.maCH.trim(),
        tenCH: formData.tenCH.trim(),
      });

      // Reset form và đóng modal
      setFormData({ maCH: "", tenCH: "" });
      setIsOpen(false);
    } catch (error) {
      console.error("Lỗi thêm cửa hàng:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ maCH: "", tenCH: "" });
    setIsOpen(false);
  };

  return (
    <>
      {/* Nút mở modal */}
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ➕ Thêm cửa hàng
      </Button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Thêm cửa hàng mới
              </h3>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="maCH"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mã cửa hàng <span className="text-red-500">*</span>
                </label>
                <Input
                  id="maCH"
                  name="maCH"
                  type="text"
                  value={formData.maCH}
                  onChange={handleInputChange}
                  placeholder="Nhập mã cửa hàng..."
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label
                  htmlFor="tenCH"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tên cửa hàng <span className="text-red-500">*</span>
                </label>
                <Input
                  id="tenCH"
                  name="tenCH"
                  type="text"
                  value={formData.tenCH}
                  onChange={handleInputChange}
                  placeholder="Nhập tên cửa hàng..."
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang thêm..." : "Thêm cửa hàng"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AddCuaHangDialog;
