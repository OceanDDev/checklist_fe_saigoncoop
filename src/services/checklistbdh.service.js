import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

const getCheckListBDH = async (payload) => {
  try {
    const results = await requestService.get(
      ApiServer,
      URL.checklistbdh.list,
      payload
    );
    return results;
  } catch (error) {
    console.error(error);
  }
};

// ✅ Service mới: Kiểm tra nhân viên đã submit checklist hôm nay chưa
const checkTodaySubmission = async (ma_nhan_vien, form_id) => {
  try {
    // Lấy ngày hiện tại theo múi giờ Việt Nam (YYYY-MM-DD)
    const now = new Date();
    const vietnamTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    );
    const year = vietnamTime.getFullYear();
    const month = String(vietnamTime.getMonth() + 1).padStart(2, "0");
    const day = String(vietnamTime.getDate()).padStart(2, "0");
    const todayDate = `${year}-${month}-${day}`;

    // ✅ Lấy TẤT CẢ checklist của form này
    const allResults = await requestService.get(
      `${URL.checklistbdh.list}/form/${form_id}`
    );

    if (!allResults || !Array.isArray(allResults) || allResults.length === 0) {
      return { hasSubmitted: false, todayRecord: null };
    }

    // ✅ Lọc ra checklist của nhân viên này
    const employeeResults = allResults.filter(
      (record) => record.ma_nhan_vien === ma_nhan_vien
    );

    if (employeeResults.length === 0) {
      return { hasSubmitted: false, todayRecord: null };
    }

    // ✅ Kiểm tra xem có bản ghi nào được tạo hôm nay không
    const todayRecord = employeeResults.find((record) => {
      // Thử các field có thể có: createdAt, ngay_tao, thoi_gian_tao
      const recordDate =
        record.createdAt || record.ngay_tao || record.thoi_gian_tao;

      if (!recordDate) return false;

      // Chuyển đổi sang múi giờ Việt Nam
      const recordTimestamp = new Date(recordDate);
      const recordVNTime = new Date(
        recordTimestamp.toLocaleString("en-US", {
          timeZone: "Asia/Ho_Chi_Minh",
        })
      );
      const recordDateStr = `${recordVNTime.getFullYear()}-${String(
        recordVNTime.getMonth() + 1
      ).padStart(2, "0")}-${String(recordVNTime.getDate()).padStart(2, "0")}`;

      return recordDateStr === todayDate;
    });

    return {
      hasSubmitted: !!todayRecord,
      todayRecord: todayRecord || null,
    };
  } catch (error) {
    console.error("Lỗi khi kiểm tra submission hôm nay:", error);
    return { hasSubmitted: false, todayRecord: null };
  }
};

const createCheckListBDH = async (formId, payload) => {
  try {
    const results = await requestService.post(
      `${URL.checklistbdh.create}/${formId}`,
      payload
    );
    return results;
  } catch (error) {
    console.error("Lỗi gửi checklist:", error);
    throw error;
  }
};

const getCheckListsByFormBDHId = async (formId) => {
  try {
    const result = await requestService.get(
      `${URL.checklistbdh.list}/form/${formId}`
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByFormId:", error);
    throw error;
  }
};

const getCheckListsByStatus = async (status) => {
  try {
    const result = await requestService.get(
      `${URL.checklistbdh.list}/status/${status}`
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByStatus:", error);
    throw error;
  }
};

const getCheckListsByQuyDinh = async (loai, ngay = null) => {
  try {
    let url = `${URL.checklistbdh.list}/quydinh/${loai}`;
    if (ngay) {
      url += `?ngay=${ngay}`;
    }
    const result = await requestService.get(url);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getCheckListsByQuyDinh:", error);
    throw error;
  }
};

const getByIdCheckList = async (id) => {
  try {
    const path = `${URL.checklistbdh.create}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi getByIdCheckList:", error);
    throw error;
  }
};

const deleteByIdCheckList = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.checklistbdh.create}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi deleteCheckList:", error);
    throw error;
  }
};

const updateCheckList = async (id, payload) => {
  try {
    const result = await requestService.put(
      `${URL.checklistbdh.create}/${id}`,
      payload
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi gọi updateCheckList:", error);
    throw error;
  }
};

const updateQuyDinhCongViec = async (
  checklistId,
  mucIndex,
  congViecIndex,
  payload
) => {
  try {
    const result = await requestService.put(
      `${URL.checklistbdh.create}/${checklistId}/muc/${mucIndex}/congviec/${congViecIndex}/quydinh`,
      payload
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi cập nhật quy định:", error);
    throw error;
  }
};

const addChiTietToCongViec = async (
  checklistId,
  mucIndex,
  congViecIndex,
  payload
) => {
  try {
    const result = await requestService.post(
      `${URL.checklistbdh.create}/${checklistId}/muc/${mucIndex}/congviec/${congViecIndex}/chitiet`,
      payload
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi thêm chi tiết:", error);
    throw error;
  }
};

const updateChiTietStatus = async (
  checklistId,
  mucIndex,
  congViecIndex,
  chiTietIndex,
  payload
) => {
  try {
    const result = await requestService.patch(
      `${URL.checklistbdh.create}/${checklistId}/muc/${mucIndex}/congviec/${congViecIndex}/chitiet/${chiTietIndex}`,
      payload
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi cập nhật chi tiết:", error);
    throw error;
  }
};

const deleteChiTiet = async (
  checklistId,
  mucIndex,
  congViecIndex,
  chiTietIndex
) => {
  try {
    const result = await requestService.del(
      `${URL.checklistbdh.create}/${checklistId}/muc/${mucIndex}/congviec/${congViecIndex}/chitiet/${chiTietIndex}`,
      undefined,
      ApiServer
    );
    return result;
  } catch (error) {
    console.error("Lỗi khi xóa chi tiết:", error);
    throw error;
  }
};

export const checkListBDHService = {
  getCheckListBDH,
  checkTodaySubmission, // ✅ Service mới
  createCheckListBDH,
  getByIdCheckList,
  getCheckListsByFormBDHId,
  getCheckListsByStatus,
  getCheckListsByQuyDinh,
  deleteByIdCheckList,
  updateCheckList,
  updateQuyDinhCongViec,
  addChiTietToCongViec,
  updateChiTietStatus,
  deleteChiTiet,
};
