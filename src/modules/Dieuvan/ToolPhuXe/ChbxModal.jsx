/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { Modal, Button, Table, Input, Space, message, Popconfirm } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { phuXeService } from "@/services/dieuvan/phuxe.service";

const ChbxModal = ({ visible, onClose, onStoreAdded }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    ma_cua_hang: "",
    ten_cua_hang: "",
  });
  const [addForm, setAddForm] = useState({ ma_cua_hang: "", ten_cua_hang: "" });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchStores();
    }
  }, [visible]);

  // ✅ Lấy danh sách cửa hàng từ API
  const fetchStores = async () => {
    setLoading(true);
    try {
      const result = await phuXeService.getAllChbx();
      if (result && Array.isArray(result)) {
        setData(result);
      } else {
        message.error("Dữ liệu không hợp lệ");
        setData([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
      message.error("Không thể tải danh sách cửa hàng");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    setEditForm({
      ma_cua_hang: record.ma_cua_hang,
      ten_cua_hang: record.ten_cua_hang,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ ma_cua_hang: "", ten_cua_hang: "" });
  };

  // ✅ Lưu chỉnh sửa qua API
  const handleSaveEdit = async () => {
    if (!editForm.ma_cua_hang || !editForm.ten_cua_hang) {
      message.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    try {
      const result = await phuXeService.updateChbx(editingId, editForm);

      if (result) {
        message.success("Cập nhật thành công!");
        fetchStores(); // Refresh danh sách
        setEditingId(null);
        setEditForm({ ma_cua_hang: "", ten_cua_hang: "" });
      } else {
        message.error("Không thể cập nhật cửa hàng");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      message.error("Không thể cập nhật cửa hàng");
    }
  };

  // ✅ Xóa cửa hàng qua API
  const handleDelete = async (id) => {
    try {
      const result = await phuXeService.deleteChbx(id);

      if (result) {
        message.success("Xóa thành công!");
        fetchStores(); // Refresh danh sách
      } else {
        message.error("Không thể xóa cửa hàng");
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      message.error("Không thể xóa cửa hàng");
    }
  };

  // ✅ Thêm mới cửa hàng qua API
  const handleAdd = async () => {
    if (!addForm.ma_cua_hang || !addForm.ten_cua_hang) {
      message.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    try {
      const result = await phuXeService.addChbx(addForm);

      if (result) {
        message.success("Thêm mới thành công!");
        fetchStores(); // Refresh danh sách
        setAddForm({ ma_cua_hang: "", ten_cua_hang: "" });
        setIsAdding(false);
        if (onStoreAdded) onStoreAdded();
      } else {
        message.error("Không thể thêm cửa hàng");
      }
    } catch (error) {
      console.error("Lỗi khi thêm mới:", error);
      message.error("Không thể thêm cửa hàng");
    }
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Mã Cửa Hàng",
      dataIndex: "ma_cua_hang",
      key: "ma_cua_hang",
      width: 150,
      render: (text, record) => {
        if (editingId === record._id) {
          return (
            <Input
              value={editForm.ma_cua_hang}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  ma_cua_hang: e.target.value,
                }))
              }
              placeholder="VD: CH001"
            />
          );
        }
        return <span className="font-semibold">{text}</span>;
      },
    },
    {
      title: "Tên Cửa Hàng",
      dataIndex: "ten_cua_hang",
      key: "ten_cua_hang",
      render: (text, record) => {
        if (editingId === record._id) {
          return (
            <Input
              value={editForm.ten_cua_hang}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  ten_cua_hang: e.target.value,
                }))
              }
              placeholder="VD: Cửa hàng Quận 1"
            />
          );
        }
        return text;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => {
        if (editingId === record._id) {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={handleSaveEdit}
              >
                Lưu
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
              >
                Hủy
              </Button>
            </Space>
          );
        }

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa?"
              description="Bạn có chắc muốn xóa cửa hàng này?"
              onConfirm={() => handleDelete(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div className="text-lg font-semibold">🏪 Quản Lý Cửa Hàng PX-BX</div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4">
        {isAdding ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mã Cửa Hàng *
                </label>
                <Input
                  value={addForm.ma_cua_hang}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      ma_cua_hang: e.target.value,
                    }))
                  }
                  placeholder="VD: CH001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên Cửa Hàng *
                </label>
                <Input
                  value={addForm.ten_cua_hang}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      ten_cua_hang: e.target.value,
                    }))
                  }
                  placeholder="VD: Cửa hàng Quận 1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setAddForm({ ma_cua_hang: "", ten_cua_hang: "" });
                }}
              >
                Hủy
              </Button>
              <Button type="primary" onClick={handleAdd}>
                Lưu
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAdding(true)}
            className="mb-2"
          >
            Thêm Cửa Hàng Mới
          </Button>
        )}

        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} cửa hàng`,
          }}
          size="small"
          bordered
        />
      </div>
    </Modal>
  );
};

export default ChbxModal;
