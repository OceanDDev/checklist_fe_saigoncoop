/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  List,
  Tooltip,
  Row,
  Col,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";
import XacNhanHinhAnh from "./XacNhanHinhAnh";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import InPhuXe from "./InPhuXe";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const PhuXeTableView = ({
  filteredData,
  sortOrder,
  phuXeNames,
  canEditPhuXeName,
  canEditDieuVan,
  isRole24,
  isRole21,
  onToggleSort,
  onDelete,
  onRefresh,
  onRefreshNames,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [nameForm] = Form.useForm();
  const [selectNameModalVisible, setSelectNameModalVisible] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [selectDieuVanModalVisible, setSelectDieuVanModalVisible] =
    useState(false);
  const [currentDieuVanRecordId, setCurrentDieuVanRecordId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedPrintRecord, setSelectedPrintRecord] = useState(null);

  // Role 21: khóa nếu đã chọn rồi + đã qua 6 tiếng kể từ thoi_gian_di
  // Chưa chọn thì luôn cho chọn bình thường
  const canRole21EditRecord = (record) => {
    if (!isRole21) return canEditDieuVan;
    if (record.dieu_van_xac_nhan && record.thoi_gian_di) {
      const thoiGianDi = dayjs(record.thoi_gian_di).tz(VN_TIMEZONE);
      const now = dayjs().tz(VN_TIMEZONE);
      if (now.diff(thoiGianDi, "hour") >= 6) return false; // đã qua 6 tiếng → khóa
    }
    return true;
  };

  // Color functions
  const getColorForPhuXeName = (tenPhuXe) => {
    if (!tenPhuXe) return "#f0f0f0";
    const colors = [
      "#ffd6e7",
      "#ffadd2",
      "#eb2f96",
      "#c41d7f",
      "#d3f261",
      "#bae637",
      "#7cb305",
      "#5b8c00",
      "#b7eb8f",
      "#95de64",
      "#52c41a",
      "#389e0d",
      "#87e8de",
      "#5cdbd3",
      "#13c2c2",
      "#08979c",
      "#91d5ff",
      "#69c0ff",
      "#1890ff",
      "#096dd9",
      "#adc6ff",
      "#85a5ff",
      "#597ef7",
      "#2f54eb",
      "#d3adf7",
      "#b37feb",
      "#9254de",
      "#722ed1",
    ];
    let hash = 0;
    for (let i = 0; i < tenPhuXe.length; i++) {
      hash = tenPhuXe.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getColorForKhungGio = (khungGio) => {
    const colors = [
      "#fff4e6",
      "#ffe7f0",
      "#e6f7ff",
      "#f0f5ff",
      "#f9f0ff",
      "#fcffe6",
      "#e6fffb",
      "#fff0f6",
      "#fff1f0",
      "#feffe6",
      "#f6ffed",
      "#fff7e6",
      "#f0f0ff",
      "#fff9e6",
      "#e6f9ff",
    ];
    let hash = 0;
    if (khungGio) {
      for (let i = 0; i < khungGio.length; i++) {
        hash = khungGio.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Format giờ Việt Nam
  const formatVietnameseTime = (date) => {
    if (!date) return "";
    return dayjs(date).tz(VN_TIMEZONE).format("HH:mm:ss");
  };

  // Inline editing handlers
  const handleStartEdit = (recordId, field, currentValue) => {
    setEditingField({ recordId, field });
    setEditValue(currentValue || "");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    const { recordId, field } = editingField;
    try {
      const result = await phuXeService.updatePhuXe(recordId, {
        [field]: editValue,
      });
      if (result) {
        message.success("Cập nhật thành công!");
        onRefresh();
        setEditingField(null);
        setEditValue("");
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      message.error("Không thể cập nhật!");
    }
  };

  // Print handlers
  const handleOpenPrintModal = (record) => {
    setSelectedPrintRecord(record);
    setPrintModalVisible(true);
  };

  const handleClosePrintModal = () => {
    setPrintModalVisible(false);
    setSelectedPrintRecord(null);
  };

  // Modal handlers
  const handleOpenSelectNameModal = (recordId) => {
    if (!canEditPhuXeName) {
      message.warning("Bạn không có quyền chỉnh sửa tên phụ xe!");
      return;
    }
    setCurrentRecordId(recordId);
    setSelectNameModalVisible(true);
  };

  const handleSelectPhuXeName = async (name) => {
    if (!currentRecordId) {
      message.error("Không xác định được phụ xe cần cập nhật!");
      return;
    }
    try {
      const result = await phuXeService.updatePhuXe(currentRecordId, {
        ten_phu_xe: name,
      });
      if (result) {
        message.success("Cập nhật tên phụ xe thành công!");
        onRefresh();
        setSelectNameModalVisible(false);
        setCurrentRecordId(null);
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật tên phụ xe:", error);
      message.error("Không thể cập nhật tên phụ xe!");
    }
  };

  const handleOpenSelectDieuVanModal = (recordId, canEdit) => {
    if (!canEdit) {
      message.warning("Không thể chỉnh sửa điều vận xác nhận này!");
      return;
    }
    setCurrentDieuVanRecordId(recordId);
    setSelectDieuVanModalVisible(true);
  };

  const handleSelectDieuVanXacNhan = async (name) => {
    if (!currentDieuVanRecordId) {
      message.error("Không xác định được phụ xe cần cập nhật!");
      return;
    }
    try {
      const result = await phuXeService.updatePhuXe(currentDieuVanRecordId, {
        dieu_van_xac_nhan: name,
      });
      if (result) {
        message.success("Xác nhận điều vận thành công!");
        onRefresh();
        setSelectDieuVanModalVisible(false);
        setCurrentDieuVanRecordId(null);
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận điều vận:", error);
      message.error("Không thể xác nhận điều vận!");
    }
  };

  const handleAddName = async () => {
    try {
      const values = await nameForm.validateFields();
      const result = await phuXeService.addPhuXeName(values.name);
      if (result) {
        message.success("Thêm tên phụ xe thành công!");
        nameForm.resetFields();
        onRefreshNames();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Lỗi khi thêm tên phụ xe:", error);
      message.error("Không thể thêm tên phụ xe!");
    }
  };

  const handleDeleteName = async (id) => {
    if (!id) {
      message.error("ID tên phụ xe không hợp lệ!");
      return;
    }
    try {
      const result = await phuXeService.deletePhuXeName(id);
      if (result) {
        message.success("Đã xóa tên phụ xe!");
        onRefreshNames();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa tên phụ xe:", error);
      message.error("Không thể xóa tên phụ xe!");
    }
  };

  // Render editable cell
  const renderEditableCell = (text, record, field, isRole24) => {
    const isEditing =
      editingField?.recordId === record._id && editingField?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={handleSaveEdit}
            autoFocus
            size="small"
            className="flex-1"
          />
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleSaveEdit}
          />
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={handleCancelEdit}
          />
        </div>
      );
    }

    return (
      <div className="group flex items-center justify-between gap-2">
        <span className="flex-1">{text || "-"}</span>
        {!isRole24 && (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleStartEdit(record._id, field, text)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
    );
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    !isRole24 && {
      title: (
        <div className="flex items-center justify-center gap-1">
          <span>Khung Giờ</span>
          <Button
            type="text"
            size="small"
            icon={
              sortOrder === "asc" ? (
                <SortAscendingOutlined />
              ) : (
                <SortDescendingOutlined />
              )
            }
            onClick={onToggleSort}
            className="p-0"
          />
        </div>
      ),
      dataIndex: "khung_gio",
      key: "khung_gio",
      width: 100,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Tên Cửa Hàng",
      dataIndex: "ten_cua_hang",
      key: "ten_cua_hang",
      width: 150,
      fixed: "left",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text) => (
        <div
          style={{
            minWidth: "120px",
            maxWidth: "150px",
            wordBreak: "break-word",
          }}
        >
          {text || "-"}
        </div>
      ),
    },
    {
      title: "Dịch Vụ",
      dataIndex: "dich_vu",
      key: "dich_vu",
      width: 80,
      align: "center",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text) => (
        <div style={{ minWidth: "60px", wordBreak: "break-word" }}>
          {text || "-"}
        </div>
      ),
    },
    {
      title: "Tên Tài Xế",
      dataIndex: "ten_tai_xe",
      key: "ten_tai_xe",
      width: 120,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text, record) =>
        renderEditableCell(text, record, "ten_tai_xe", isRole24),
    },
    {
      title: "Biển Số Xe",
      dataIndex: "bien_so_xe",
      key: "bien_so_xe",
      width: 110,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text, record) =>
        renderEditableCell(text, record, "bien_so_xe", isRole24),
    },
    !isRole24 && {
      title: "Tên Phụ Xe",
      key: "ten_phu_xe",
      width: 110,
      align: "center",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (_, record) => (
        <Tooltip
          title={
            !canEditPhuXeName
              ? "Bạn không có quyền chỉnh sửa"
              : "Click để chọn tên phụ xe"
          }
          placement="top"
        >
          <Button
            onClick={() => handleOpenSelectNameModal(record._id)}
            style={{
              backgroundColor: getColorForPhuXeName(record.ten_phu_xe),
              borderColor: getColorForPhuXeName(record.ten_phu_xe),
              color: "#000",
              fontWeight: "600",
              width: "100%",
              cursor: !canEditPhuXeName ? "not-allowed" : "pointer",
              opacity: !canEditPhuXeName ? 0.6 : 1,
            }}
            disabled={!canEditPhuXeName}
            size="small"
          >
            {record.ten_phu_xe || "Chọn"}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Xác Nhận",
      key: "dieu_van_xac_nhan",
      width: 110,
      align: "center",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (_, record) => {
        const canEdit = canRole21EditRecord(record);

        const tooltipContent = record.thoi_gian_di
          ? `Thời gian đi: ${formatVietnameseTime(record.thoi_gian_di)}`
          : !canEdit
            ? "Bạn không có quyền chỉnh sửa"
            : "Click để chọn điều vận xác nhận";

        return (
          <Tooltip title={tooltipContent} placement="top">
            <Button
              onClick={() => handleOpenSelectDieuVanModal(record._id, canEdit)}
              style={{
                backgroundColor: getColorForPhuXeName(record.dieu_van_xac_nhan),
                borderColor: getColorForPhuXeName(record.dieu_van_xac_nhan),
                color: "#000",
                fontWeight: "600",
                width: "100%",
                cursor: !canEdit ? "not-allowed" : "pointer",
                opacity: !canEdit ? 0.6 : 1,
                height: "auto",
                minHeight: "32px",
                whiteSpace: "normal",
                padding: "4px 8px",
              }}
              disabled={!canEdit}
              size="small"
              className="min-w-[80px] max-w-full text-xs sm:text-sm leading-tight"
            >
              <span className="break-words text-center block w-full">
                {record.dieu_van_xac_nhan || "Chọn"}
                {record.thoi_gian_di && " 🕐"}
              </span>
            </Button>
          </Tooltip>
        );
      },
    },
    !isRole24 && {
      title: "Ghi Chú",
      dataIndex: "ghi_chu",
      key: "ghi_chu",
      width: 150,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text, record) =>
        renderEditableCell(text, record, "ghi_chu", isRole24),
    },
    (!canEditDieuVan || canEditPhuXeName) && {
      title: "Hình Ảnh",
      key: "hinh_anh",
      width: 100,
      align: "center",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (_, record) => (
        <XacNhanHinhAnh record={record} onSuccess={onRefresh} />
      ),
    },
    !isRole24 && {
      title: "IN PX",
      key: "in_px",
      width: 80,
      align: "center",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (_, record) => (
        <Tooltip title="In phiếu phụ xe" placement="top">
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => handleOpenPrintModal(record)}
            size="small"
          >
            In
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Ngày Import",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text) =>
        text ? dayjs(text).tz(VN_TIMEZONE).format("DD/MM/YYYY HH:mm") : "-",
    },
    !isRole24 &&
      canEditPhuXeName && {
        title: "Chức Năng",
        key: "action",
        align: "center",
        width: 90,
        onCell: (record) => ({
          style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
        }),
        render: (_, record) => (
          <Popconfirm
            title="Xác nhận xóa?"
            description="Bạn có chắc chắn muốn xóa không?"
            onConfirm={() => onDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
        ),
      },
  ].filter(Boolean);

  return (
    <>
      {canEditPhuXeName && (
        <div className="flex justify-end mb-2">
          <Button type="dashed" onClick={() => setModalVisible(true)}>
            Quản lý Tên Phụ Xe
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={false}
          bordered
          size="small"
          scroll={{ x: 800 }}
          sticky
        />
      </div>

      {/* Modal In Phụ Xe */}
      <Modal
        title="In Phiếu Phụ Xe"
        open={printModalVisible}
        onCancel={handleClosePrintModal}
        footer={null}
        width={800}
        centered
      >
        {selectedPrintRecord && (
          <InPhuXe
            record={selectedPrintRecord}
            onClose={handleClosePrintModal}
          />
        )}
      </Modal>

      {/* Modal chọn tên phụ xe */}
      <Modal
        title="Chọn Tên Phụ Xe"
        open={selectNameModalVisible}
        onCancel={() => {
          setSelectNameModalVisible(false);
          setCurrentRecordId(null);
        }}
        footer={null}
        width={600}
      >
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {phuXeNames.map((item) => (
            <Col xs={12} sm={8} md={6} key={item._id}>
              <Button
                block
                size="large"
                onClick={() => handleSelectPhuXeName(item.name)}
                style={{
                  backgroundColor: getColorForPhuXeName(item.name),
                  borderColor: getColorForPhuXeName(item.name),
                  color: "#000",
                  fontWeight: "600",
                  height: "60px",
                  fontSize: "14px",
                }}
              >
                {item.name}
              </Button>
            </Col>
          ))}
        </Row>
        {phuXeNames.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Chưa có tên phụ xe nào
          </div>
        )}
      </Modal>

      {/* Modal chọn điều vận xác nhận */}
      <Modal
        title="Chọn Điều Vận Xác Nhận"
        open={selectDieuVanModalVisible}
        onCancel={() => {
          setSelectDieuVanModalVisible(false);
          setCurrentDieuVanRecordId(null);
        }}
        footer={null}
        width={600}
      >
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {phuXeNames.map((item) => (
            <Col xs={12} sm={8} md={6} key={item._id}>
              <Button
                block
                size="large"
                onClick={() => handleSelectDieuVanXacNhan(item.name)}
                style={{
                  backgroundColor: getColorForPhuXeName(item.name),
                  borderColor: getColorForPhuXeName(item.name),
                  color: "#000",
                  fontWeight: "600",
                  height: "60px",
                  fontSize: "14px",
                }}
              >
                {item.name}
              </Button>
            </Col>
          ))}
        </Row>
        {phuXeNames.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Chưa có tên phụ xe nào
          </div>
        )}
      </Modal>

      {/* Modal quản lý tên phụ xe */}
      <Modal
        title="Quản lý Tên Phụ Xe"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={nameForm} layout="vertical" className="mb-4">
          <Form.Item
            name="name"
            label="Tên phụ xe mới"
            rules={[{ required: true, message: "Vui lòng nhập tên phụ xe" }]}
          >
            <Input placeholder="Nhập tên phụ xe" size="large" />
          </Form.Item>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddName}
            size="large"
            block
          >
            Thêm Phụ Xe
          </Button>
        </Form>

        <div className="border-t pt-4">
          <Title level={5} className="mb-3">
            Danh sách tên phụ xe ({phuXeNames.length})
          </Title>
          <List
            dataSource={phuXeNames}
            locale={{ emptyText: "Chưa có tên phụ xe nào" }}
            renderItem={(item) => (
              <List.Item
                className="px-3 py-2 rounded mb-2"
                style={{
                  backgroundColor: getColorForPhuXeName(item.name),
                }}
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Xác nhận xóa tên này?"
                    description={`Bạn có chắc muốn xóa "${item.name}"?`}
                    onConfirm={() => handleDeleteName(item._id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      Xóa
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium">{item.name}</span>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </>
  );
};

export default PhuXeTableView;
