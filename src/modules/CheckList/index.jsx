import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkListService } from "@/services/checklist.service";
import UserInfoForm from "./infoUser";
import { ClipboardCheck, AlertCircle, StickyNote } from "lucide-react";

const checklistData = [
  { id: "1.1", group: "KIỂM TRA BÊN NGOÀI", text: "Các vỏ xe căng đều" },
  { id: "1.2", group: "KIỂM TRA BÊN NGOÀI", text: "Vỏ xe không quá mòn" },
  { id: "1.3", group: "KIỂM TRA BÊN NGOÀI", text: "Bulong xiết chắc chắn" },
  { id: "1.4", group: "KIỂM TRA BÊN NGOÀI", text: "Xích nâng căng đều" },
  {
    id: "1.5",
    group: "KIỂM TRA BÊN NGOÀI",
    text: "Không dầu hiệu rò rỉ dầu thủy lực",
  },
  {
    id: "1.6",
    group: "KIỂM TRA BÊN NGOÀI",
    text: "Không dầu hiệu rò rỉ dầu nhớt trên sàn",
  },
  {
    id: "1.7",
    group: "KIỂM TRA BÊN NGOÀI",
    text: "Không có rò rỉ nhiên liệu trên đường ống",
  },
  {
    id: "1.8",
    group: "KIỂM TRA BÊN NGOÀI",
    text: "Không có dấu hiệu rạn nứt tại các mối hàn",
  },
  { id: "2.1", group: "KIỂM TRA KHI VẬN HÀNH", text: "Dây đai an toàn" },
  { id: "2.2", group: "KIỂM TRA KHI VẬN HÀNH", text: "Hệ thống đèn, còi" },
  {
    id: "2.3",
    group: "KIỂM TRA KHI VẬN HÀNH",
    text: "Hệ thống kính chiếu hậu",
  },
  {
    id: "2.4",
    group: "KIỂM TRA KHI VẬN HÀNH",
    text: "Hệ thống thắng tay và chân",
  },
  {
    id: "2.5",
    group: "KIỂM TRA KHI VẬN HÀNH",
    text: "Hệ thống nâng (lên xuống, trái phải, nghiêng)",
  },
];

const ForkliftChecklistMobile = () => {
  const navigate = useNavigate();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [userInfo, setUserInfo] = useState({
    employeeId: "",
    userName: "",
    department: "",
    carNumber: "",
  });
  const [items, setItems] = useState(
    checklistData.map((item) => ({ ...item, status: "", note: "" }))
  );
  const [errors, setErrors] = useState({});
  const [conclusion, setConclusion] = useState("");

  const handleStatusChange = (id, status) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const handleNoteChange = (id, note) => {
    setItems(items.map((item) => (item.id === id ? { ...item, note } : item)));
  };

  const validateChecklist = () => {
    const newErrors = {};
    items.forEach((item) => {
      if (!item.status) newErrors[item.id] = "Vui lòng chọn Y hoặc N";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateChecklist()) return;

    const kiem_tra_ben_ngoai = items
      .filter((i) => i.group === "KIỂM TRA BÊN NGOÀI")
      .map((i) => ({
        noidung: i.text,
        dap_an: i.status,
        ghi_chu: i.note,
      }));

    const kiem_tra_khi_van_hanh = items
      .filter((i) => i.group === "KIỂM TRA KHI VẬN HÀNH")
      .map((i) => ({
        noidung: i.text,
        dap_an: i.status,
        ghi_chu: i.note,
      }));

    const payload = {
      ma_nhan_vien: userInfo.employeeId,
      ho_ten: userInfo.userName,
      don_vi: userInfo.department,
      so_xe: userInfo.carNumber,
      kiem_tra_ben_ngoai,
      kiem_tra_khi_van_hanh,
      ket_luan: conclusion,
    };

    try {
      await checkListService.createCheckList(payload);
      navigate("/thank-you");
    } catch (err) {
      alert("Gửi checklist thất bại!");
      console.error(err);
    }
  };

  if (!isConfirmed) {
    return (
      <UserInfoForm
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onConfirm={() => setIsConfirmed(true)}
      />
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      <h2 className="text-center text-lg font-bold text-blue-600 mb-4 uppercase">
        Checklist An Toàn Xe Nâng
      </h2>

      <div className="text-sm text-gray-700 mb-4 space-y-1">
        <p>
          <strong>Mã nhân viên:</strong> {userInfo.employeeId}
        </p>
        <p>
          <strong>Họ và tên:</strong> {userInfo.userName}
        </p>
        <p>
          <strong>Đơn vị:</strong> {userInfo.department}
        </p>
        <p>
          <strong>Số xe:</strong> {userInfo.carNumber}
        </p>
      </div>
      <div className="text-sm text-gray-700 mb-4 text-center">
        <p>
          <span className="text-green-600 font-medium">Y</span>: Đạt yêu cầu
          &nbsp; | &nbsp;
          <span className="text-red-600 font-medium">N</span>: Chưa đạt yêu cầu
        </p>
      </div>

      {items.map((item, index) => {
        const isGroupStart =
          index === 0 || items[index - 1].group !== item.group;

        return (
          <div
            key={item.id}
            className="mb-5 border rounded-xl p-4 shadow bg-white"
          >
            {isGroupStart && (
              <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2 border-b pb-1">
                <ClipboardCheck className="size-5" />
                {item.group}
              </div>
            )}

            <div className="flex gap-2 items-start mb-2 text-sm text-gray-800 font-medium">
              <AlertCircle className="size-4 text-yellow-500 mt-1" />
              <span>
                {index + 1}. {item.text}
              </span>
            </div>

            <div className="flex gap-6 text-sm mb-2">
              {["Y", "N"].map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`status-${item.id}`}
                    checked={item.status === opt}
                    onChange={() => handleStatusChange(item.id, opt)}
                    className="accent-blue-600"
                  />
                  {opt}
                </label>
              ))}
            </div>

            {errors[item.id] && (
              <div className="text-red-500 text-xs mb-2">{errors[item.id]}</div>
            )}

            <div className="flex items-start gap-2">
              <StickyNote className="size-4 text-gray-500 mt-1" />
              <input
                type="text"
                placeholder="Ghi chú (nếu có)"
                value={item.note}
                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      })}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-semibold">Kết luận:</label>
          <input
            type="text"
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Ghi kết luận chung nếu có..."
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm font-semibold hover:bg-blue-700"
        >
          Gửi Checklist
        </button>
      </div>
    </div>
  );
};

export default ForkliftChecklistMobile;
