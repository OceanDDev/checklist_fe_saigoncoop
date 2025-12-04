import { useState, useRef, useEffect, Fragment } from "react";
import { Button, Popconfirm, InputNumber, Input, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { ttbService } from "@/services/ttb.service";

const TTBTableRow = ({
  record,
  index,
  onDelete,
  isGlobalEditMode = false,
  thietBiList = [],
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editData, setEditData] = useState({});
  const inputRefs = useRef({});

  // Convert tên thiết bị thành key
  const convertToKey = (tenThietBi) => {
    return tenThietBi
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  // Helper function để lấy giá trị thiết bị
  const getTtbValue = (tenTtb, field) => {
    const ttb = record.ttb?.find((t) => t.ten_ttb === tenTtb);
    return ttb?.[field] || 0;
  };

  // Kiểm tra xem có thay đổi dữ liệu không
  const checkIfDataChanged = () => {
    const fields = ["di_ch", "ch_tra_ve"]; // Bỏ can_tru vì nó tự động tính

    for (const thietBi of thietBiList) {
      const key = convertToKey(thietBi.ten_thiet_bi);
      for (const field of fields) {
        const cellKey = `${key}-${field}`;
        const currentValue = getTtbValue(thietBi.ten_thiet_bi, field);
        if (editData[cellKey] !== currentValue) {
          return true;
        }
      }
    }

    if (editData["ghi_chu"] !== record.ghi_chu) return true;

    return false;
  };

  // Lưu tất cả thay đổi
  const handleSaveAll = async () => {
    try {
      // Tạo ttbArray từ thietBiList
      const ttbArray = thietBiList.map((thietBi) => {
        const key = convertToKey(thietBi.ten_thiet_bi);
        const diCh = editData[`${key}-di_ch`] || 0;
        const chTraVe = editData[`${key}-ch_tra_ve`] || 0;
        return {
          ten_ttb: thietBi.ten_thiet_bi,
          di_ch: diCh,
          ch_tra_ve: chTraVe,
          can_tru: diCh - chTraVe, // Tự động tính
        };
      });

      const payload = {
        so_bb: record.so_bb,
        ma_cua_hang: record.ma_cua_hang,
        day: record.day,
        tai_xe: record.tai_xe,
        bien_so_xe: record.bien_so_xe,
        ttb: ttbArray,
        ghi_chu: editData["ghi_chu"] || "",
      };

      const response = await ttbService.updateTtb(record._id, payload);

      if (response?.success) {
        // Silent update
        setEditData({});
        setEditingCell(null);
      }
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      message.error(`Lỗi khi lưu dòng ${index + 1}`);
    }
  };

  // Lắng nghe sự kiện save all
  useEffect(() => {
    const handleSaveAllEvent = () => {
      if (isGlobalEditMode && Object.keys(editData).length > 0) {
        const hasChanges = checkIfDataChanged();
        if (hasChanges) {
          handleSaveAll();
        }
      }
    };

    window.addEventListener("ttb-save-all", handleSaveAllEvent);
    return () => {
      window.removeEventListener("ttb-save-all", handleSaveAllEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobalEditMode, editData, record._id]);

  // Khởi tạo editData khi vào chế độ edit
  useEffect(() => {
    if (isGlobalEditMode && thietBiList.length > 0) {
      const initialData = {};
      const fields = ["di_ch", "ch_tra_ve"]; // Bỏ can_tru vì nó tự động tính

      // Khởi tạo data cho tất cả thiết bị
      thietBiList.forEach((thietBi) => {
        const key = convertToKey(thietBi.ten_thiet_bi);
        fields.forEach((field) => {
          const cellKey = `${key}-${field}`;
          initialData[cellKey] = getTtbValue(thietBi.ten_thiet_bi, field);
        });
      });

      initialData["ghi_chu"] = record.ghi_chu || "";
      setEditData(initialData);
    } else if (!isGlobalEditMode) {
      // Reset khi thoát chế độ edit
      setEditData({});
      setEditingCell(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobalEditMode, record._id]);

  // Danh sách tất cả các cell có thể edit (theo thứ tự)
  const getAllCellKeys = () => {
    const cellKeys = [];
    const fields = ["di_ch", "ch_tra_ve"]; // Bỏ can_tru - không cho edit

    // Thêm các thiết bị động
    thietBiList.forEach((thietBi) => {
      const key = convertToKey(thietBi.ten_thiet_bi);
      fields.forEach((field) => {
        cellKeys.push(`${key}-${field}`);
      });
    });

    cellKeys.push("ghi_chu");
    return cellKeys;
  };

  // Xử lý phím để di chuyển giữa các ô
  const handleKeyDown = (e, currentKey) => {
    const allKeys = getAllCellKeys();
    const currentIndex = allKeys.indexOf(currentKey);

    let nextKey = null;

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: đi ngược lại
        nextKey = currentIndex > 0 ? allKeys[currentIndex - 1] : null;
      } else {
        // Tab: đi tiếp
        nextKey =
          currentIndex < allKeys.length - 1 ? allKeys[currentIndex + 1] : null;
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextKey =
        currentIndex < allKeys.length - 1 ? allKeys[currentIndex + 1] : null;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextKey = currentIndex > 0 ? allKeys[currentIndex - 1] : null;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Di chuyển xuống 2 ô (cùng field, thiết bị tiếp theo)
      nextKey =
        currentIndex < allKeys.length - 2 ? allKeys[currentIndex + 2] : null;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // Di chuyển lên 2 ô
      nextKey = currentIndex >= 2 ? allKeys[currentIndex - 2] : null;
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Enter: đi xuống dòng (2 ô)
      nextKey =
        currentIndex < allKeys.length - 2 ? allKeys[currentIndex + 2] : null;
    }

    if (nextKey) {
      setEditingCell(nextKey);
      setTimeout(() => {
        inputRefs.current[nextKey]?.focus();
        inputRefs.current[nextKey]?.select();
      }, 0);
    }
  };

  // Cập nhật giá trị trong editData
  const handleValueChange = (key, value) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Render cell có thể edit
  const renderEditableCell = (thietBiKey, field, bgColor, tenThietBi) => {
    const cellKey = `${thietBiKey}-${field}`;
    
    // Với cần trừ: tự động tính từ di_ch - ch_tra_ve
    let value;
    if (field === "can_tru") {
      const diCh = isGlobalEditMode
        ? editData[`${thietBiKey}-di_ch`] ?? getTtbValue(tenThietBi, "di_ch")
        : getTtbValue(tenThietBi, "di_ch");
      const chTraVe = isGlobalEditMode
        ? editData[`${thietBiKey}-ch_tra_ve`] ?? getTtbValue(tenThietBi, "ch_tra_ve")
        : getTtbValue(tenThietBi, "ch_tra_ve");
      value = diCh - chTraVe;
    } else {
      value = isGlobalEditMode
        ? editData[cellKey] ?? getTtbValue(tenThietBi, field)
        : getTtbValue(tenThietBi, field);
    }
    
    const isNegative = value < 0;
    const isReadOnly = field === "can_tru"; // Cần trừ là read-only

    return (
      <td
        key={cellKey}
        style={{
          textAlign: "center",
          padding: "8px 4px",
          backgroundColor: isGlobalEditMode && !isReadOnly
            ? editingCell === cellKey
              ? "#e6f7ff"
              : bgColor
            : bgColor,
          border: "1px solid #e8e8e8",
          cursor: isGlobalEditMode && !isReadOnly ? "pointer" : "default",
          transition: "all 0.2s ease",
          position: "relative",
        }}
        onClick={() => isGlobalEditMode && !isReadOnly && setEditingCell(cellKey)}
      >
        {isGlobalEditMode && !isReadOnly ? (
          <InputNumber
            ref={(el) => (inputRefs.current[cellKey] = el)}
            size="small"
            value={value}
            onChange={(val) => handleValueChange(cellKey, val)}
            onKeyDown={(e) => handleKeyDown(e, cellKey)}
            onFocus={() => setEditingCell(cellKey)}
            min={-9999}
            style={{
              width: "75px",
              border:
                editingCell === cellKey
                  ? "2px solid #1890ff"
                  : "1px solid #d9d9d9",
              fontWeight: value < 0 ? 600 : 400,
              color: value < 0 ? "#ff4d4f" : "inherit",
            }}
          />
        ) : (
          <span
            style={{
              display: "block",
              padding: "4px",
              fontWeight: isNegative ? 600 : 400,
              color: isNegative ? "#ff4d4f" : "inherit",
              backgroundColor: isNegative ? "#fff1f0" : "transparent",
              borderRadius: "4px",
              border: isNegative ? "1px solid #ffccc7" : "none",
            }}
          >
            {value}
          </span>
        )}
      </td>
    );
  };

  return (
    <tr
      style={{
        transition: "background-color 0.2s ease",
        "&:hover": { backgroundColor: "#fafafa" },
      }}
    >
      {/* STT - Frozen */}
      <td
        style={{
          textAlign: "center",
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: 0,
          backgroundColor: "#fff",
          zIndex: 1,
          fontWeight: 500,
        }}
      >
        {index + 1}
      </td>

      {/* Ngày đi - Frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: "60px",
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        {dayjs(record.day.ngay_di).format("DD/MM/YYYY")}
      </td>

      {/* Ngày về - Frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: "160px",
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        {dayjs(record.day.ngay_ve).format("DD/MM/YYYY")}
      </td>

      {/* Số BB - Frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: "260px",
          backgroundColor: "#fff",
          zIndex: 1,
          fontWeight: 500,
        }}
      >
        {record.so_bb}
      </td>

      {/* Mã cửa hàng - Frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: "380px",
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        {record.ma_cua_hang}
      </td>

      {/* Tên cửa hàng - Frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          position: "sticky",
          left: "480px",
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        {record.cua_hang}
      </td>

      {/* Tài xế - Không frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          backgroundColor: "#fff",
        }}
      >
        <span>{record.tai_xe || "-"}</span>
      </td>

      {/* Biển số xe - Không frozen */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          backgroundColor: "#fff",
        }}
      >
        <span>{record.bien_so_xe || "-"}</span>
      </td>

      {/* Render động các thiết bị */}
      {thietBiList.map((thietBi, idx) => {
        const key = convertToKey(thietBi.ten_thiet_bi);
        const bgColor = `hsl(${idx * 40}, 70%, 95%)`;

        return (
          <Fragment key={thietBi._id}>
            {renderEditableCell(key, "di_ch", bgColor, thietBi.ten_thiet_bi)}
            {renderEditableCell(
              key,
              "ch_tra_ve",
              bgColor,
              thietBi.ten_thiet_bi
            )}
            {renderEditableCell(key, "can_tru", bgColor, thietBi.ten_thiet_bi)}
          </Fragment>
        );
      })}

      {/* Ghi chú */}
      <td
        style={{
          border: "1px solid #e8e8e8",
          padding: "10px 8px",
          maxWidth: 150,
          backgroundColor:
            isGlobalEditMode && editingCell === "ghi_chu" ? "#e6f7ff" : "#fff",
          cursor: isGlobalEditMode ? "pointer" : "default",
          transition: "all 0.2s ease",
        }}
        onClick={() => isGlobalEditMode && setEditingCell("ghi_chu")}
      >
        {isGlobalEditMode ? (
          <Input.TextArea
            ref={(el) => (inputRefs.current["ghi_chu"] = el)}
            size="small"
            value={editData["ghi_chu"] ?? record.ghi_chu}
            onChange={(e) => handleValueChange("ghi_chu", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "ghi_chu")}
            onFocus={() => setEditingCell("ghi_chu")}
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{
              width: "100%",
              border:
                editingCell === "ghi_chu"
                  ? "2px solid #1890ff"
                  : "1px solid #d9d9d9",
            }}
          />
        ) : (
          <span
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#595959",
            }}
          >
            {record.ghi_chu}
          </span>
        )}
      </td>

      {/* Thao tác - Chỉ hiện khi không ở chế độ edit global */}
      {!isGlobalEditMode && (
        <td
          style={{
            textAlign: "center",
            border: "1px solid #e8e8e8",
            padding: "10px 8px",
            backgroundColor: "#fff",
          }}
        >
          <Popconfirm
            title="Xác nhận xóa?"
            description="Bạn có chắc chắn muốn xóa bản ghi này?"
            onConfirm={() => onDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{ color: "#ff4d4f" }}
            />
          </Popconfirm>
        </td>
      )}
    </tr>
  );
};

TTBTableRow.propTypes = {
  record: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateSuccess: PropTypes.func,
  isGlobalEditMode: PropTypes.bool,
  thietBiList: PropTypes.array.isRequired,
};

export default TTBTableRow;