/* eslint-disable react/prop-types */
const UserRowCheckList = ({ user, index, allCheckTitles }) => {
  const ktBenNgoai = user.kiem_tra_ben_ngoai || [];
  const ktVanHanh = user.kiem_tra_khi_van_hanh || [];
  const allAnswers = [...ktBenNgoai, ...ktVanHanh];

  const getAnswerByContent = (content) => {
    const found = allAnswers.find((item) => item.noidung === content);
    return found?.dap_an || "";
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <tr className="bg-white hover:bg-gray-50 transition text-sm">
      <td className="border px-3 py-2 text-center min-w-[60px]">
        {" "}
        {index + 1}{" "}
      </td>
      <td className="border px-3 py-2 min-w-[100px] break-words">
        {" "}
        {user.ma_nhan_vien}{" "}
      </td>
      <td className="border px-3 py-2 min-w-[140px] break-words">
        {" "}
        {user.ho_ten}{" "}
      </td>
      <td className="border px-3 py-2 min-w-[140px] break-words">
        {" "}
        {user.don_vi}{" "}
      </td>
      <td className="border px-3 py-2 min-w-[200px] break-words">
        {(user.option_da_chon || [])
          .map((opt) => `${opt.label}: ${opt.value}`)
          .join(", ")}
      </td>
      <td className="border px-3 py-2 min-w-[160px] whitespace-nowrap">
        {formatDate(user.ngay_tao)}
      </td>

      {allCheckTitles.map((title, i) => (
        <td
          key={i}
          className="border px-2 py-1 text-center min-w-[120px] break-words"
        >
          {getAnswerByContent(title)}
        </td>
      ))}
      <td className="border px-3 py-2 min-w-[160px] break-words">
        {user.ghi_chu || ""}
      </td>
    </tr>
  );
};

export default UserRowCheckList;
