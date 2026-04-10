// File: src/utils/device.js

export const getDeviceId = () => {
  // Đặt một cái tên key đặc trưng cho dự án của bạn
  const DEVICE_KEY = "sc_logistics_device_id";

  // 1. Mở localStorage tìm xem máy này đã từng được cấp ID chưa
  let deviceId = localStorage.getItem(DEVICE_KEY);

  // 2. Nếu chưa có (người dùng mới mở web lần đầu, hoặc vừa xóa lịch sử/cache)
  if (!deviceId) {
    // Tạo một mã UUID ngẫu nhiên. Trình duyệt đời mới hỗ trợ hàm crypto.randomUUID() rất chuẩn.
    if (window.crypto && window.crypto.randomUUID) {
      deviceId = window.crypto.randomUUID();
    } else {
      // Dự phòng cho các trình duyệt quá cũ không có hàm trên
      deviceId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substring(2);
    }
    
    // 3. Khắc chết cái ID này vào localStorage để ngày mai họ mở lên vẫn là ID này
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  // Trả về ID (đảm bảo máy A luôn ra 1 mã, máy B luôn ra 1 mã khác biệt)
  return deviceId;
};