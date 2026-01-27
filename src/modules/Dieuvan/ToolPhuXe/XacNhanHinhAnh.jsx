/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import { Button, Modal, message, Image } from "antd";
import { CheckOutlined, CameraOutlined } from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";

// ✅ Helper function - Cloudinary trả URL đầy đủ
const getImageUrl = (imagePath) => {
  if (!imagePath) return "";

  // ✅ Cloudinary URL luôn bắt đầu bằng https://
  if (imagePath.startsWith("https://")) {
    return imagePath;
  }

  // ⚠️ Fallback cho data cũ (local storage)
  const baseUrl = (import.meta.env.VITE_API || "").replace(/\/$/, "");
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

const XacNhanHinhAnh = ({ record, onSuccess }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // ✅ Chỉ 1 ảnh
  const [previewImage, setPreviewImage] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleOpenModal = () => {
    setModalVisible(true);
    setCapturedImage(null);

    if (record.hinh_anh) {
      const imageUrl = getImageUrl(record.hinh_anh);
      setPreviewImage(imageUrl);
      console.log("📷 Existing image URL:", imageUrl);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCapturedImage(null);
  };

  // ✅ Mở camera
  const handleOpenCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        message.error("Trình duyệt không hỗ trợ camera!");
        return;
      }

      setCameraModalVisible(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Camera sau
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("❌ Lỗi mở camera:", error);

      if (error.name === "NotAllowedError") {
        message.error("Bạn cần cấp quyền truy cập camera!");
      } else if (error.name === "NotFoundError") {
        message.error("Không tìm thấy camera!");
      } else {
        message.error(`Lỗi camera: ${error.message}`);
      }

      setCameraModalVisible(false);
    }
  };

  // ✅ Đóng camera
  const handleCloseCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraModalVisible(false);
  };

  // ✅ Chụp ảnh
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      message.error("Camera chưa sẵn sàng!");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          message.error("Không thể chụp ảnh!");
          return;
        }

        const file = new File([blob], `phuxe_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        const previewUrl = URL.createObjectURL(blob);

        setCapturedImage({
          file: file,
          preview: previewUrl,
          name: file.name,
        });

        message.success("Đã chụp ảnh thành công!");
        handleCloseCamera();
      },
      "image/jpeg",
      0.9 // Quality 90%
    );
  };

  // ✅ Xóa ảnh vừa chụp
  const handleRemoveImage = () => {
    if (capturedImage?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(capturedImage.preview);
    }
    setCapturedImage(null);
    message.info("Đã xóa ảnh");
  };

  // ✅ Xem trước ảnh
  const handlePreviewImage = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  // ✅ Submit upload ảnh
  const handleSubmit = async () => {
    if (!capturedImage && !record.hinh_anh) {
      message.warning("Vui lòng chụp hình ảnh!");
      return;
    }

    if (!capturedImage) {
      message.info("Không có ảnh mới để upload");
      handleCloseModal();
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("hinh_anh", capturedImage.file); // ✅ Key phải là "hinh_anh"

      console.log("📤 Uploading image for record:", record._id);
      console.log("📷 File name:", capturedImage.file.name);
      console.log(
        "📷 File size:",
        (capturedImage.file.size / 1024).toFixed(2),
        "KB"
      );

      const result = await phuXeService.updatePhuXe(record._id, formData);

      console.log("📥 API Response:", result);

      if (result?.hinh_anh) {
        message.success("Upload ảnh thành công!");
        console.log("✅ New Cloudinary URL:", result.hinh_anh);

        // Cleanup blob URL
        if (capturedImage.preview.startsWith("blob:")) {
          URL.revokeObjectURL(capturedImage.preview);
        }

        handleCloseModal();

        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.warning("Upload thành công nhưng chưa có URL!");
        console.warn("⚠️ Response thiếu field 'hinh_anh':", result);
      }
    } catch (error) {
      console.error("❌ Lỗi upload:", error);

      // ✅ Xử lý lỗi storage đầy
      if (error.message?.includes("lưu trữ đã đầy")) {
        message.error(
          "Hệ thống lưu trữ đã đầy. Vui lòng liên hệ quản trị viên!"
        );
      } else {
        message.error(
          `Upload thất bại: ${error.message || "Lỗi không xác định"}`
        );
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* 📱 Button Xác Nhận */}
      <Button
        type="primary"
        icon={<CheckOutlined className="text-xs sm:text-sm" />}
        size="small"
        onClick={handleOpenModal}
        style={{
          backgroundColor: record.hinh_anh ? "#52c41a" : "#1890ff",
          borderColor: record.hinh_anh ? "#52c41a" : "#1890ff",
        }}
        className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
      >
        <span className="hidden sm:inline">
          {record.hinh_anh ? "Đã Xác Nhận" : "Xác Nhận"}
        </span>
        <span className="sm:hidden">{record.hinh_anh ? "✓" : "XN"}</span>
      </Button>

      {/* 📱 Modal Chính */}
      <Modal
        title={
          <span className="text-sm sm:text-lg font-semibold">
            Xác Nhận Hình Ảnh - {record.ten_cua_hang || "N/A"}
          </span>
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button
            key="cancel"
            onClick={handleCloseModal}
            className="text-xs sm:text-sm"
            disabled={uploading}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CheckOutlined />}
            loading={uploading}
            onClick={handleSubmit}
            disabled={!capturedImage && !record.hinh_anh}
            className="text-xs sm:text-sm"
          >
            {uploading ? "Đang tải..." : "Xác Nhận"}
          </Button>,
        ]}
        width="95vw"
        style={{ maxWidth: 700 }}
        className="top-4 sm:top-20"
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Thông tin phụ xe */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="font-semibold">Khung giờ:</span>{" "}
                {record.khung_gio || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Tài xế:</span>{" "}
                {record.ten_tai_xe || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Biển số:</span>{" "}
                {record.bien_so_xe || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Phụ xe:</span>{" "}
                {record.dieu_van_xac_nhan || "Chưa có"}
              </div>
            </div>
          </div>

          {/* Hình ảnh hiện tại (nếu có) */}
          {record.hinh_anh && (
            <div>
              <div className="font-semibold mb-2 flex items-center gap-2 text-xs sm:text-sm">
                Hình ảnh hiện tại:
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Đã có ảnh
                </span>
              </div>
              <div className="border rounded p-2 bg-gray-50">
                <Image
                  src={getImageUrl(record.hinh_anh)}
                  alt="Hình ảnh hiện tại"
                  style={{
                    maxWidth: "100%",
                    maxHeight: window.innerWidth < 640 ? "200px" : "300px",
                    objectFit: "contain",
                  }}
                  fallback={
                    <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-gray-400">
                      <CameraOutlined style={{ fontSize: 48 }} />
                      <p className="mt-2 text-xs sm:text-sm">
                        Không thể tải ảnh
                      </p>
                    </div>
                  }
                  onError={() => {
                    console.error("❌ Image load error:", record.hinh_anh);
                  }}
                />
              </div>

              {/* Thời gian xong chuyến */}
              {record.thoi_gian_xong_chuyen && (
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
                  <span className="font-semibold">Giờ xong chuyến:</span>{" "}
                  {new Date(record.thoi_gian_xong_chuyen).toLocaleString(
                    "vi-VN",
                    {
                      timeZone: "Asia/Ho_Chi_Minh",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chụp ảnh mới */}
          <div>
            <div className="font-semibold mb-2 text-xs sm:text-sm">
              {record.hinh_anh ? "Chụp lại ảnh:" : "Chụp ảnh:"}
            </div>

            <Button
              type="dashed"
              icon={<CameraOutlined />}
              onClick={handleOpenCamera}
              size="large"
              block
              className="mb-3 sm:mb-4 text-xs sm:text-base"
              disabled={uploading}
            >
              <span className="hidden sm:inline">Mở Camera và Chụp Ảnh</span>
              <span className="sm:hidden">Chụp Ảnh</span>
            </Button>

            {/* Ảnh vừa chụp */}
            {capturedImage && (
              <div>
                <div className="text-xs sm:text-sm text-green-600 mb-2 font-semibold">
                  ✓ Đã chụp ảnh mới
                </div>
                <div className="relative group border rounded-lg overflow-hidden">
                  <img
                    src={capturedImage.preview}
                    alt="Ảnh vừa chụp"
                    className="w-full h-48 sm:h-64 object-contain bg-gray-100 cursor-pointer"
                    onClick={() => handlePreviewImage(capturedImage.preview)}
                  />
                  <Button
                    danger
                    size="small"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                  >
                    Xóa
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {capturedImage.name} -{" "}
                  {(capturedImage.file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ✅ Camera Modal */}
      <Modal
        title={
          <span className="text-sm sm:text-lg font-semibold">📸 Chụp Ảnh</span>
        }
        open={cameraModalVisible}
        onCancel={handleCloseCamera}
        footer={[
          <Button key="cancel" onClick={handleCloseCamera}>
            Hủy
          </Button>,
          <Button
            key="capture"
            type="primary"
            icon={<CameraOutlined />}
            onClick={handleCapturePhoto}
          >
            Chụp
          </Button>,
        ]}
        width="95vw"
        style={{ maxWidth: 800 }}
        className="top-4 sm:top-20"
        centered
      >
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ maxHeight: "70vh" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Nút chụp dưới video */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<CameraOutlined />}
              onClick={handleCapturePhoto}
              className="w-16 h-16 shadow-lg"
              style={{
                backgroundColor: "#fff",
                borderColor: "#fff",
                color: "#000",
              }}
            />
          </div>
        </div>
      </Modal>

      {/* 🖼️ Preview Modal */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="95vw"
        style={{ maxWidth: 900 }}
        className="top-4 sm:top-20"
        centered
      >
        <img
          alt="preview"
          style={{ width: "100%", maxHeight: "85vh", objectFit: "contain" }}
          src={previewImage}
        />
      </Modal>
    </>
  );
};

export default XacNhanHinhAnh;
