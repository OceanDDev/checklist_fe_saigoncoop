// utils/dataload.utils.js
import dayjs from "dayjs";

export const COLOR = {
  YELLOW: { argb: "FFFFFF00" }, // phần đầu cố định
  BLUE: { argb: "FFBDD7EE" }, // SKU lẻ (1, 3, 5...)
  ORANGE: { argb: "FFFCE4D6" }, // SKU chẵn (2, 4, 6...)
  WHITE: { argb: "FFFFFFFF" }, // maCH, ngày, tenPhanBo
};

export const buildCells = (group, ngay) => {
  const { YELLOW: Y, BLUE: B, ORANGE: O, WHITE: W } = COLOR;

  const cells = [
    { value: "\\{F5}", color: Y },
    { value: "\\{TAB}", color: Y },
    { value: `\\{${group.mach}}`, color: W },
    { value: "\\{ENTER}", color: Y },
    { value: "\\{END}", color: Y },
    { value: `\\{${ngay}}`, color: W },
    { value: "\\{TAB}", color: Y },
    { value: `\\{${group.ten_phan_bo}}`, color: W },
    { value: "\\{ENTER}", color: Y },
    { value: "\\{F5}", color: Y },
    { value: "\\{F4}", color: Y },
  ];

  group.items.forEach(({ sku, luong_phan_bo }, idx) => {
    // xen kẽ xanh / cam theo index SKU
    const skuColor = idx % 2 === 0 ? B : O;

    cells.push(
      { value: `\\{${sku}}`, color: skuColor },
      { value: "\\{END}", color: skuColor },
      { value: "TAB", color: skuColor },
      { value: "\\{ENTER}", color: skuColor },
      { value: `\\{${luong_phan_bo}}`, color: skuColor },
      { value: "\\{ENTER}", color: skuColor },
    );
  });

  cells.push({ value: "\\{F1}", color: Y });
  return cells;
};
/**
 * Nhóm rows theo (mach + ten_phan_bo) → mỗi nhóm = 1 dòng dataload
 */
export const groupByStore = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.mach}||${row.ten_phan_bo}`;
    if (!map.has(key)) {
      map.set(key, { mach: row.mach, ten_phan_bo: row.ten_phan_bo, items: [] });
    }
    map.get(key).items.push({ sku: row.sku, luong_phan_bo: row.luong_phan_bo });
  }
  return Array.from(map.values());
};

/** Ngày hiện tại format DDMMYY (vd: 070526) */
export const getNgay = () => dayjs().format("DDMMYY");
