import { useEffect, useState, useRef } from "react";
import {
  Table,
  Card,
  Typography,
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
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";
import ImportPhuXe from "./importPhuXe";
import CaptureTable from "./CaptureTable";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import SearchFilter from "./SearchPhuXe";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title } = Typography;
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

// Hàm lấy ngày hiện tại theo giờ Việt Nam
const getTodayVN = () => {
  return dayjs().tz(VN_TIMEZONE).startOf('day').toDate();
};

const HomePhuXe = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(true); // Mặc định true vì có filter ngày
  const [dateRange, setDateRange] = useState([
    { 
      startDate: getTodayVN(), 
      endDate: getTodayVN(), 
      key: "selection" 
    },
  ]);
  const [sortOrder, setSortOrder] = useState("desc");

  const [phuXeNames, setPhuXeNames] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nameForm] = Form.useForm();

  const [selectNameModalVisible, setSelectNameModalVisible] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [canEditPhuXeName, setCanEditPhuXeName] = useState(false);

  const tableRef = useRef(null);

  const isSearchingOneDay =
    dateRange[0].startDate &&
    dateRange[0].endDate &&
    dayjs(dateRange[0].startDate).isSame(dayjs(dateRange[0].endDate), "day");

  // Hàm tạo màu cho mỗi tên phụ xe
  const getColorForPhuXeName = (tenPhuXe) => {
    if (!tenPhuXe) return "#f0f0f0";
    const colors = [
      "#ffd6e7", "#ffadd2", "#eb2f96", "#c41d7f",
      "#d3f261", "#bae637", "#7cb305", "#5b8c00",
      "#b7eb8f", "#95de64", "#52c41a", "#389e0d",
      "#87e8de", "#5cdbd3", "#13c2c2", "#08979c",
      "#91d5ff", "#69c0ff", "#1890ff", "#096dd9",
      "#adc6ff", "#85a5ff", "#597ef7", "#2f54eb",
      "#d3adf7", "#b37feb", "#9254de", "#722ed1",
    ];
    let hash = 0;
    for (let i = 0; i < tenPhuXe.length; i++) {
      hash = tenPhuXe.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const parseKhungGio = (khungGio) => {
    if (!khungGio) return 0;
    const match = khungGio.match(/(\d+):(\d+)/);
    return match ? parseInt(match[1]) + parseInt(match[2]) / 60 : 0;
  };

  const getColorForKhungGio = (khungGio) => {
    const colors = [
      "#fff4e6", "#ffe7f0", "#e6f7ff", "#f0f5ff", "#f9f0ff",
      "#fcffe6", "#e6fffb", "#fff0f6", "#fff1f0", "#feffe6",
      "#f6ffed", "#fff7e6", "#f0f0ff", "#fff9e6", "#e6f9ff",
    ];
    let hash = 0;
    if (khungGio) {
      for (let i = 0; i < khungGio.length; i++) {
        hash = khungGio.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    fetchPhuXe();
    fetchPhuXeNames();
    checkUserRole();
  }, []);

  const checkUserRole = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCanEditPhuXeName(user.role === 22 || user.roleId === 22);
      } else {
        setCanEditPhuXeName(false);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra role:", error);
      setCanEditPhuXeName(false);
    }
  };

  const fetchPhuXe = async () => {
    try {
      const list = await phuXeService.getAllPhuXe();
      if (list) {
        const sortedList = list.sort((a, b) => {
          const timeA = parseKhungGio(a.khung_gio);
          const timeB = parseKhungGio(b.khung_gio);
          return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
        });
        setData(sortedList);
        // Không set filteredData ở đây nữa, để SearchFilter xử lý
      }
    } catch (error) {
      console.error("Lỗi khi gọi getAllPhuXe:", error);
      message.error("Không thể tải danh sách phụ xe");
    }
  };

  const fetchPhuXeNames = async () => {
    try {
      const names = await phuXeService.getAllPhuXeNames();
      if (names) setPhuXeNames(names);
    } catch (error) {
      console.error("Lỗi khi gọi getAllPhuXeNames:", error);
      message.error("Không thể lấy danh sách tên phụ xe");
    }
  };

  // Callback từ SearchFilter component
  const handleFilterChange = (filtered, hasFilter, newDateRange) => {
    // Sắp xếp lại theo sortOrder hiện tại
    const sortedFiltered = [...filtered].sort((a, b) => {
      const timeA = parseKhungGio(a.khung_gio);
      const timeB = parseKhungGio(b.khung_gio);
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    setFilteredData(sortedFiltered);
    setIsSearching(hasFilter);
    setDateRange(newDateRange);
  };

  const handleToggleSort = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);

    const sortFn = (a, b) => {
      const timeA = parseKhungGio(a.khung_gio);
      const timeB = parseKhungGio(b.khung_gio);
      return newOrder === "desc" ? timeB - timeA : timeA - timeB;
    };

    setData((prev) => [...prev].sort(sortFn));
    setFilteredData((prev) => [...prev].sort(sortFn));
    message.success(
      newOrder === "desc" ? "Sắp xếp giờ lớn đến nhỏ" : "Sắp xếp giờ nhỏ đến lớn"
    );
  };

  const handleDelete = async (id) => {
    if (!id) {
      message.error("ID phụ xe không hợp lệ!");
      return;
    }
    try {
      const result = await phuXeService.deletePhuXe(id);
      if (result) {
        message.success("Đã xóa phụ xe thành công!");
        fetchPhuXe();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa phụ xe:", error);
      message.error("Không thể xóa phụ xe!");
    }
  };

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
        fetchPhuXe();
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

  const handleAddName = async () => {
    try {
      const values = await nameForm.validateFields();
      const result = await phuXeService.addPhuXeName(values.name);
      if (result) {
        message.success("Thêm tên phụ xe thành công!");
        nameForm.resetFields();
        fetchPhuXeNames();
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
        fetchPhuXeNames();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa tên phụ xe:", error);
      message.error("Không thể xóa tên phụ xe!");
    }
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
    {
      title: (
        <div className="flex items-center justify-center gap-2">
          <span>Khung Giờ</span>
          <Button
            type="text"
            size="small"
            icon={
              sortOrder === "desc" ? (
                <SortDescendingOutlined />
              ) : (
                <SortAscendingOutlined />
              )
            }
            onClick={handleToggleSort}
            className="p-0"
            style={{ fontSize: "16px" }}
          />
        </div>
      ),
      dataIndex: "khung_gio",
      key: "khung_gio",
      width: 140,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Tên Cửa Hàng",
      dataIndex: "ten_cua_hang",
      key: "ten_cua_hang",
      fixed: "left",
      width: 200,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Dịch Vụ",
      dataIndex: "dich_vu",
      key: "dich_vu",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Tên Tài Xế",
      dataIndex: "ten_tai_xe",
      key: "ten_tai_xe",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Biển Số Xe",
      dataIndex: "bien_so_xe",
      key: "bien_so_xe",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
    },
    {
      title: "Tên Phụ Xe",
      key: "ten_phu_xe",
      width: 150,
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
            disabled={!canEditPhuXeName}
          >
            <span>{record.ten_phu_xe || "Chọn"}</span>
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Ngày Import",
      dataIndex: "createdAt",
      key: "createdAt",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (text) =>
        text
          ? dayjs(text).tz(VN_TIMEZONE).format("DD/MM/YYYY HH:mm")
          : "-",
    },
    {
      title: "Chức Năng",
      key: "action",
      align: "center",
      width: 100,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) },
      }),
      render: (_, record) => (
        <Popconfirm
          title="Xác nhận xóa phụ xe này?"
          description="Bạn có chắc chắn muốn xóa không?"
          onConfirm={() => handleDelete(record._id)}
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
  ];

  return (
    <div className="p-2 sm:p-4 md:p-6" ref={tableRef}>
      <Card
        className="shadow-md rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-100"
        bodyStyle={{ padding: "0.75rem" }}
        style={{ padding: 0 }}
      >
        <div className="p-3 sm:p-4 md:p-6">
          <Title level={4} className="text-center mb-4 text-base sm:text-lg md:text-xl">
            Danh Sách Phụ Xe
          </Title>

          {/* Search Filter Component */}
          <div className="mb-4">
            <SearchFilter
              data={data}
              onFilterChange={handleFilterChange}
              phuXeList={phuXeNames}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-4 justify-end">
            <ImportPhuXe onImported={fetchPhuXe} />
            {isSearchingOneDay && (
              <CaptureTable
                tableRef={tableRef}
                fileName={`phuxe_${dayjs(dateRange[0].startDate).tz(VN_TIMEZONE).format(
                  "YYYY-MM-DD"
                )}`}
              />
            )}
            {canEditPhuXeName && (
              <Button
                type="dashed"
                onClick={() => setModalVisible(true)}
                className="flex-1 sm:flex-none whitespace-nowrap"
                size="middle"
              >
                <span className="hidden sm:inline">Quản lý Tên Phụ Xe</span>
                <span className="sm:hidden">Quản lý Tên</span>
              </Button>
            )}
          </div>

          <div>
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="_id"
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 1200 }}
              rowClassName={(record) =>
                `row-khung-gio-${record.khung_gio?.replace(/\s/g, "-")}`
              }
            />
          </div>
        </div>
      </Card>

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

      {/* Modal quản lý tên phụ xe */}
      <Modal
        title={
          <span className="text-base sm:text-lg font-semibold">
            Quản lý Tên Phụ Xe
          </span>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 600, top: 20 }}
        bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        <Form form={nameForm} layout="vertical" className="mb-4">
          <Form.Item
            name="name"
            label="Tên phụ xe mới"
            rules={[{ required: true, message: "Vui lòng nhập tên phụ xe" }]}
            className="mb-3"
          >
            <Input
              placeholder="Nhập tên phụ xe"
              size="large"
              className="w-full"
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddName}
              size="large"
              block
              className="h-10"
            >
              Thêm Phụ Xe
            </Button>
          </Form.Item>
        </Form>

        <div className="border-t pt-4">
          <Title level={5} className="mb-3 text-sm sm:text-base">
            Danh sách tên phụ xe ({phuXeNames.length})
          </Title>

          <List
            dataSource={phuXeNames}
            locale={{ emptyText: "Chưa có tên phụ xe nào" }}
            renderItem={(item) => (
              <List.Item
                className="px-3 py-2 hover:bg-gray-50 rounded transition-colors"
                style={{
                  backgroundColor: getColorForPhuXeName(item.name),
                  marginBottom: "8px",
                  borderRadius: "4px",
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
                      <span className="hidden sm:inline ml-1">Xóa</span>
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium text-sm sm:text-base">
                    {item.name}
                  </span>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default HomePhuXe;