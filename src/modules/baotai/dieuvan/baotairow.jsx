/* eslint-disable react/prop-types */
import { memo } from "react";
import { LogIn, LogOut, ChevronDown, Printer, Loader2 } from "lucide-react";
import { SpeakerButton } from "./common";

export const STATUS = {
  CHUA_VAO: "Chưa vào",
  DA_VAO: "Đã vào",
  DANG_XUAT: "Đang Xuất",
  DA_XUAT: "Đã Xuất",
};

const STATUS_BADGE_STYLE = {
  [STATUS.CHUA_VAO]: "bg-slate-100 text-slate-500 border border-slate-200",
  [STATUS.DA_VAO]: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  [STATUS.DANG_XUAT]: "bg-amber-50 text-amber-700 border border-amber-200",
  [STATUS.DA_XUAT]: "bg-sky-50 text-sky-700 border border-sky-200",
};

export const StatusPill = memo(({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
      STATUS_BADGE_STYLE[status] ??
      "bg-slate-100 text-slate-500 border border-slate-200"
    }`}
  >
    {status || STATUS.CHUA_VAO}
  </span>
));
StatusPill.displayName = "StatusPill";

const BaoTaiRow = memo(
  ({
    row,
    idx,
    isDieuVan,
    canEditBsx,
    canShowNvTkCongXuatSpeaker,
    canShowPrintColumn,
    bsxDraft,
    bsxError,
    nvTkList,
    congXuatList,
    isPending, // true khi checkin/uncheck của dòng này đang gọi API -> khoá nút, tránh double-submit
    onBsxChange,
    onBsxBlur,
    onCheckIn,
    onUncheck,
    onNvTkChange,
    onCongXuatChange,
    onPrint,
  }) => {
    return (
      <tr
        className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${
          idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"
        }`}
      >
        <td className="max-w-[220px] px-4 py-3 font-medium text-slate-800">
          {row.nvc}
        </td>
        <td className="max-w-[220px] px-4 py-3 text-xs text-slate-500">
          {row.chuyen || <span className="text-slate-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center font-mono text-xs text-slate-700">
          {row.stt || <span className="text-slate-300">—</span>}
        </td>
        <td className="px-4 py-3">
          {canEditBsx ? (
            <div>
              <input
                value={bsxDraft ?? row.bsx ?? ""}
                onChange={(e) => onBsxChange(row.id, e.target.value)}
                onBlur={() => onBsxBlur(row)}
                placeholder="Biển số"
                className={`w-28 rounded-md border bg-white px-2 py-1.5 font-mono text-xs font-semibold text-slate-900 placeholder-slate-300 outline-none focus:ring-1 ${
                  bsxError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/40"
                    : "border-slate-300 focus:border-amber-500 focus:ring-amber-500/40"
                }`}
              />
              {bsxError && (
                <p className="mt-1 w-28 whitespace-normal text-[10px] leading-tight text-rose-500">
                  {bsxError}
                </p>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs font-semibold text-slate-900">
              {row.bsx || <span className="text-slate-300">—</span>}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isDieuVan ? (
            row.status === STATUS.CHUA_VAO ? (
              <button
                onClick={() => onCheckIn(row)}
                disabled={isPending}
                className="flex items-center justify-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                CHECKIN
              </button>
            ) : row.status === STATUS.DA_VAO ? (
              <button
                onClick={() => onUncheck(row)}
                disabled={isPending}
                className="flex items-center justify-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                UNCHECK
              </button>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">
          {row.thoiGianVao || <span className="text-slate-300">—</span>}
        </td>
        <td className="px-4 py-3">
          <StatusPill status={row.status} />
        </td>
        {canShowNvTkCongXuatSpeaker && (
          <>
            <td className="px-4 py-3">
              <div className="relative w-32">
                <select
                  value={row.nvTk || ""}
                  onChange={(e) => onNvTkChange(row.id, e.target.value)}
                  className={`w-full appearance-none rounded-md border bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium outline-none focus:ring-1 focus:ring-amber-500/40 ${
                    row.nvTk
                      ? "border-amber-400 text-amber-700"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  <option value="">Chọn NV</option>
                  {nvTkList.map((it) => (
                    <option key={it.id} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="relative w-32">
                <select
                  value={row.congXuat || ""}
                  onChange={(e) => onCongXuatChange(row.id, e.target.value)}
                  className={`w-full appearance-none rounded-md border bg-white py-1.5 pl-2.5 pr-7 font-mono text-xs font-medium outline-none focus:ring-1 focus:ring-amber-500/40 ${
                    row.congXuat
                      ? "border-amber-400 text-amber-700"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  <option value="">Chọn cổng</option>
                  {congXuatList.map((it) => (
                    <option key={it.id} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <SpeakerButton label="XE" tone="xe" />
                <SpeakerButton label="NV" tone="nv" />
              </div>
            </td>
          </>
        )}
        {canShowPrintColumn && (
          <td className="px-4 py-3 text-center">
            {row.status !== STATUS.CHUA_VAO ? (
              <button
                onClick={() => onPrint(row)}
                title="In phiếu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-600"
              >
                <Printer className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )}
          </td>
        )}
      </tr>
    );
  },
  // So sánh tùy chỉnh: chỉ re-render dòng khi chính dòng đó, draft/error, hoặc
  // trạng thái pending của nó đổi.
  (prev, next) =>
    prev.row === next.row &&
    prev.bsxDraft === next.bsxDraft &&
    prev.bsxError === next.bsxError &&
    prev.idx === next.idx &&
    prev.isPending === next.isPending &&
    prev.nvTkList === next.nvTkList &&
    prev.congXuatList === next.congXuatList,
);

BaoTaiRow.displayName = "BaoTaiRow";

export default BaoTaiRow;
