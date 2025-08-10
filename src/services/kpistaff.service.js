import { ApiServer, URL } from "@/configs/api-request";

// Lấy tất cả KPI (tuỳ chọn lọc theo tháng)
const getAllKPI = async (payload) => {
  try {
    const res = await ApiServer.get(URL.kpistaff.list, {
      params: payload, // payload = { thang: 8 }
    });
    return res.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách KPI:", error);
    throw error;
  }
};

// Lấy KPI theo staff_id và tháng
const getKPIByStaffId = async (staffId, thang) => {
  try {
    const res = await ApiServer.get(URL.kpistaff.getByStaffId(staffId), {
      params: { thang },
    });
    return res.data;
  } catch (error) {
    console.error("Lỗi khi lấy KPI theo mã nhân viên:", error);
    throw error;
  }
};

// Tạo KPI mới
const createKPI = async (payload) => {
  try {
    const res = await ApiServer.post(URL.kpistaff.create, payload);
    return res.data;
  } catch (error) {
    console.error("Lỗi khi tạo KPI:", error);
    throw error;
  }
};

// Cập nhật KPI theo ID
const updateKPI = async (id, payload) => {
  try {
    const res = await ApiServer.put(`${URL.kpistaff.create}/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("Lỗi khi cập nhật KPI:", error);
    throw error;
  }
};

// Xoá KPI theo ID
const deleteKPI = async (id) => {
  try {
    const res = await ApiServer.delete(`${URL.kpistaff.delete}/${id}`);
    return res.data;
  } catch (error) {
    console.error("Lỗi khi xoá KPI:", error);
    throw error;
  }
};

export const kpistaffService = {
  getAllKPI,
  getKPIByStaffId,
  createKPI,
  updateKPI,
  deleteKPI,
};
