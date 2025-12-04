/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { ttbService } from "@/services/ttb.service";
import {
  Button,
  Space,
  message,
  Card,
  Modal,
  Form,
  Input,
  InputNumber,
} from "antd";
import {
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Cấu hình timezone Việt Nam
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

// Import components
import TTBTableRow from "./TTBTableRow";
import TTBSearch from "./TTBSearch";
import TTBImportModal from "./TTBImportModal";
import TTBReportDetail from "./TTBReportDetail";
import { cuaHangService } from "@/services/dieuvan/cuahang.service";

const HomeTTB = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cuaHangList, setCuaHangList] = useState([]);
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);

  // State lưu search params hiện tại
  const [currentSearchParams, setCurrentSearchParams] = useState({});

  // State cho sort
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' hoặc 'desc'

  // State cho view report detail
  const [isReportView, setIsReportView] = useState(false);

  // State cho modal thêm thiết bị
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [thietBiList, setThietBiList] = useState([]);
  const [addDeviceForm] = Form.useForm();

  // Lấy danh sách TTB với search params
  const fetchData = async (searchParams = {}) => {
    setLoading(true);
    setDataLoaded(false);
    try {
      const response = await ttbService.getAllTtb(searchParams);
      if (response?.success) {
        let dataList = response.data || [];
        
        // Sort dữ liệu theo ngày
        dataList = sortDataByDate(dataList, sortOrder);
        
        setData(dataList);
        setDataLoaded(true);
      }
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách cửa hàng
  const fetchCuaHang = async () => {
    try {
      const response = await cuaHangService.getAllCuaHang();
      if (response?.success) {
        setCuaHangList(response.data || []);
      }
    } catch (error) {
      console.error("Không thể tải danh sách cửa hàng");
    }
  };

  // Lấy danh sách thiết bị
  const fetchThietBi = async () => {
    try {
      const response = await ttbService.getAllThietBi();
      if (response?.success) {
        setThietBiList(response.data || []);
      }
    } catch (error) {
      console.error("Không thể tải danh sách thiết bị");
    }
  };

  // Hàm sort dữ liệu theo ngày
  const sortDataByDate = (dataList, order) => {
    return [...dataList].sort((a, b) => {
      const dateA = dayjs(a.day.ngay_di);
      const dateB = dayjs(b.day.ngay_di);
      
      if (order === "desc") {
        return dateB.diff(dateA); // Ngày lớn đến nhỏ (mới nhất trước)
      } else {
        return dateA.diff(dateB); // Ngày nhỏ đến lớn (cũ nhất trước)
      }
    });
  };

  // Xử lý thay đổi sort order
  const handleSortChange = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);
    
    // Sort lại data hiện tại
    const sortedData = sortDataByDate(data, newOrder);
    setData(sortedData);
  };

  // Chuyển sang trang báo cáo chi tiết
  const handleViewReport = () => {
    setIsReportView(true);
  };

  // Quay lại danh sách
  const handleBackToList = () => {
    setIsReportView(false);
  };

  useEffect(() => {
    // Load danh sách cửa hàng và thiết bị
    fetchCuaHang();
    fetchThietBi();
  }, []);

  // Tự động filter theo tháng hiện tại khi component mount
  useEffect(() => {
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const startOfMonth = now.startOf("month");
    const endOfMonth = now.endOf("month");
    
    const defaultParams = {
      page: 1,
      limit: 999999,
      date_range: [startOfMonth, endOfMonth]
    };
    
    setCurrentSearchParams(defaultParams);
    fetchData(defaultParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xử lý tìm kiếm - gọi API với params mới
  const handleSearch = (searchValues) => {
    const searchParams = {
      page: 1,
      limit: 999999,
      ...searchValues
    };
    
    setCurrentSearchParams(searchParams);
    fetchData(searchParams);
  };

  // Reset tìm kiếm - về tháng hiện tại
  const handleReset = () => {
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const startOfMonth = now.startOf("month");
    const endOfMonth = now.endOf("month");
    
    const defaultParams = {
      page: 1,
      limit: 999999,
      date_range: [startOfMonth, endOfMonth]
    };
    
    setCurrentSearchParams(defaultParams);
    fetchData(defaultParams);
  };

  // Mở modal import
  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  // Đóng modal import
  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
  };

  // Xử lý sau khi import thành công
  const handleImportSuccess = () => {
    // Refresh lại data với search params hiện tại
    fetchData(currentSearchParams);
  };

  // Xóa TTB
  const handleDelete = async (id) => {
    try {
      const response = await ttbService.deleteTtb(id);
      if (response?.success) {
        message.success("Xóa thành công");
        // Refresh lại data với search params hiện tại
        fetchData(currentSearchParams);
      } else {
        message.error("Xóa thất bại");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra");
    }
  };

  // Bật chế độ chỉnh sửa tổng
  const handleGlobalEdit = () => {
    setIsGlobalEditMode(true);
  };

  // Hủy chế độ chỉnh sửa tổng
  const handleCancelGlobalEdit = () => {
    setIsGlobalEditMode(false);
  };

  // Lưu tất cả thay đổi
  const handleSaveAll = async () => {
    try {
      message.loading({ content: "Đang lưu...", key: "saving" });

      // Trigger save event để các row component chuẩn bị data
      const saveEvent = new CustomEvent("ttb-save-all");
      window.dispatchEvent(saveEvent);

      // Đợi một chút để các component chuẩn bị data
      await new Promise((resolve) => setTimeout(resolve, 100));

      setIsGlobalEditMode(false);
      message.success({ content: "Đã lưu tất cả thay đổi", key: "saving" });

      // Refresh data sau khi lưu với search params hiện tại
      await fetchData(currentSearchParams);
    } catch (error) {
      message.error({ content: "Có lỗi xảy ra khi lưu", key: "saving" });
      console.error(error);
    }
  };

  // Mở modal thêm thiết bị
  const handleOpenAddDeviceModal = () => {
    setIsAddDeviceModalOpen(true);
    addDeviceForm.resetFields();
  };

  // Đóng modal thêm thiết bị
  const handleCloseAddDeviceModal = () => {
    setIsAddDeviceModalOpen(false);
    addDeviceForm.resetFields();
  };

  // Xử lý thêm thiết bị mới
  const handleAddDevice = async () => {
    try {
      const values = await addDeviceForm.validateFields();

      message.loading({ content: "Đang thêm thiết bị...", key: "addDevice" });

      const response = await ttbService.addThietBi({
        ten_thiet_bi: values.ten_thiet_bi,
        mo_ta: values.mo_ta,
        thu_tu: values.thu_tu || 0,
      });

      if (response?.success) {
        message.success({
          content: "Thêm thiết bị thành công",
          key: "addDevice",
        });
        handleCloseAddDeviceModal();

        // Reload danh sách thiết bị và data
        await fetchThietBi();
        await fetchData(currentSearchParams);
      } else {
        message.error({
          content: response?.message || "Thêm thiết bị thất bại",
          key: "addDevice",
        });
      }
    } catch (error) {
      if (error.errorFields) {
        message.warning({
          content: "Vui lòng điền đầy đủ thông tin",
          key: "addDevice",
        });
      } else {
        message.error({
          content: "Có lỗi xảy ra khi thêm thiết bị",
          key: "addDevice",
        });
      }
    }
  };

  // Lấy danh sách thiết bị để hiển thị cột (sắp xếp theo thứ tự)
  const getSortedThietBiList = () => {
    return [...thietBiList].sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));
  };

  // Tính tổng cho từng cột thiết bị
  const calculateColumnTotals = (tenThietBi) => {
    let diCh = 0;
    let chTraVe = 0;

    data.forEach((record) => {
      const ttb = record.ttb?.find((t) => t.ten_ttb === tenThietBi);
      if (ttb) {
        diCh += ttb.di_ch || 0;
        chTraVe += ttb.ch_tra_ve || 0;
      }
    });

    const canTru = diCh - chTraVe;

    return { diCh, chTraVe, canTru };
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Hiển thị trang báo cáo chi tiết nếu đang ở chế độ xem báo cáo */}
      {isReportView ? (
        <TTBReportDetail onBack={handleBackToList} />
      ) : (
        <>
          {/* Search Component */}
          <TTBSearch
            cuaHangList={cuaHangList}
            onSearch={handleSearch}
            onReset={handleReset}
            dataLoaded={dataLoaded}
          />

      {/* Table Card */}
      <Card
        bordered={false}
        style={{
          boxShadow:
            "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
        }}
      >
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={handleViewReport}
            disabled={isGlobalEditMode}
            style={{ backgroundColor: "#722ed1", borderColor: "#722ed1" }}
          >
            CHI TIẾT
          </Button>

          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleOpenImportModal}
            disabled={isGlobalEditMode}
          >
            Import dữ liệu
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddDeviceModal}
            disabled={isGlobalEditMode}
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          >
            Thêm thiết bị
          </Button>

          <Button
            icon={sortOrder === "desc" ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
            onClick={handleSortChange}
            disabled={isGlobalEditMode}
            style={{ 
              borderColor: "#faad14",
              color: "#faad14"
            }}
          >
            {sortOrder === "desc" ? "Ngày mới nhất" : "Ngày cũ nhất"}
          </Button>

          {!isGlobalEditMode ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleGlobalEdit}
              style={{ backgroundColor: "#faad14", borderColor: "#faad14" }}
            >
              Chỉnh sửa tất cả
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveAll}
              >
                Lưu tất cả
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelGlobalEdit}>
                Hủy
              </Button>
              <span
                style={{ marginLeft: 8, color: "#1890ff", fontWeight: 500 }}
              >
                💡 Sử dụng Tab, Enter, phím mũi tên để di chuyển nhanh
              </span>
            </>
          )}
        </Space>

        <div
          style={{
            overflowX: "auto",
            position: "relative",
            borderRadius: "8px",
            border: "1px solid #f0f0f0",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              tableLayout: "auto",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#fafafa" }}>
                <th
                  rowSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    minWidth: "60px",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fafafa",
                    zIndex: 3,
                    fontWeight: 600,
                  }}
                >
                  STT
                </th>
                <th
                  colSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    position: "sticky",
                    left: "60px",
                    backgroundColor: "#fafafa",
                    zIndex: 3,
                    fontWeight: 600,
                  }}
                >
                  NGÀY
                </th>
                <th
                  rowSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    minWidth: "120px",
                    position: "sticky",
                    left: "260px",
                    backgroundColor: "#fafafa",
                    zIndex: 3,
                    fontWeight: 600,
                  }}
                >
                  SỐ BB
                </th>
                <th
                  colSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    position: "sticky",
                    left: "380px",
                    backgroundColor: "#fafafa",
                    zIndex: 3,
                    fontWeight: 600,
                  }}
                >
                  CỬA HÀNG
                </th>
                <th
                  rowSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    minWidth: "150px",
                    fontWeight: 600,
                  }}
                >
                  TÀI XẾ
                </th>
                <th
                  rowSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    minWidth: "120px",
                    fontWeight: 600,
                  }}
                >
                  BIỂN SỐ XE
                </th>

                {/* Render động các cột thiết bị */}
                {getSortedThietBiList().map((thietBi, index) => (
                  <th
                    key={thietBi._id}
                    colSpan={3}
                    style={{
                      border: "1px solid #e8e8e8",
                      padding: "12px 8px",
                      backgroundColor: `hsl(${index * 40}, 70%, 95%)`,
                      fontWeight: 600,
                    }}
                  >
                    {thietBi.ten_thiet_bi}
                  </th>
                ))}

                <th
                  rowSpan={2}
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "12px 8px",
                    minWidth: "150px",
                    fontWeight: 600,
                  }}
                >
                  GHI CHÚ
                </th>
                {!isGlobalEditMode && (
                  <th
                    rowSpan={2}
                    style={{
                      border: "1px solid #e8e8e8",
                      padding: "12px 8px",
                      minWidth: "120px",
                      backgroundColor: "#fff1f0",
                      fontWeight: 600,
                    }}
                  >
                    THAO TÁC
                  </th>
                )}
              </tr>
              <tr style={{ backgroundColor: "#fafafa" }}>
                <th
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "10px 8px",
                    minWidth: "100px",
                    position: "sticky",
                    left: "60px",
                    backgroundColor: "#fafafa",
                    zIndex: 2,
                    fontSize: "12px",
                  }}
                >
                  ĐI
                </th>
                <th
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "10px 8px",
                    minWidth: "100px",
                    position: "sticky",
                    left: "160px",
                    backgroundColor: "#fafafa",
                    zIndex: 2,
                    fontSize: "12px",
                  }}
                >
                  VỀ
                </th>
                <th
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "10px 8px",
                    minWidth: "100px",
                    position: "sticky",
                    left: "380px",
                    backgroundColor: "#fafafa",
                    zIndex: 2,
                    fontSize: "12px",
                  }}
                >
                  Mã CH
                </th>
                <th
                  style={{
                    border: "1px solid #e8e8e8",
                    padding: "10px 8px",
                    minWidth: "200px",
                    position: "sticky",
                    left: "480px",
                    backgroundColor: "#fafafa",
                    zIndex: 2,
                    fontSize: "12px",
                  }}
                >
                  Tên CH
                </th>

                {/* Render động các sub-header cho thiết bị */}
                {getSortedThietBiList().map((thietBi, index) => {
                  const totals = calculateColumnTotals(thietBi.ten_thiet_bi);
                  return (
                    <>
                      <th
                        key={`${thietBi._id}-di`}
                        style={{
                          border: "1px solid #e8e8e8",
                          padding: "6px 8px",
                          minWidth: "80px",
                          backgroundColor: `hsl(${index * 40}, 70%, 95%)`,
                          fontSize: "12px",
                        }}
                      >
                        <div>ĐI CH</div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#1890ff",
                            marginTop: "4px",
                          }}
                        >
                          {totals.diCh}
                        </div>
                      </th>
                      <th
                        key={`${thietBi._id}-tra`}
                        style={{
                          border: "1px solid #e8e8e8",
                          padding: "6px 8px",
                          minWidth: "90px",
                          backgroundColor: `hsl(${index * 40}, 70%, 95%)`,
                          fontSize: "12px",
                        }}
                      >
                        <div>CH TRẢ VỀ</div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#52c41a",
                            marginTop: "4px",
                          }}
                        >
                          {totals.chTraVe}
                        </div>
                      </th>
                      <th
                        key={`${thietBi._id}-can`}
                        style={{
                          border: "1px solid #e8e8e8",
                          padding: "6px 8px",
                          minWidth: "80px",
                          backgroundColor: `hsl(${index * 40}, 70%, 95%)`,
                          fontSize: "12px",
                        }}
                      >
                        <div>CẤN TRỪ</div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: totals.canTru < 0 ? "#ff4d4f" : "#faad14",
                            marginTop: "4px",
                          }}
                        >
                          {totals.canTru}
                        </div>
                      </th>
                    </>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      9 + thietBiList.length * 3 + (!isGlobalEditMode ? 1 : 0)
                    }
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      9 + thietBiList.length * 3 + (!isGlobalEditMode ? 1 : 0)
                    }
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                data.map((record, index) => (
                  <TTBTableRow
                    key={record._id}
                    record={record}
                    index={index}
                    onDelete={handleDelete}
                    onUpdateSuccess={() => fetchData(currentSearchParams)}
                    isGlobalEditMode={isGlobalEditMode}
                    thietBiList={getSortedThietBiList()}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          Tổng {data.length} bản ghi
        </div>
      </Card>

      {/* Import Modal */}
      <TTBImportModal
        visible={isImportModalOpen}
        onClose={handleCloseImportModal}
        onImportSuccess={handleImportSuccess}
      />

      {/* Modal Thêm Thiết Bị */}
      <Modal
        title="Thêm thiết bị mới"
        open={isAddDeviceModalOpen}
        onOk={handleAddDevice}
        onCancel={handleCloseAddDeviceModal}
        okText="Thêm"
        cancelText="Hủy"
        width={500}
      >
        <Form form={addDeviceForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên thiết bị"
            name="ten_thiet_bi"
            rules={[
              { required: true, message: "Vui lòng nhập tên thiết bị" },
              { max: 50, message: "Tên thiết bị tối đa 50 ký tự" },
            ]}
          >
            <Input
              placeholder="VD: Khay nhựa, Thùng đá..."
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>

          <Form.Item label="Mô tả" name="mo_ta">
            <Input.TextArea
              placeholder="Mô tả chi tiết về thiết bị..."
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Thứ tự hiển thị"
            name="thu_tu"
            tooltip="Số thứ tự để sắp xếp vị trí hiển thị trong bảng"
          >
            <InputNumber
              min={0}
              max={999}
              placeholder="0"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
        </>
      )}
    </div>
  );
};

export default HomeTTB;