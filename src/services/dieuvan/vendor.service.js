import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

const getAllVendors = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.dieuvan.vendor, // Cần thêm vào config: vendor: "/api/vendors"
      params,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllVendors:", error);
    throw error;
  }
};

const getVendorById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.vendor}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getVendorById:", error);
    throw error;
  }
};

const getVendorByCode = async (code) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.vendor}/code/${code}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getVendorByCode:", error);
    throw error;
  }
};

const createVendor = async (payload) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.vendor,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createVendor:", error);
    throw error;
  }
};

const createManyVendors = async (vendors) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.vendor}/bulk`,
      { vendors },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createManyVendors:", error);
    throw error;
  }
};

const updateVendor = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.vendor}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateVendor:", error);
    throw error;
  }
};

const deleteVendor = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.vendor}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteVendor:", error);
    throw error;
  }
};

const deleteManyVendors = async (ids) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.vendor}/delete-many`,
      { ids },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyVendors:", error);
    throw error;
  }
};

export const vendorService = {
  getAllVendors,
  getVendorById,
  getVendorByCode,
  createVendor,
  createManyVendors,
  updateVendor,
  deleteVendor,
  deleteManyVendors,
};
