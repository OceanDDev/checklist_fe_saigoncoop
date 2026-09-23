/* eslint-disable react/prop-types */
// components/baobi/PhieuXuatKho.jsx
import { forwardRef } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";

const KHO_XUAT_DEFAULT =
  "Kho vệ tinh Bình Dương - Lô MN, Đường số 10, KCN Sóng Thần 1, Dĩ An, Bình Dương";

const MIN_ROWS = 7; // giữ layout giống mẫu giấy, dư dòng trống

// Tách "5 Kiện - V15" -> { soKien: "5", ghiChuNote: "V15" }
const parseGhiChu = (ghiChu) => {
  if (!ghiChu) return { soKien: "", ghiChuNote: "" };
  const match = ghiChu.match(/^(\d+)\s*Kiện(?:\s*-\s*(.*))?$/);
  if (match) {
    return { soKien: match[1], ghiChuNote: match[2] || "" };
  }
  // Không khớp dạng "x Kiện..." -> coi cả chuỗi là ghi chú
  return { soKien: "", ghiChuNote: ghiChu };
};

const PhieuXuatKho = forwardRef(function PhieuXuatKho({ data }, ref) {
  if (!data) return null;

  const {
    ngay = dayjs().format("DD/MM/YYYY"),
    khoXuat = KHO_XUAT_DEFAULT,
    tenCH = "",
    maCH = "",
    soPhieu = "",
    ghiChu = "",
    tenNguoiLap = "", // MỚI
    items = [],
  } = data;

  const { soKien, ghiChuNote } = parseGhiChu(ghiChu);

  const rows = [...items];
  while (rows.length < MIN_ROWS) rows.push(null);

  // MỚI — mảng chữ ký, gắn tên người lập vào đúng cột
  const signatures = [
    { title: "Người Lập Phiếu", name: tenNguoiLap },
    { title: "Thủ Kho", name: "" },
    { title: "BĐH Kho", name: "" },
    { title: "Người Nhận Hàng", name: "" },
  ];

  const content = (
    <div ref={ref} className="phieu-xuat-print-root">
      <style>{`
        .phieu-xuat-print-root { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 14mm 12mm; }

          html, body {
            height: auto !important;
          }

          /* Ẩn toàn bộ app (kể cả phần layout chiếm chỗ), chỉ giữ lại phiếu in */
          #root {
            display: none !important;
          }

          .phieu-xuat-print-root {
            display: block !important;
            position: static;
            width: 100%;
          }
        }

        .pxk-doc { font-family: "Times New Roman", Times, serif; color: #111; font-size: 13px; line-height: 1.45; }
        .pxk-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .pxk-company { font-weight: 700; text-transform: uppercase; max-width: 60%; }
        .pxk-date { text-align: right; white-space: nowrap; }
        .pxk-title { text-align: center; font-weight: 700; font-size: 20px; letter-spacing: 1px; margin: 14px 0 16px; text-transform: uppercase; }
        .pxk-line { margin: 2px 0; }
        .pxk-store-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 10px 0 12px; }
        .pxk-store-name, .pxk-store-code { font-weight: 700; }
        .pxk-sub-line { margin-top: 3px; font-size: 12px; }
        table.pxk-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.pxk-table th, table.pxk-table td { border: 1px solid #111; padding: 5px 6px; }
        table.pxk-table th { text-align: center; font-weight: 700; background: #f2f2f2; }
        table.pxk-table td.pxk-stt, table.pxk-table th.pxk-stt { width: 34px; text-align: center; }
        table.pxk-table td.pxk-sku, table.pxk-table th.pxk-sku { width: 90px; }
        table.pxk-table td.pxk-sl, table.pxk-table th.pxk-sl { width: 70px; text-align: right; }
        table.pxk-table td.pxk-dvt, table.pxk-table th.pxk-dvt { width: 60px; text-align: center; }
        .pxk-note { margin-top: 10px; font-style: italic; }
        .pxk-signatures { margin-top: 34px; display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; gap: 8px; }
        .pxk-sig-title { font-weight: 700; }
        .pxk-sig-sub { font-style: italic; font-size: 11.5px; margin-top: 2px; }
        .pxk-sig-space { height: 62px; }
        .pxk-sig-name { margin-top: 4px; font-weight: 700; text-transform: uppercase; }
      `}</style>

      <div className="pxk-doc">
        <div className="pxk-header">
          <div className="pxk-company">
            Công Ty TNHH MTV Kho Vận Saigon Co.op
          </div>
          <div className="pxk-date">Ngày: {ngay}</div>
        </div>

        <div className="pxk-title">Phiếu Xuất Kho</div>

        <div className="pxk-line">Xuất từ kho: {khoXuat}</div>

        <div className="pxk-store-row">
          <div>
            <div>
              Đến cửa hàng:&nbsp;
              <span className="pxk-store-name">{tenCH || "-"}</span>
            </div>
            <div className="pxk-sub-line">
              Số phiếu: <span className="pxk-store-code">{soPhieu || "-"}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              Store:&nbsp;<span className="pxk-store-code">{maCH || "-"}</span>
            </div>
            <div className="pxk-sub-line">
              Số kiện:{" "}
              <span className="pxk-store-code">
                {soKien ? `${soKien} Kiện` : "-"}
              </span>
            </div>
          </div>
        </div>

        <table className="pxk-table">
          <thead>
            <tr>
              <th className="pxk-stt">STT</th>
              <th className="pxk-sku">SKU</th>
              <th>Tên Hàng</th>
              <th className="pxk-sl">Số Lượng</th>
              <th className="pxk-dvt">Dvt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, idx) => (
              <tr key={idx}>
                <td className="pxk-stt">{idx + 1}</td>
                <td className="pxk-sku">{item?.sku || ""}</td>
                <td>{item?.name || ""}</td>
                <td className="pxk-sl">{item?.luong_xuat ?? ""}</td>
                <td className="pxk-dvt">{item ? item.dvt || "EA" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pxk-note">
          Số tiền bằng chữ: Hàng không có giá trị thanh toán
        </div>
        {ghiChuNote && <div className="pxk-note">Ghi chú: {ghiChuNote}</div>}

        <div className="pxk-signatures">
          {signatures.map(({ title, name }) => (
            <div key={title}>
              <div className="pxk-sig-title">{title}</div>
              <div className="pxk-sig-sub">(Ký, ghi rõ họ tên)</div>
              <div className="pxk-sig-space" />
              {name && <div className="pxk-sig-name">{name}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

export default PhieuXuatKho;
