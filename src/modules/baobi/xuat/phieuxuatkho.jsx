/* eslint-disable react/prop-types */
// components/baobi/PhieuXuatKho.jsx
import { forwardRef } from "react";
import dayjs from "dayjs";

const KHO_XUAT_DEFAULT =
  "Kho vệ tinh Bình Dương - Lô MN, Đường số 10, KCN Sóng Thần 1, Dĩ An, Bình Dương";

const MIN_ROWS = 7; // giữ layout giống mẫu giấy, dư dòng trống

const PhieuXuatKho = forwardRef(function PhieuXuatKho({ data }, ref) {
  if (!data) return null;

  const {
    ngay = dayjs().format("DD/MM/YYYY"),
    khoXuat = KHO_XUAT_DEFAULT,
    tenCH = "",
    maCH = "",
    items = [],
  } = data;

  const rows = [...items];
  while (rows.length < MIN_ROWS) rows.push(null);

  return (
    <div ref={ref} className="phieu-xuat-print-root">
      <style>{`
        .phieu-xuat-print-root { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 14mm 12mm; }
          body * { visibility: hidden; }
          .phieu-xuat-print-root,
          .phieu-xuat-print-root * { visibility: visible; }
          .phieu-xuat-print-root {
            display: block;
            position: absolute;
            top: 0; left: 0;
            width: 100%;
          }
        }

        .pxk-doc { font-family: "Times New Roman", Times, serif; color: #111; font-size: 13px; line-height: 1.45; }
        .pxk-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .pxk-company { font-weight: 700; text-transform: uppercase; max-width: 60%; }
        .pxk-date { text-align: right; white-space: nowrap; }
        .pxk-title { text-align: center; font-weight: 700; font-size: 20px; letter-spacing: 1px; margin: 14px 0 16px; text-transform: uppercase; }
        .pxk-line { margin: 2px 0; }
        .pxk-store-row { display: flex; justify-content: space-between; align-items: baseline; margin: 10px 0 12px; }
        .pxk-store-name, .pxk-store-code { font-weight: 700; }
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
      `}</style>

      <div className="pxk-doc">
        <div className="pxk-header">
          <div className="pxk-company">Công Ty TNHH MTV Kho Vận Saigon Co.op</div>
          <div className="pxk-date">Ngày: {ngay}</div>
        </div>

        <div className="pxk-title">Phiếu Xuất Kho</div>

        <div className="pxk-line">Xuất từ kho: {khoXuat}</div>

        <div className="pxk-store-row">
          <div>
            Đến cửa hàng:&nbsp;<span className="pxk-store-name">{tenCH || "-"}</span>
          </div>
          <div>
            Store:&nbsp;<span className="pxk-store-code">{maCH || "-"}</span>
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

        <div className="pxk-note">Số tiền bằng chữ: Hàng không có giá trị thanh toán</div>

        <div className="pxk-signatures">
          {["Người Lập Phiếu", "Thủ Kho", "BĐH Kho", "Người Nhận Hàng"].map((t) => (
            <div key={t}>
              <div className="pxk-sig-title">{t}</div>
              <div className="pxk-sig-sub">(Ký, ghi rõ họ tên)</div>
              <div className="pxk-sig-space" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default PhieuXuatKho;