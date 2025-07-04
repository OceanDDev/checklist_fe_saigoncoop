import { ApiServer, URL } from "@/configs/api-request";

const getStaff = async (payload) => {
  try {
    const results = await ApiServer.get(
      `${URL.staff.staff}/search`,     // → "/api/saigoncoop/staff/search"
      { params: payload }              // → query: ?ma_nhan_vien=A123
    );
    return results.data;              // lấy data từ Axios response
  } catch (error) {
    console.error("Lỗi khi lấy nhân viên theo mã:", error);
    throw error;
  }
};

export const staffService = {
  getStaff,
};
