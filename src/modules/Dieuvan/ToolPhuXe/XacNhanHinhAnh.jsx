/* eslint-disable react/prop-types */
import { useState, useRef } from "react";
import { Button, Modal, message, Image } from "antd";
import { CheckOutlined, CameraOutlined } from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";

// ✅ Helper function ĐƠN GIẢN HÓA - Backend đã trả URL đầy đủ
const getImageUrl = (imagePath) => {
  if (!imagePath) return "";

  // ✅ Nếu đã là URL đầy đủ (từ backend mới) → dùng luôn
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // ⚠️ Fallback cho data cũ (chỉ có path tương đối)
  const baseUrl = (import.meta.env.VITE_API || "").replace(/\/$/, "");
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

const XacNhanHinhAnh = ({ record, onSuccess }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleOpenModal = () => {
    setModalVisible(true);
    setCapturedImages([]);

    if (record.hinh_anh) {
      const imageUrl = getImageUrl(record.hinh_anh);
      setPreviewImage(imageUrl);
      console.log("📷 Existing image URL:", imageUrl);
      console.log("📷 Raw hinh_anh from record:", record.hinh_anh);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCapturedImages([]);
  };

  // ✅ Mở camera trực tiếp bằng getUserMedia
  const handleOpenCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        message.error("Trình duyệt không hỗ trợ camera!");
        return;
      }

      setCameraModalVisible(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Camera sau (mobile)
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
      console.error("Lỗi khi mở camera:", error);
      if (error.name === "NotAllowedError") {
        message.error("Bạn cần cấp quyền truy cập camera!");
      } else if (error.name === "NotFoundError") {
        message.error("Không tìm thấy camera trên thiết bị!");
      } else {
        message.error("Không thể mở camera: " + error.message);
      }
      setCameraModalVisible(false);
    }
  };

  // ✅ Đóng camera và dừng stream
  const handleCloseCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraModalVisible(false);
  };

  // ✅ Chụp ảnh từ video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          message.error("Không thể chụp ảnh!");
          return;
        }

        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        const previewUrl = URL.createObjectURL(blob);

        const newImage = {
          file: file,
          preview: previewUrl,
          name: file.name,
        };

        setCapturedImages((prev) => [...prev, newImage]);
        message.success("Đã chụp ảnh thành công!");

        handleCloseCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  const handleRemoveImage = (index) => {
    const image = capturedImages[index];
    if (image.preview.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
    message.info("Đã xóa ảnh");
  };

  const handlePreviewImage = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const handleSubmit = async () => {
    if (capturedImages.length === 0 && !record.hinh_anh) {
      message.warning("Vui lòng chụp ít nhất một hình ảnh!");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      capturedImages.forEach((image) => {
        formData.append("images", image.file);
      });

      console.log("📤 Uploading images for record:", record._id);
      console.log("📷 Number of images:", capturedImages.length);

      const result = await phuXeService.updatePhuXeWithImages(
        record._id,
        formData
      );

      console.log("📥 API Response:", result);

      if (result) {
        if (result.hinh_anh) {
          message.success("Xác nhận hình ảnh thành công!");
          console.log("✅ New image URL from server:", result.hinh_anh);
        } else {
          message.warning("Upload thành công nhưng chưa có URL hình ảnh!");
          console.warn("⚠️ Response không có field 'hinh_anh':", result);
        }

        // Cleanup preview URLs
        capturedImages.forEach((image) => {
          if (image.preview.startsWith("blob:")) {
            URL.revokeObjectURL(image.preview);
          }
        });

        handleCloseModal();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận hình ảnh:", error);
      console.error("Error details:", error.response?.data || error.message);
      message.error(
        `Không thể xác nhận hình ảnh: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* 📱 Responsive Button */}
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

      {/* 📱 Responsive Modal */}
      <Modal
        title={
          <span className="text-sm sm:text-lg font-semibold">
            Xác Nhận Hình Ảnh - {record.ten_cua_hang}
          </span>
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button
            key="cancel"
            onClick={handleCloseModal}
            className="text-xs sm:text-sm"
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CheckOutlined />}
            loading={uploading}
            onClick={handleSubmit}
            disabled={capturedImages.length === 0 && !record.hinh_anh}
            className="text-xs sm:text-sm"
          >
            Xác Nhận
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
                {record.khung_gio}
              </div>
              <div>
                <span className="font-semibold">Tài xế:</span>{" "}
                {record.ten_tai_xe}
              </div>
              <div>
                <span className="font-semibold">Biển số:</span>{" "}
                {record.bien_so_xe}
              </div>
              <div>
                <span className="font-semibold">Phụ xe:</span>{" "}
                {record.dieu_van_xac_nhan || "Chưa có"}
              </div>
            </div>
          </div>

          {/* Hình ảnh hiện tại */}
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
                      <CameraOutlined
                        style={{ fontSize: window.innerWidth < 640 ? 32 : 48 }}
                      />
                      <p className="mt-2 text-xs sm:text-sm">
                        Không thể tải ảnh
                      </p>
                      <p className="text-xs mt-1 break-all text-red-500">
                        {record.hinh_anh}
                      </p>
                    </div>
                  }
                  onError={(e) => {
                    console.error("❌ Image load error:", record.hinh_anh);
                    console.error("Full URL:", getImageUrl(record.hinh_anh));
                    console.error("Image element:", e.target);
                  }}
                />
              </div>
            </div>
          )}

          {/* Chụp ảnh hoặc Thông tin xác nhận */}
          <div>
            {record.hinh_anh && record.thoi_gian_xong_chuyen ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                <div className="font-semibold mb-2 text-xs sm:text-sm text-green-700 flex items-center gap-2">
                  <CheckOutlined />
                  Giờ xong chuyến:
                </div>
                <div className="text-sm sm:text-base text-gray-700">
                  {new Date(record.thoi_gian_xong_chuyen).toLocaleString(
                    "vi-VN",
                    {
                      timeZone: "Asia/Ho_Chi_Minh",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    }
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="font-semibold mb-2 text-xs sm:text-sm">
                  Chụp ảnh:
                </div>

                <Button
                  type="dashed"
                  icon={<CameraOutlined />}
                  onClick={handleOpenCamera}
                  size="large"
                  block
                  className="mb-3 sm:mb-4 text-xs sm:text-base"
                >
                  <span className="hidden sm:inline">
                    Mở Camera và Chụp Ảnh
                  </span>
                  <span className="sm:hidden">Chụp Ảnh</span>
                </Button>

                {capturedImages.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600 mb-2">
                      Đã chụp {capturedImages.length} ảnh
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {capturedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.preview}
                            alt={`Captured ${index + 1}`}
                            className="w-full h-24 sm:h-32 object-cover rounded cursor-pointer"
                            onClick={() => handlePreviewImage(image.preview)}
                          />
                          <Button
                            danger
                            size="small"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            onClick={() => handleRemoveImage(index)}
                          >
                            Xóa
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* ✅ Camera Modal */}
      <Modal
        title="Chụp Ảnh"
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
            className="w-full h-auto"
            style={{ maxHeight: "70vh" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Camera overlay UI */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<CameraOutlined />}
              onClick={handleCapturePhoto}
              className="w-16 h-16"
              style={{
                backgroundColor: "#fff",
                borderColor: "#fff",
                color: "#000",
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="95vw"
        style={{ maxWidth: 800 }}
        className="top-4 sm:top-20"
      >
        <img alt="preview" style={{ width: "100%" }} src={previewImage} />
      </Modal>
    </>
  );
};

export default XacNhanHinhAnh;