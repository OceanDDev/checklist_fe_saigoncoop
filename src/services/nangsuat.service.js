// services/nangsuat.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

/** Helper: build query string khớp với getAllnangsuat controller */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 20,
    status = "",
    from_zone = "",
    to_zone = "",
    assigned_to = "",
    loai = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (status) qs.set("status", status);
  if (from_zone) qs.set("from_zone", from_zone);
  if (to_zone) qs.set("to_zone", to_zone);
  if (assigned_to) qs.set("assigned_to", assigned_to);
  if (loai) qs.set("loai", loai);

  return qs.toString();
};

// 📋 Lấy toàn bộ phiếu (phân trang + filter)
const getAll = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    return await requestService.get(
      `${URL.nangsuat.nangsuat}?${query}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getAll nangsuat:", error);
    throw error;
  }
};

// 🔍 Lấy một phiếu theo _id
const getById = async (id) => {
  try {
    return await requestService.get(
      `${URL.nangsuat.nangsuat}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getById nangsuat:", error);
    throw error;
  }
};

// 🔍 Lấy phiếu theo doc_number
const getByDocNumber = async (doc_number) => {
  try {
    return await requestService.get(
      `${URL.nangsuat.nangsuat}/doc/${doc_number}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getByDocNumber nangsuat:", error);
    throw error;
  }
};

// ➕ Thêm một phiếu
const addOne = async (payload) => {
  try {
    return await requestService.post(
      URL.nangsuat.nangsuat,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi addOne nangsuat:", error);
    throw error;
  }
};

// 📥 Thêm nhiều phiếu
const addMany = async (docs = []) => {
  try {
    return await requestService.post(
      `${URL.nangsuat.nangsuat}/many`,
      { docs },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi addMany nangsuat:", error);
    throw error;
  }
};

// ✏️ Cập nhật một phiếu theo _id
const updateOne = async (id, payload) => {
  try {
    return await requestService.put(
      `${URL.nangsuat.nangsuat}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi updateOne nangsuat:", error);
    throw error;
  }
};

// ✏️ Cập nhật nhiều phiếu
const updateMany = async (updates = []) => {
  try {
    return await requestService.put(
      `${URL.nangsuat.nangsuat}/many`,
      { updates },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi updateMany nangsuat:", error);
    throw error;
  }
};

// 👤 Gán nhân viên cho phiếu
const assignOne = async (id, payload) => {
  try {
    // payload: { assigned_to, date_assigned, time_assigned }
    return await requestService.patch(
      `${URL.nangsuat.nangsuat}/${id}/assign`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi assignOne nangsuat:", error);
    throw error;
  }
};

// ✅ Hoàn thành phiếu
const completeOne = async (id, payload) => {
  try {
    // payload: { date_completed, time_completed, time_complete_phieu }
    return await requestService.patch(
      `${URL.nangsuat.nangsuat}/${id}/complete`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi completeOne nangsuat:", error);
    throw error;
  }
};

// ❌ Xóa một phiếu
const deleteOne = async (id) => {
  try {
    return await requestService.del(
      `${URL.nangsuat.nangsuat}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi deleteOne nangsuat:", error);
    throw error;
  }
};

// ❌ Xóa nhiều phiếu
const deleteMany = async (ids = []) => {
  try {
    return await requestService.del(
      `${URL.nangsuat.nangsuat}/many`,
      { ids },
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi deleteMany nangsuat:", error);
    throw error;
  }
};

export const nangsuatService = {
  getAll, // GET    /nangsuat?query...
  getById, // GET    /nangsuat/:id
  getByDocNumber, // GET    /nangsuat/doc/:doc_number
  addOne, // POST   /nangsuat
  addMany, // POST   /nangsuat/many
  updateOne, // PUT    /nangsuat/:id
  updateMany, // PUT    /nangsuat/many
  assignOne, // PATCH  /nangsuat/:id/assign
  completeOne, // PATCH  /nangsuat/:id/complete
  deleteOne, // DELETE /nangsuat/:id
  deleteMany, // DELETE /nangsuat/many
};
