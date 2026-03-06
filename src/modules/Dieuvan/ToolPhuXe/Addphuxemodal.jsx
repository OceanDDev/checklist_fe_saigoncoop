/* eslint-disable react/prop-types */
import { useState } from "react";
import { Modal, Form, Input, Select, DatePicker, Button, Row, Col, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const KHUNG_GIO_OPTIONS = [
  "05:00", "06:00", "07:00", "08:00", "09:00", "10:00",
  "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];


const AddPhuXeModal = ({ onAdded, chbxList = [] }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    form.resetFields();
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Format ngày import thành ISO string → gán vào createdAt
      if (values.ngay_import) {
        values.createdAt = values.ngay_import.toISOString();
        delete values.ngay_import;
      }

      setLoading(true);
      const result = await phuXeService.addPhuXe(values);
      if (result) {
        message.success("Thêm phụ xe thành công!");
        handleClose();
        if (onAdded) onAdded();
      }
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Lỗi thêm phụ xe:", error);
      message.error("Không thể thêm phụ xe!");
    } finally {
      setLoading(false);
    }
  };

  // Khi chọn mã cửa hàng → tự điền tên cửa hàng
  const handleSelectCuaHang = (maCH) => {
    const found = chbxList.find((ch) => ch.ma_cua_hang === maCH);
    if (found) {
      form.setFieldsValue({ ten_cua_hang: found.ten_cua_hang });
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleOpen}
        style={{ backgroundColor: "#1677ff", borderColor: "#1677ff" }}
      >
        Thêm Chuyến
      </Button>

      <Modal
        title="Thêm Chuyến"
        open={open}
        onCancel={handleClose}
        onOk={handleSubmit}
        okText="Thêm"
        cancelText="Hủy"
        confirmLoading={loading}
        width={520}
      >
        <Form form={form} layout="vertical" size="middle">
          {/* Khung Giờ */}
          <Form.Item
            label="Khung Giờ"
            name="khung_gio"
            rules={[{ required: true, message: "Vui lòng chọn khung giờ!" }]}
          >
            <Select placeholder="Chọn khung giờ" allowClear showSearch>
              {KHUNG_GIO_OPTIONS.map((gio) => (
                <Select.Option key={gio} value={gio}>
                  {gio}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Mã + Tên Cửa Hàng */}
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item label="Mã Cửa Hàng" name="ma_cua_hang">
                <Select
                  placeholder="Chọn mã CH"
                  allowClear
                  showSearch
                  onChange={handleSelectCuaHang}
                  filterOption={(input, option) =>
                    option.value.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {chbxList.map((ch) => (
                    <Select.Option key={ch.ma_cua_hang} value={ch.ma_cua_hang}>
                      {ch.ma_cua_hang}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item label="Tên Cửa Hàng" name="ten_cua_hang">
                <Input placeholder="Tên cửa hàng" />
              </Form.Item>
            </Col>
          </Row>

          {/* Dịch Vụ */}
          <Form.Item label="Dịch Vụ" name="dich_vu">
            <Input placeholder="Nhập dịch vụ" />
          </Form.Item>

          {/* Tên Tài Xế + Biển Số Xe */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Tên Tài Xế" name="ten_tai_xe">
                <Input placeholder="Nhập tên tài xế" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Biển Số Xe" name="bien_so_xe">
                <Input placeholder="VD: 51A-12345" />
              </Form.Item>
            </Col>
          </Row>

          {/* Ngày Import */}
          <Form.Item
            label="Ngày Import"
            name="ngay_import"
            initialValue={dayjs().tz(VN_TIMEZONE).subtract(1, "day")}
            rules={[{ required: true, message: "Vui lòng chọn ngày import!" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Chọn ngày import"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AddPhuXeModal;