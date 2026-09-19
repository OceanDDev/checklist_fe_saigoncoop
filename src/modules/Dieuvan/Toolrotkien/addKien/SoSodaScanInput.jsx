/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractSodaCode } from "@/utils/extractSodaCode";

let uidCounter = 0;
const makeRow = (text = "") => ({
  id: `row-${++uidCounter}`,
  text,
  error: "",
  awaitingConfirm: false, // true khi mã trùng hệ thống, đang chờ bấm nút xác nhận
});

// existingCodes: mảng mã đã tồn tại từ trước (toàn hệ thống), dùng để bắt trùng
// existingCodeCounts: { [code]: số lần mã đó đã xuất hiện trong hệ thống }
const SoSodaScanInput = ({
  initialCodes = [],
  existingCodes = [],
  existingCodeCounts = {},
  onCodesChange,
  onDuplicateConfirmed, // (code) => void — gọi khi bấm nút xác nhận trùng có chủ đích
  duplicateActionLabel, // VD: "Rớt lần 2" — nếu không truyền, dùng hành vi chặn cứng như cũ
  maxDuplicateCount = 2, // số lần tối đa được phép "rớt" cho cùng 1 mã
  placeholder,
}) => {
  const [rows, setRows] = useState(() => {
    const base = initialCodes.length ? initialCodes.map((c) => makeRow(c)) : [];
    return [...base, makeRow("")];
  });
  const inputRefs = useRef({});
 useEffect(() => {
    const firstRowId = rows[0]?.id;
    if (firstRowId) {
      requestAnimationFrame(() => {
        inputRefs.current[firstRowId]?.focus();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const codes = rows.map((r) => r.text.trim()).filter(Boolean);
    const hasError = rows.some((r) => r.error);
    onCodesChange?.(codes, hasError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const openNewRowAfter = (updatedRows, idx) => {
    const isLastRow = idx === updatedRows.length - 1;
    if (!isLastRow) return updatedRows;
    const newRow = makeRow("");
    const finalRows = [...updatedRows, newRow];
    requestAnimationFrame(() => inputRefs.current[newRow.id]?.focus());
    return finalRows;
  };

  const commitRow = useCallback(
    (id, rawText) => {
      const code = extractSodaCode(rawText);
      if (!code.trim()) return;
      const trimmedCode = code.trim();

      const inputEl = inputRefs.current[id];
      if (inputEl) inputEl.value = code;

      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === id);
        if (idx === -1) return prev;

        // Đã xử lý xong mã này rồi (không lỗi, không chờ xác nhận) -> khỏi làm lại
        if (
          prev[idx].text === code &&
          !prev[idx].error &&
          !prev[idx].awaitingConfirm
        ) {
          return prev;
        }

        const dupInForm = prev.some(
          (r, i) => i !== idx && r.text.trim() === trimmedCode,
        );

        // Trùng ngay trong file/lần quét hiện tại -> luôn chặn cứng (khả năng cao là quét lặp do sự cố)
        if (dupInForm) {
          return prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  text: code,
                  error: "Mã này đã quét rồi (trùng trong danh sách)",
                  awaitingConfirm: false,
                }
              : r,
          );
        }

        const dupInSystem = existingCodes.includes(trimmedCode);
        // Nếu không có count riêng nhưng biết là trùng hệ thống -> mặc định tính là đã 1 lần
        const dupCount = existingCodeCounts[trimmedCode] ?? (dupInSystem ? 1 : 0);

        // Trùng với mã đã có trong hệ thống
        if (dupInSystem) {
          // Đã đạt số lần tối đa -> chặn cứng, không cho xác nhận thêm nữa
          if (dupCount >= maxDuplicateCount) {
            return prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    text: code,
                    error: `Mã này đã Rớt Kiện ${dupCount} lần, không thể thêm lần nữa`,
                    awaitingConfirm: false,
                  }
                : r,
            );
          }

          if (duplicateActionLabel) {
            // Cho phép xác nhận trùng có chủ đích (VD: Rớt lần 2) — chưa cho qua
            // ngay, chờ người dùng bấm nút xác nhận
            return prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    text: code,
                    error: "Mã này đã tồn tại trong hệ thống",
                    awaitingConfirm: true,
                  }
                : r,
            );
          }
          // Không hỗ trợ xác nhận -> chặn cứng như hành vi cũ
          return prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  text: code,
                  error: "Mã này đã tồn tại trong hệ thống",
                  awaitingConfirm: false,
                }
              : r,
          );
        }

        const updated = prev.map((r) =>
          r.id === id
            ? { ...r, text: code, error: "", awaitingConfirm: false }
            : r,
        );
        return openNewRowAfter(updated, idx);
      });
    },
    [existingCodes, existingCodeCounts, duplicateActionLabel, maxDuplicateCount],
  );

  const confirmDuplicate = useCallback(
    (id) => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === id);
        if (idx === -1) return prev;
        const code = prev[idx].text.trim();

        const updated = prev.map((r) =>
          r.id === id ? { ...r, error: "", awaitingConfirm: false } : r,
        );
        onDuplicateConfirmed?.(code);
        return openNewRowAfter(updated, idx);
      });
    },
    [onDuplicateConfirmed],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.target.blur();
    }
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      return remaining.length ? remaining : [makeRow("")];
    });
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={row.id}>
          <div className="flex items-center gap-2">
            <Input
              ref={(el) => (inputRefs.current[row.id] = el)}
              defaultValue={row.text}
              onKeyDown={handleKeyDown}
              onBlur={(e) => commitRow(row.id, e.target.value)}
              placeholder={
                idx === 0
                  ? placeholder || "Quét mã QR (Enter để lưu và mở ô mới)"
                  : "Quét mã tiếp theo..."
              }
              className={[
                "h-11 text-[15px] font-mono text-slate-900 placeholder:text-slate-400",
                row.error ? "border-rose-500 ring-2 ring-rose-500" : "",
              ].join(" ")}
            />

            {row.awaitingConfirm && duplicateActionLabel && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-11 px-3 text-xs font-semibold whitespace-nowrap border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={() => confirmDuplicate(row.id)}
              >
                {duplicateActionLabel}
              </Button>
            )}

            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-rose-500 hover:text-rose-700 text-sm font-bold px-2"
                title="Xóa ô này"
              >
                ✕
              </button>
            )}
          </div>
          {row.error && (
            <p className="text-xs text-rose-600 mt-1 ml-1">⚠ {row.error}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SoSodaScanInput;