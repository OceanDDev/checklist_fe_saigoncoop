import { useEffect, useState, useRef } from "react";
import {
  Table,
  Input,
  Card,
  Typography,
  Button,
  Popconfirm,
  message,
  Select,
  Modal,
  Form,
  List,
  Tooltip,
} from "antd";
import { SearchOutlined, DeleteOutlined, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";
import ImportPhuXe from "./importPhuXe";
import CaptureTable from "./CaptureTable";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

const HomePhuXe = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection"
    }
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" hoặc "desc"

  const [phuXeNames, setPhuXeNames] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nameForm] = Form.useForm();

  // State để kiểm tra quyền chỉnh sửa
  const [canEditPhuXeName, setCanEditPhuXeName] = useState(false);
  
  // Ref cho table để chụp ảnh - QUAN TRỌNG
  const tableRef = useRef(null);
  
  // Kiểm tra có đang search theo 1 ngày cụ thể không
  const isSearchingOneDay = dateRange[0].startDate && dateRange[0].endDate && 
    dayjs(dateRange[0].startDate).isSame(dayjs(dateRange[0].endDate), 'day');

  // Hàm chuyển khung giờ thành số để so sánh (VD: "6:00" -> 6, "12:00" -> 12)
  const parseKhungGio = (khungGio) => {
    if (!khungGio) return 0;
    const match = khungGio.match(/(\d+):(\d+)/);
    if (match) {
      return parseInt(match[1]) + parseInt(match[2]) / 60;
    }
    return 0;
  };

  useEffect(() => {
    fetchPhuXe();
    fetchPhuXeNames();
    checkUserRole();
  }, []);

  // Hàm kiểm tra role của user
  const checkUserRole = () => {
    try {
      // Lấy thông tin user từ localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Kiểm tra role === 22
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
        // Sắp xếp theo khung giờ
        const sortedList = list.sort((a, b) => {
          const timeA = parseKhungGio(a.khung_gio);
          const timeB = parseKhungGio(b.khung_gio);
          
          if (sortOrder === "desc") {
            return timeB - timeA;
          } else {
            return timeA - timeB;
          }
        });
        
        setData(sortedList);
        setFilteredData(sortedList);
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

  const handleOpenNameModal = async () => {
    setModalVisible(true);
  };

  const filterData = (text, range) => {
    let filtered = [...data];
    const hasFilter = text || (range[0].startDate && range[0].endDate);
    
    if (text) {
      const keyword = text.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.ten_cua_hang?.toLowerCase().includes(keyword) ||
          item.ten_tai_xe?.toLowerCase().includes(keyword) ||
          item.ten_phu_xe?.toLowerCase().includes(keyword) ||
          item.bien_so_xe?.toLowerCase().includes(keyword)
      );
    }
    if (range[0].startDate && range[0].endDate) {
      const start = dayjs(range[0].startDate).startOf("day");
      const end = dayjs(range[0].endDate).endOf("day");
      filtered = filtered.filter((item) => {
        const created = dayjs(item.createdAt);
        return created.isAfter(start) && created.isBefore(end);
      });
    }
    setFilteredData(filtered);
    setIsSearching(hasFilter);
    setCurrentPage(1); // Reset về trang 1 khi filter
  };

  const handleSearch = (value) => {
    setSearch(value);
    filterData(value, dateRange);
  };

  const handleDateRangeChange = (item) => {
    const newRange = [item.selection];
    setDateRange(newRange);
    filterData(search, newRange);
  };

  const handleDelete = async (id) => {
    if (!id) {
      console.error("ID không hợp lệ:", id);
      message.error("ID phụ xe không hợp lệ!");
      return;
    }
    
    try {
      console.log("=== BẮT ĐẦU XÓA PHỤ XE ===");
      console.log("ID:", id);
      console.log("Type of ID:", typeof id);
      
      const result = await phuXeService.deletePhuXe(id);
      
      console.log("Kết quả từ API:", result);
      
      if (result) {
        message.success("Đã xóa phụ xe thành công!");
        fetchPhuXe();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("=== LỖI KHI XÓA PHỤ XE ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      message.error("Không thể xóa phụ xe!");
    }
  };

  const handleChangePhuXeName = async (id, value) => {
    // Kiểm tra quyền trước khi thực hiện
    if (!canEditPhuXeName) {
      message.warning("Bạn không có quyền chỉnh sửa tên phụ xe!");
      return;
    }

    if (!id) {
      console.error("ID không hợp lệ:", id);
      message.error("ID phụ xe không hợp lệ!");
      return;
    }
    
    try {
      console.log("=== BẮT ĐẦU CẬP NHẬT TÊN PHỤ XE ===");
      console.log("ID:", id);
      console.log("Tên mới:", value);
      
      const result = await phuXeService.updatePhuXe(id, { ten_phu_xe: value });
      
      console.log("Kết quả từ API:", result);
      
      if (result) {
        message.success("Cập nhật tên phụ xe thành công!");
        fetchPhuXe();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("=== LỖI KHI CẬP NHẬT TÊN PHỤ XE ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      message.error("Không thể cập nhật tên phụ xe!");
    }
  };

  const handleAddName = async () => {
    try {
      const values = await nameForm.validateFields();
      
      console.log("=== BẮT ĐẦU THÊM TÊN PHỤ XE ===");
      console.log("Tên:", values.name);
      
      const result = await phuXeService.addPhuXeName(values.name);
      
      console.log("Kết quả từ API:", result);
      
      if (result) {
        message.success("Thêm tên phụ xe thành công!");
        nameForm.resetFields();
        fetchPhuXeNames();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("=== LỖI KHI THÊM TÊN PHỤ XE ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      if (error?.errorFields) {
        // Validation error
        return;
      }
      message.error("Không thể thêm tên phụ xe!");
    }
  };

  const handleDeleteName = async (id) => {
    if (!id) {
      console.error("ID không hợp lệ:", id);
      message.error("ID tên phụ xe không hợp lệ!");
      return;
    }
    
    try {
      console.log("=== BẮT ĐẦU XÓA TÊN PHỤ XE ===");
      console.log("ID:", id);
      console.log("Type of ID:", typeof id);
      
      const result = await phuXeService.deletePhuXeName(id);
      
      console.log("Kết quả từ API:", result);
      
      if (result) {
        message.success("Đã xóa tên phụ xe!");
        fetchPhuXeNames();
      } else {
        message.error("API trả về null - có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("=== LỖI KHI XÓA TÊN PHỤ XE ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      message.error("Không thể xóa tên phụ xe!");
    }
  };

  // Hàm toggle sort order
  const handleToggleSort = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newOrder);
    
    // Sort lại data hiện tại theo KHUNG GIỜ
    const sortedData = [...data].sort((a, b) => {
      const timeA = parseKhungGio(a.khung_gio);
      const timeB = parseKhungGio(b.khung_gio);
      
      if (newOrder === "desc") {
        return timeB - timeA; // Giờ lớn lên đầu (12:00 -> 9:00 -> 6:00)
      } else {
        return timeA - timeB; // Giờ nhỏ lên đầu (6:00 -> 9:00 -> 12:00)
      }
    });
    
    setData(sortedData);
    
    // Sort lại filteredData nếu đang search
    if (isSearching) {
      const sortedFiltered = [...filteredData].sort((a, b) => {
        const timeA = parseKhungGio(a.khung_gio);
        const timeB = parseKhungGio(b.khung_gio);
        
        if (newOrder === "desc") {
          return timeB - timeA;
        } else {
          return timeA - timeB;
        }
      });
      setFilteredData(sortedFiltered);
    } else {
      setFilteredData(sortedData);
    }
    
    message.success(newOrder === "desc" ? "Sắp xếp giờ lớn đến nhỏ" : "Sắp xếp giờ nhỏ đến lớn");
  };

  // Hàm tạo màu cho mỗi khung giờ
  const getColorForKhungGio = (khungGio) => {
    const colors = [
      '#fff4e6', '#ffe7f0', '#e6f7ff', '#f0f5ff', '#f9f0ff',
      '#fcffe6', '#e6fffb', '#fff0f6', '#fff1f0', '#feffe6',
      '#f6ffed', '#fff7e6', '#f0f0ff', '#fff9e6', '#e6f9ff'
    ];
    
    let hash = 0;
    if (khungGio) {
      for (let i = 0; i < khungGio.length; i++) {
        hash = khungGio.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const columns = [
    { 
      title: "STT", 
      key: "stt",
      width: 60,
      align: "center",
      render: (_, record, index) => {
        // Tính STT dựa trên pagination
        return (currentPage - 1) * pageSize + index + 1;
      },
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    { 
      title: (
        <div className="flex items-center justify-center gap-2">
          <span>Khung Giờ</span>
          <Button 
            type="text" 
            size="small"
            icon={sortOrder === "desc" ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
            onClick={handleToggleSort}
            className="p-0"
            style={{ fontSize: '16px' }}
          />
        </div>
      ), 
      dataIndex: "khung_gio", 
      key: "khung_gio", 
      width: 140,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    { 
      title: "Tên Cửa Hàng", 
      dataIndex: "ten_cua_hang", 
      key: "ten_cua_hang",
      fixed: "left",
      width: 200,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    { 
      title: "Dịch Vụ", 
      dataIndex: "dich_vu", 
      key: "dich_vu",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    { 
      title: "Tên Tài Xế", 
      dataIndex: "ten_tai_xe", 
      key: "ten_tai_xe",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    { 
      title: "Biển Số Xe", 
      dataIndex: "bien_so_xe", 
      key: "bien_so_xe",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      })
    },
    {
      title: "Tên Phụ Xe",
      key: "ten_phu_xe",
      onCell: (record) => ({
        style: { 
          backgroundColor: getColorForKhungGio(record.khung_gio),
          fontWeight: '600'
        }
      }),
      render: (_, record) => (
        <Tooltip 
          title={!canEditPhuXeName ? "Bạn không có quyền chỉnh sửa" : ""}
          placement="top"
        >
          <Select
            placeholder={record.ten_phu_xe || "Chọn tên phụ xe"}
            value={record.ten_phu_xe || undefined}
            onChange={(value) => handleChangePhuXeName(record._id, value)}
            style={{ 
              width: 150,
              fontWeight: '600',
              cursor: !canEditPhuXeName ? 'not-allowed' : 'pointer'
            }}
            open={canEditPhuXeName ? undefined : false}
            onDropdownVisibleChange={(open) => {
              if (open && !canEditPhuXeName) {
                message.warning("Bạn không có quyền chỉnh sửa tên phụ xe!");
                return false;
              }
            }}
          >
            {phuXeNames.map((item) => (
              <Option key={item._id} value={item.name}>
                {item.name}
              </Option>
            ))}
          </Select>
        </Tooltip>
      ),
    },
    {
      title: "Ngày Import",
      dataIndex: "createdAt",
      key: "createdAt",
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
      }),
      render: (text) => (text ? new Date(text).toLocaleDateString("vi-VN") : "-"),
    },
    {
      title: "Chức Năng",
      key: "action",
      align: "center",
      width: 100,
      onCell: (record) => ({
        style: { backgroundColor: getColorForKhungGio(record.khung_gio) }
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
        bodyStyle={{ padding: '0.75rem' }}
        style={{ padding: 0 }}
      >
        <div className="p-3 sm:p-4 md:p-6">
          <Title level={4} className="text-center mb-4 text-base sm:text-lg md:text-xl">
            Danh Sách Phụ Xe
          </Title>

          {/* Search và Filter Section - Layout cải tiến */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Input
              placeholder="🔍 Tìm kiếm..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              className="w-full sm:w-64 md:w-80"
              size="middle"
            />

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative">
                <input
                  readOnly
                  onClick={() => setShowCalendar(!showCalendar)}
                  value={
                    dateRange[0].startDate && dateRange[0].endDate
                      ? `${dayjs(dateRange[0].startDate).format(
                          "DD/MM/YYYY"
                        )} - ${dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}`
                      : ""
                  }
                  placeholder="📅 Khoảng ngày"
                  className="border px-3 py-2 rounded shadow-sm cursor-pointer w-full sm:w-64"
                />
                {showCalendar && (
                  <div className="absolute z-50 mt-2 right-0 sm:left-0">
                    <DateRange
                      ranges={dateRange}
                      onChange={handleDateRangeChange}
                      moveRangeOnFirstSelection={false}
                      maxDate={new Date()}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <ImportPhuXe onImported={fetchPhuXe} />
                {isSearchingOneDay && (
                  <CaptureTable 
                    tableRef={tableRef}
                    fileName={`phuxe_${dayjs(dateRange[0].startDate).format('YYYY-MM-DD')}`}
                  />
                )}
                {canEditPhuXeName && (
                  <Button 
                    type="dashed" 
                    onClick={handleOpenNameModal}
                    className="flex-1 sm:flex-none whitespace-nowrap"
                    size="middle"
                  >
                    <span className="hidden sm:inline">Quản lý Tên Phụ Xe</span>
                    <span className="sm:hidden">Quản lý Tên</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table Section - ĐÃ SỬA: Bỏ overflow-x-auto và các class gây cản trở */}
          <div >
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="_id"
              pagination={isSearching ? false : { 
                pageSize: pageSize,
                current: currentPage,
                onChange: (page) => setCurrentPage(page),
                showSizeChanger: false,
                responsive: true,
                showTotal: (total) => `Tổng ${total} mục`
              }}
              bordered
              size="small"
              scroll={{ x: 1200 }}
              rowClassName={(record) => `row-khung-gio-${record.khung_gio?.replace(/\s/g, '-')}`}
            />
          </div>
        </div>
      </Card>

      {/* Modal quản lý tên phụ xe - Responsive */}
      <Modal 
        title={<span className="text-base sm:text-lg font-semibold">Quản lý Tên Phụ Xe</span>}
        open={modalVisible} 
        onCancel={() => setModalVisible(false)} 
        footer={null}
        width="90%"
        style={{ maxWidth: 600, top: 20 }}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Form 
          form={nameForm} 
          layout="vertical"
          className="mb-4"
        >
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
                    <Button 
                      size="small" 
                      danger 
                      icon={<DeleteOutlined />}
                    >
                      <span className="hidden sm:inline ml-1">Xóa</span>
                    </Button>
                  </Popconfirm>
                ]}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium text-sm sm:text-base">{item.name}</span>
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