/* eslint-disable no-unused-vars */
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ==================== PRODUCT SERVICE ====================

// GET ALL với phân trang, tìm kiếm theo SKU hoặc UPC
const getAllProducts = async (params = {}) => {
  try {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50,
      upc: params.upc || undefined,
      sku: params.sku || undefined,
      search: params.search || undefined,
    };

    // Lọc bỏ các tham số undefined trước khi gửi đi
    const filteredParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, v]) => v !== undefined)
    );

    const results = await requestService.get(
      URL.dieuvan.product,
      filteredParams,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllProducts:", error);
    throw error;
  }
};

const getProductById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.product}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getProductById:", error);
    throw error;
  }
};

// SỬA LẠI: Thay vì dùng endpoint riêng, dùng query params
const getProductBySKU = async (sku) => {
  try {
    // Thử cách 1: Dùng query params (khuyến nghị)
    const results = await requestService.get(
      URL.dieuvan.product,
      { sku, limit: 1 }, // Tìm theo SKU với limit 1
      undefined,
      ApiServer
    );
    
    // Nếu backend trả về array, lấy phần tử đầu tiên
    if (Array.isArray(results)) {
      return results.length > 0 ? results[0] : null;
    }
    
    // Nếu backend trả về object có data
    if (results?.data && Array.isArray(results.data)) {
      return results.data.length > 0 ? results.data[0] : null;
    }
    
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getProductBySKU:", error);
    
    // Nếu endpoint /sku/:sku tồn tại, uncomment dòng dưới:
    // try {
    //   const results = await requestService.get(
    //     `${URL.dieuvan.product}/sku/${sku}`,
    //     {},
    //     undefined,
    //     ApiServer
    //   );
    //   return results;
    // } catch (err) {
    //   console.error("Lỗi khi gọi endpoint /sku:", err);
    //   throw err;
    // }
    
    throw error;
  }
};

// SỬA LẠI: Tương tự như getProductBySKU
const getProductByUPC = async (upc) => {
  try {
    // Thử cách 1: Dùng query params (khuyến nghị)
    const results = await requestService.get(
      URL.dieuvan.product,
      { upc, limit: 1 }, // Tìm theo UPC với limit 1
      undefined,
      ApiServer
    );
    
    // Nếu backend trả về array, lấy phần tử đầu tiên
    if (Array.isArray(results)) {
      return results.length > 0 ? results[0] : null;
    }
    
    // Nếu backend trả về object có data
    if (results?.data && Array.isArray(results.data)) {
      return results.data.length > 0 ? results.data[0] : null;
    }
    
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getProductByUPC:", error);
    
    // Nếu endpoint /upc/:upc tồn tại, uncomment dòng dưới:
    // try {
    //   const results = await requestService.get(
    //     `${URL.dieuvan.product}/upc/${upc}`,
    //     {},
    //     undefined,
    //     ApiServer
    //   );
    //   return results;
    // } catch (err) {
    //   console.error("Lỗi khi gọi endpoint /upc:", err);
    //   throw err;
    // }
    
    throw error;
  }
};

const createProduct = async (payload) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.product,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createProduct:", error);
    throw error;
  }
};

// CREATE MANY - Đơn giản hóa, để backend xử lý
const createManyProducts = async (products) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.product}/bulk`,
      { products },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createManyProducts:", error);
    throw error;
  }
};

const updateProduct = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.product}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateProduct:", error);
    throw error;
  }
};

const deleteProduct = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.product}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteProduct:", error);
    throw error;
  }
};

const deleteManyProducts = async (ids) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.product}/delete-many`,
      { ids },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyProducts:", error);
    throw error;
  }
};

// THÊM: Hàm helper để search products linh hoạt
const searchProducts = async (searchTerm) => {
  try {
    // Tìm kiếm chung
    const results = await requestService.get(
      URL.dieuvan.product,
      { search: searchTerm, limit: 20 },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi searchProducts:", error);
    throw error;
  }
};

export const productService = {
  getAllProducts,
  getProductById,
  getProductBySKU,
  getProductByUPC,
  createProduct,
  createManyProducts,
  updateProduct,
  deleteProduct,
  deleteManyProducts,
  searchProducts, // Thêm function mới
};