import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// Lấy tất cả Check KPI (lọc theo tháng/năm/nhân viên/đơn vị)
const getAllCheckKPI = async (payload) => {
  try {
    const results = await requestService.get(ApiServer, URL.checkkpistaff.list, payload);
    return results;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách check KPI:", error);
    throw error;
  }
};

// Tạo check KPI từ form_kpi_id
const createCheckKPI = async (payload) => {
  try {
    const results = await requestService.post(URL.checkkpistaff.create, payload);
    return results;
  } catch (error) {
    console.error("Lỗi khi tạo check KPI:", error);
    throw error;
  }
};

// Tạo check KPI từ mã nhân viên (không cần form_kpi_id)
const createCheckKPIFromStaff = async (payload) => {
  try {
    const results = await requestService.post(`${URL.checkkpistaff.create}`, payload);
    return results;
  } catch (error) {
    console.error("Lỗi khi tạo check KPI từ nhân viên:", error);
    throw error;
  }
};

// Lấy check KPI theo ID
const getCheckKPIById = async (id) => {
  try {
    const result = await requestService.get(`${URL.checkkpistaff.list}/${id}`);
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy check KPI theo ID:", error);
    throw error;
  }
};

// Lấy check KPI theo mã nhân viên + tháng/năm
const getCheckKPIByStaff = async (ma_nhan_vien, thang, nam) => {
  try {
    const result = await requestService.get(
      `${URL.checkkpistaff.list}/staff/${ma_nhan_vien}/${thang}/${nam}`
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy check KPI theo nhân viên:", error);
    throw error;
  }
};

// Cập nhật check KPI
const updateCheckKPI = async (id, payload) => {
  try {
    const result = await requestService.put(`${URL.checkkpistaff.create}/${id}`, payload);
    return result;
  } catch (error) {
    console.error("Lỗi khi cập nhật check KPI:", error);
    throw error;
  }
};

// Xoá check KPI
const deleteCheckKPI = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checkkpistaff.delete}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi xoá check KPI:", error);
    throw error;
  }
};

// Lấy thống kê check KPI
const getCheckKPIStats = async (payload) => {
  try {
    const result = await requestService.get(`${URL.checkkpistaff.list}/stats`, payload);
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy thống kê check KPI:", error);
    throw error;
  }
};

export const checkKPIService = {
  getAllCheckKPI,
  createCheckKPI,
  createCheckKPIFromStaff,
  getCheckKPIById,
  getCheckKPIByStaff,
  updateCheckKPI,
  deleteCheckKPI,
  getCheckKPIStats,
};
