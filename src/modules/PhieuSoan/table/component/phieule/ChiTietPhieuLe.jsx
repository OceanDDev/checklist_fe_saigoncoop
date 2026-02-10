/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { phieuLeService } from "@/services/phieusoan/phieule.service";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

const ChiTietModal = ({ isOpen, onClose, phieuData, onUpdate }) => {
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editSlotValue, setEditSlotValue] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [editedSkus, setEditedSkus] = useState(new Set());
  const [localChiTiet, setLocalChiTiet] = useState([]);
  const [khoiLuongMap, setKhoiLuongMap] = useState({});
  const [loadingKhoiLuong, setLoadingKhoiLuong] = useState(false);

  const [packUnit1Map, setPackUnit1Map] = useState({});
  const [loadingPackUnit1, setLoadingPackUnit1] = useState(false);

  // ✅ LƯU SLOT GỐC THẬT SỰ (slot ban đầu khi chưa edit)
  const [originalSlots, setOriginalSlots] = useState({});

  const canEdit = phieuData?.trang_thai === "Chờ xử lý";

  const fetchKhoiLuong = async (chiTiet) => {
    if (!chiTiet || chiTiet.length === 0) return null;

    setLoadingKhoiLuong(true);
    try {
      const skuList = chiTiet.map((item) => item.sku).filter(Boolean);

      if (skuList.length === 0) {
        setLoadingKhoiLuong(false);
        return null;
      }

      const result = await dinhViService.getKhoiLuongByMultipleSKU(skuList);
      setKhoiLuongMap(result || {});
      return result || {}; // ✅ Trả về kết quả
    } catch (error) {
      console.error("❌ Lỗi khi lấy khối lượng:", error);
      setKhoiLuongMap({});
      return {};
    } finally {
      setLoadingKhoiLuong(false);
    }
  };

  // ✅ FIX: Trả về kết quả để dùng trực tiếp
  const fetchPackUnit1 = async (chiTiet) => {
    if (!chiTiet || chiTiet.length === 0) return null;

    setLoadingPackUnit1(true);
    try {
      const itemsNeedPack = chiTiet.filter((item) => item.pack_unit === 1);

      if (itemsNeedPack.length === 0) {
        setLoadingPackUnit1(false);
        return null;
      }

      const skuList = itemsNeedPack.map((item) => item.sku).filter(Boolean);

      if (skuList.length === 0) {
        setLoadingPackUnit1(false);
        return null;
      }

      const result = await dinhViService.getPackByMultipleSKU(skuList);
      setPackUnit1Map(result || {});
      return result || {}; // ✅ Trả về kết quả
    } catch (error) {
      console.error("❌ Lỗi khi lấy pack từ DinhVi:", error);
      setPackUnit1Map({});
      return {};
    } finally {
      setLoadingPackUnit1(false);
    }
  };

  // ✅ Load dữ liệu vào modal
  useEffect(() => {
    if (isOpen && phieuData?.chi_tiet) {
      setLocalChiTiet(phieuData.chi_tiet);

      const keyEdited = `edited_${phieuData.so_document}`;
      const keyOriginal = `original_slots_${phieuData.so_document}`;

      // ✅ LẤY HOẶC TẠO SLOT GỐC
      let originalSlotsMap = {};
      const savedOriginal = localStorage.getItem(keyOriginal);

      if (savedOriginal) {
        // Đã có slot gốc trong localStorage → dùng luôn
        originalSlotsMap = JSON.parse(savedOriginal);
      } else {
        // Chưa có → lưu slot hiện tại làm slot gốc (lần đầu tiên mở)
        phieuData.chi_tiet.forEach((item) => {
          originalSlotsMap[item.sku] = item.slot || "";
        });
        localStorage.setItem(keyOriginal, JSON.stringify(originalSlotsMap));
      }

      setOriginalSlots(originalSlotsMap);

      // ✅ LOAD EDITED SKUS
      const savedEdited = localStorage.getItem(keyEdited);
      if (savedEdited) {
        setEditedSkus(new Set(JSON.parse(savedEdited)));
      } else {
        setEditedSkus(new Set());
      }

      fetchKhoiLuong(phieuData.chi_tiet);

      // ✅ Chỉ cần packUnit1Map cho update
      fetchPackUnit1(phieuData.chi_tiet).then((fetchedPackMap) => {
        if (fetchedPackMap) {
          updatePacksToPick1ToDatabase(fetchedPackMap);
        }
      });
    }
  }, [isOpen, phieuData]);

  if (!isOpen) return null;

  const detailColumns = [
    { key: "slot", label: "Slot", editable: true },
    { key: "sku", label: "SKU" },
    { key: "name", label: "Tên hàng" },
    { key: "vendor", label: "Vendor" },
    { key: "quantity", label: "Số lượng" },
    { key: "pack_unit", label: "Pack Unit" },
    { key: "pck_um", label: "Pack UM" },
    { key: "packs_to_pick", label: "Packs to Pick" },
    { key: "khoi_luong", label: "Khối lượng (Kg)" },
    { key: "pack_unit_1", label: "Pack Unit 1" },
    { key: "packs_to_pick_1", label: "Packs to Pick 1" },
  ];

  const handleStartEditSlot = (index, currentSlot) => {
    if (!canEdit) {
      alert("Chỉ có thể chỉnh sửa slot khi phiếu ở trạng thái 'Chờ xử lý'!");
      return;
    }

    setEditingItemIndex(index);
    setEditSlotValue(currentSlot || "");
  };

  const handleCancelEditSlot = () => {
    setEditingItemIndex(null);
    setEditSlotValue("");
  };

  const handleSaveSlot = async (itemIndex) => {
    const item = localChiTiet[itemIndex];
    const oldValue = item?.slot || "";

    if (editSlotValue === oldValue) {
      handleCancelEditSlot();
      return;
    }

    setSavingSlot(true);
    try {
      await phieuLeService.updateChiTietPhieuLe({
        id: phieuData._id,
        sku: item.sku,
        field: "slot",
        value: editSlotValue,
      });

      const updated = [...localChiTiet];
      updated[itemIndex] = { ...item, slot: editSlotValue };
      setLocalChiTiet(updated);

      // ✅ SO SÁNH VỚI SLOT GỐC
      const originalSlot = originalSlots[item.sku] || "";
      const updatedSkus = new Set(editedSkus);

      if (editSlotValue !== originalSlot) {
        updatedSkus.add(item.sku);
      } else {
        updatedSkus.delete(item.sku);
      }

      setEditedSkus(updatedSkus);

      // ✅ LƯU VÀO LOCALSTORAGE
      const keyEdited = `edited_${phieuData.so_document}`;
      if (updatedSkus.size > 0) {
        localStorage.setItem(keyEdited, JSON.stringify([...updatedSkus]));
      } else {
        localStorage.removeItem(keyEdited);
      }

      if (onUpdate) await onUpdate();

      handleCancelEditSlot();
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật slot:", error);
      alert("Không thể cập nhật slot!");
    } finally {
      setSavingSlot(false);
    }
  };

  // ✅ FIX: Nhận packMap làm tham số
  const updatePacksToPick1ToDatabase = async (packMap) => {
    if (!phieuData?.chi_tiet || !packMap || Object.keys(packMap).length === 0) {
      return;
    }

    try {
      const updates = [];

      for (const item of phieuData.chi_tiet) {
        // ✅ CHỈ xử lý item có pack_unit === 1 và THỰC SỰ chưa có packs_to_pick_1
        if (
          item.pack_unit === 1 && 
          (item.packs_to_pick_1 === undefined || item.packs_to_pick_1 === null)
        ) {
          const packFromDinhVi = packMap[item.sku];

          if (packFromDinhVi && packFromDinhVi > 0) {
            // ✅ TÍNH TOÁN VỚI 2 CHỮ SỐ THẬP PHÂN (KHÔNG LÀM TRÒN)
            const rawValue = item.quantity / packFromDinhVi;
            const picksValue = parseFloat(rawValue.toFixed(2)); // ✅ Lưu 1.67, 2.33, v.v.

            updates.push({
              sku: item.sku,
              packs_to_pick_1: picksValue, // ✅ VD: 1.67 thay vì 2
            });
          } else {
            console.log(
              `  ⚠️ SKU ${item.sku}: Không có pack hợp lệ từ DinhVi (${packFromDinhVi})`,
            );
          }
        }
      }

      if (updates.length > 0) {
        console.log(`📤 Updating ${updates.length} items with packs_to_pick_1:`, updates);
        
        try {
          await phieuLeService.updateMultipleChiTiet({
            id: phieuData._id,
            updates: updates,
          });

          
          if (onUpdate) await onUpdate();
        } catch (apiError) {
          console.error("❌ API Error Details:", {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            requestData: {
              id: phieuData._id,
              updates: updates,
            },
          });

          if (apiError.response?.data) {
            console.error(
              "📝 Server Error Message:",
              JSON.stringify(apiError.response.data, null, 2),
            );
          }

          throw apiError;
        }
      } else {
        console.log("⚠️ Không có item nào cần update packs_to_pick_1");
      }
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật packs_to_pick_1:", error);
    }
  };

  // ✅ TÍNH TOÁN PACK_UNIT_1 VÀ PACKS_TO_PICK_1 VỚI QUY TẮC LÀM TRÒN MỚI
  const calculatePackUnit1Values = (item) => {
    if (item.pack_unit !== 1) {
      return { pack_unit_1: null, packs_to_pick_1: null };
    }

    const packFromDinhVi = packUnit1Map[item.sku];

    if (packFromDinhVi && packFromDinhVi > 0) {
      // ✅ Ưu tiên dùng packs_to_pick_1 đã lưu trong DB
      if (item.packs_to_pick_1) {
        return {
          pack_unit_1: packFromDinhVi,
          packs_to_pick_1: item.packs_to_pick_1, // ✅ Hiển thị số thập phân từ DB (VD: 1.67)
        };
      }

      // ✅ Nếu chưa có trong DB, tính toán với 2 chữ số thập phân
      const rawValue = item.quantity / packFromDinhVi;
      const picksValue = parseFloat(rawValue.toFixed(2)); // ✅ 1.67, 2.33, v.v.

      return {
        pack_unit_1: packFromDinhVi,
        packs_to_pick_1: picksValue, // ✅ Hiển thị số thập phân (chưa làm tròn)
      };
    }

    return { pack_unit_1: null, packs_to_pick_1: null };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Chi tiết phiếu lẻ
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Số document:{" "}
              <span className="font-semibold">{phieuData?.so_document}</span>
              {phieuData?.mach && (
                <>
                  {" • "}Mã CH:{" "}
                  <span className="font-semibold">{phieuData.mach}</span>
                </>
              )}
              {phieuData?.tench && (
                <>
                  {" • "}
                  <span className="font-semibold">{phieuData.tench}</span>
                </>
              )}
              {" • "}Quận:{" "}
              <span className="font-semibold">{phieuData?.quan}</span>
              {" • "}Ghi chú CH:{" "}
              <span className="font-semibold">{phieuData?.ghi_chu_ch}</span>
            </p>
            <p className="text-sm text-slate-600 mt-2">
              <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                📦 Tổng khối lượng: {phieuData?.tong_khoi_luong || 0} kg
              </span>
              {" • "}
              <span className="font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg">
                📊 Tổng kiện: {phieuData?.tong_kien || 0}
              </span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-slate-600">Trạng thái:</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  phieuData?.trang_thai === "Chờ xử lý"
                    ? "text-yellow-700 bg-yellow-50 border border-yellow-200"
                    : phieuData?.trang_thai === "Đã xử lý"
                      ? "text-blue-700 bg-blue-50 border border-blue-200"
                      : "text-green-700 bg-green-50 border border-green-200"
                }`}
              >
                {phieuData?.trang_thai}
              </span>
              {!canEdit && (
                <span className="text-xs text-slate-500 italic">
                  (Không thể chỉnh sửa slot)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
            title="Đóng"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {localChiTiet.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Không có chi tiết nào
            </div>
          ) : (
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      #
                    </th>
                    {detailColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {localChiTiet.map((item, idx) => {
                    const isEditingSlot = editingItemIndex === idx;
                    const isEdited = editedSkus.has(item.sku);
                    const khoiLuong = khoiLuongMap[item.sku];
                    const { pack_unit_1, packs_to_pick_1 } =
                      calculatePackUnit1Values(item);

                    return (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 transition-colors ${
                          isEdited ? "bg-yellow-100" : "hover:bg-blue-50"
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {idx + 1}
                        </td>
                        {detailColumns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-3 text-slate-700 whitespace-nowrap"
                          >
                            {col.key === "pack_unit_1" ? (
                              loadingPackUnit1 ? (
                                <span className="text-slate-400 italic text-xs">
                                  Đang tải...
                                </span>
                              ) : pack_unit_1 !== null &&
                                pack_unit_1 !== undefined ? (
                                <span className="font-semibold text-purple-700">
                                  {pack_unit_1}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )
                            ) : col.key === "packs_to_pick_1" ? (
                              loadingPackUnit1 ? (
                                <span className="text-slate-400 italic text-xs">
                                  Đang tải...
                                </span>
                              ) : packs_to_pick_1 !== null &&
                                packs_to_pick_1 !== undefined ? (
                                <span className="font-semibold text-purple-700">
                                  {packs_to_pick_1}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )
                            ) : col.key === "khoi_luong" ? (
                              loadingKhoiLuong ? (
                                <span className="text-slate-400 italic text-xs">
                                  Đang tải...
                                </span>
                              ) : khoiLuong !== undefined &&
                                khoiLuong !== null ? (
                                <span className="font-semibold text-blue-700">
                                  {khoiLuong}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )
                            ) : col.editable && col.key === "slot" ? (
                              <div className="flex items-center gap-2">
                                {isEditingSlot ? (
                                  <>
                                    <input
                                      type="text"
                                      value={editSlotValue}
                                      onChange={(e) =>
                                        setEditSlotValue(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveSlot(idx);
                                        else if (e.key === "Escape")
                                          handleCancelEditSlot();
                                      }}
                                      disabled={savingSlot}
                                      className="flex-1 min-w-0 px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveSlot(idx)}
                                      disabled={savingSlot}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Lưu (Enter)"
                                    >
                                      {savingSlot ? "⏳" : "✓"}
                                    </button>
                                    <button
                                      onClick={handleCancelEditSlot}
                                      disabled={savingSlot}
                                      className="px-2 py-1 text-xs bg-slate-400 text-white rounded hover:bg-slate-500 disabled:opacity-50"
                                      title="Hủy (Esc)"
                                    >
                                      ✕
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 min-w-0">
                                      {String(item?.[col.key] ?? "")}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleStartEditSlot(idx, item[col.key])
                                      }
                                      disabled={!canEdit}
                                      className={`px-2 py-1 text-xs rounded transition-colors ${
                                        canEdit
                                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                                          : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                                      }`}
                                      title={
                                        canEdit
                                          ? "Chỉnh sửa slot"
                                          : "Chỉ có thể chỉnh sửa khi trạng thái 'Chờ xử lý'"
                                      }
                                    >
                                      ✏️
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span>{String(item?.[col.key] ?? "")}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-slate-600 text-white hover:bg-slate-700 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChiTietModal;