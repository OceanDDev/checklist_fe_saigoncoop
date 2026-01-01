// src/services/checkkpistaff.service.js
import { ApiServer, URL, DEF_HEADERS } from "@/configs/api-request";
import { requestService } from "./request.service";

/**
 * Lấy tất cả Check KPI (lọc theo quý/năm/nhân viên/đơn vị)
 * @param {{ ma_nhan_vien?: string, quy?: number, nam?: number, don_vi?: string }} payload
 */
const getAllCheckKPI = async (payload = {}) => {
  try {
    const results = await requestService.get(
      URL.checkkpistaff.list,
      payload,
      DEF_HEADERS,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách check KPI:", error);
    throw error;
  }
};

/**
 * Tạo check KPI từ form_kpi_id
 * payload: { form_kpi_id, quy, nam, kpis?, ty_trong_quy?, ghi_chu? }
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
 * payload: { ma_nhan_vien, quy, nam, kpis?, ty_trong_quy?, ghi_chu? }
 */
const createCheckKPIFromStaff = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.checkkpistaff.create}/from-staff`,
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
 * Lấy check KPI theo mã nhân viên + năm (trả về tất cả các quý trong năm)
 * @param {string} ma_nhan_vien - Mã nhân viên
 * @param {number} nam - Năm
 * @returns {Promise} - Danh sách check KPI của nhân viên trong năm
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
 * Lấy check KPI theo mã nhân viên + quý + năm (lấy 1 quý cụ thể)
 * @param {string} ma_nhan_vien - Mã nhân viên
 * @param {number} quy - Quý (1-4)
 * @param {number} nam - Năm
 */
const getCheckKPIByStaffQuarter = async (ma_nhan_vien, quy, nam) => {
  try {
    const result = await requestService.get(
      URL.checkkpistaff.list,
      { ma_nhan_vien, quy, nam },
      DEF_HEADERS,
      ApiServer
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi lấy check KPI theo nhân viên và quý:", error);
    throw error;
  }
};

/**
 * Cập nhật check KPI
 * payload: { danh_sach_check?, ghi_chu?, ty_trong_quy?, update_note? }
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
 * payload: { quy?, nam? }
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

/**
 * Helper: Chuyển đổi quý sang tháng
 * @param {number} quy - Quý (1-4)
 * @returns {{ start: number, end: number }} - Tháng bắt đầu và kết thúc
 */
const getMonthsFromQuarter = (quy) => {
  const quarterMap = {
    1: { start: 1, end: 3 },
    2: { start: 4, end: 6 },
    3: { start: 7, end: 9 },
    4: { start: 10, end: 12 },
  };
  return quarterMap[quy] || { start: 1, end: 3 };
};

/**
 * Helper: Lấy quý từ tháng
 * @param {number} thang - Tháng (1-12)
 * @returns {number} - Quý (1-4)
 */
const getQuarterFromMonth = (thang) => {
  return Math.ceil(thang / 3);
};

export const checkKPIService = {
  getAllCheckKPI,
  createCheckKPI,
  createCheckKPIFromStaff,
  getCheckKPIById,
  getCheckKPIByStaff,
  getCheckKPIByStaffQuarter,
  updateCheckKPI,
  deleteCheckKPI,
  getCheckKPIStats,

  // Helper functions
  getMonthsFromQuarter,
  getQuarterFromMonth,
};
