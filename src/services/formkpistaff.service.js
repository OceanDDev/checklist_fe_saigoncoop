// services/formkpistaff.service.js
import { ApiServer, URL } from "@/configs/api-request";

// Unwrap helper: ưu tiên res.data.data -> res.data -> []
const pick = (res) => (res?.data?.data ?? res?.data ?? []);

const commonNoCache = {
  headers: { "Cache-Control": "no-cache" },
  // Nếu muốn chắc chắn hơn: params: { _t: Date.now(), ...(params || {}) }
};

// Lấy tất cả Form KPI (tùy chọn lọc)
const getAllFormKPI = async (params) => {
  const res = await ApiServer.get(URL.formkpistaff.list, {
    ...commonNoCache,
    params,
  });
  return pick(res);            // ← luôn trả về mảng
};

// Lấy theo _id (record id)
const getFormKPIById = async (id) => {
  const res = await ApiServer.get(`${URL.formkpistaff.list}/${id}`, commonNoCache);
  return pick(res);            // có thể là object hoặc mảng tùy backend
};

// (Tùy backend có route này không) Lấy theo mã NV + tháng/năm
const getFormKPIByStaffMonth = async (ma_nhan_vien, thang, nam) => {
  const res = await ApiServer.get(`${URL.formkpistaff.list}`, {
    ...commonNoCache,
    params: { ma_nhan_vien, thang, nam },
  });
  return pick(res);            // thường là mảng các bản ghi phù hợp
};

// Tạo Form KPI
const createFormKPI = async (payload) => {
  const res = await ApiServer.post(URL.formkpistaff.create, payload, commonNoCache);
  // nhiều API trả {success,data}; ta lấy data thật
  return res?.data?.data ?? payload;
};

// Cập nhật Form KPI theo _id (nhớ đúng base path PUT/ids)
const updateFormKPI = async (id, payload) => {
  // dùng URL.formkpistaff.list cho REST chuẩn: PUT /formkpistaff/:id
  const res = await ApiServer.put(`${URL.formkpistaff.list}/${id}`, payload, commonNoCache);
  return res?.data?.data ?? { _id: id, ...payload };
};

// Xoá Form KPI theo _id
const deleteFormKPI = async (id) => {
  // tương tự: DELETE /formkpistaff/:id
  const res = await ApiServer.delete(`${URL.formkpistaff.list}/${id}`, commonNoCache);
  return res?.data?.data ?? { _id: id };
};

export const formkpistaffService = {
  getAllFormKPI,
  getFormKPIById,
  getFormKPIByStaffMonth,
  createFormKPI,
  updateFormKPI,
  deleteFormKPI,
};
  