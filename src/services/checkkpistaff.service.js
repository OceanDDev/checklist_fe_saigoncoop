// src/services/checkkpistaff.service.js
import { ApiServer, URL, DEF_HEADERS } from "@/configs/api-request";
import { requestService } from "./request.service";

/**
 * Lấy tất cả Check KPI (lọc theo tháng/năm/nhân viên/đơn vị ...)
 * @param {{ ma_nhan_vien?: string, thang?: number, nam?: number, don_vi?: string }} payload
 */
const getAllCheckKPI = async (payload = {}) => {
  try {
    // ĐÚNG THỨ TỰ: path, params, headers, axiosInstance
    const results = await requestService.get(
      URL.checkkpistaff.list,
      payload,
      DEF_HEADERS,
      ApiServer
    );
    return results; // requestService đã .data
  } catch (error) {
    console.error("Lỗi khi lấy danh sách check KPI:", error);
    throw error;
  }
};

/**
 * Tạo check KPI từ form_kpi_id
 * payload: { form_kpi_id, thang, nam, kpis? }
 */
const createCheckKPI = async (payload) => {
  try {
    const results = await requestService.post(
      URL.checkkpistaff.create,
      payload,
      DEF_HEADERS,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi tạo check KPI:", error);
    throw error;
  }
};

/**
 * Tạo check KPI từ mã nhân viên (không cần form_kpi_id)
 * payload: { ma_nhan_vien, thang, nam, kpis? }
 * Nếu BE có route riêng /from-staff thì thay URL ở dưới cho đúng:
 *   `${URL.checkkpistaff.create}/from-staff`
 */
const createCheckKPIFromStaff = async (payload) => {
  try {
    const results = await requestService.post(
      URL.checkkpistaff.create, // hoặc `${URL.checkkpistaff.create}/from-staff`
      payload,
      DEF_HEADERS,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi tạo check KPI từ nhân viên:", error);
    throw error;
  }
};

/**
 * Lấy check KPI theo ID
 */
const getCheckKPIById = async (id) => {
  try {
    const result = await requestService.get(
      `${URL.checkkpistaff.list}/${id}`,
      {},
      DEF_HEADERS,
      ApiServer
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy check KPI theo ID:", error);
    throw error;
  }
};

/**
 * Lấy check KPI theo mã nhân viên + tháng/năm
 */
const getCheckKPIByStaff = async (ma_nhan_vien, nam) => {
  try {
    const result = await requestService.get(
      `${URL.checkkpistaff.list}/staff/${ma_nhan_vien}/year/${nam}`,
      {},
      DEF_HEADERS,
      ApiServer
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy check KPI theo nhân viên:", error);
    throw error;
  }
};

/**
 * Cập nhật check KPI
 */
const updateCheckKPI = async (id, payload) => {
  try {
    const result = await requestService.put(
      `${URL.checkkpistaff.create}/${id}`,
      payload,
      DEF_HEADERS,
      ApiServer
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi cập nhật check KPI:", error);
    throw error;
  }
};

/**
 * Xoá check KPI
 */
const deleteCheckKPI = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checkkpistaff.delete}/${id}`,
      DEF_HEADERS,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi xoá check KPI:", error);
    throw error;
  }
};

/**
 * Thống kê check KPI
 */
const getCheckKPIStats = async (payload = {}) => {
  try {
    const result = await requestService.get(
      `${URL.checkkpistaff.list}/stats`,
      payload,
      DEF_HEADERS,
      ApiServer
    );
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
