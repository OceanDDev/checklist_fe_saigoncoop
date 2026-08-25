/* eslint-disable react/prop-types */
import { useState } from "react";
import { Settings2, Plus, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { ModalShell } from "./common";

// TODO: chưa có service riêng cho danh mục Cổng xuất trong baotai.service.js.
// Khi có API (vd: congXuatService.getAll / create / update / remove) thì nối vào
// các hàm addItem / saveEdit / removeItem bên dưới, tương tự cách baoTaiService
// đang được dùng ở component cha.
export default function CongXuatModal({ items, setItems, onClose }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    setItems((prev) => [...prev, { id: `cx-${Date.now()}`, name: value }]);
    setDraft("");
    // TODO: gọi API tạo Cổng xuất, vd: congXuatService.create({ name: value })
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const saveEdit = (id) => {
    const value = editingValue.trim();
    if (!value) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name: value } : it)),
    );
    setEditingId(null);
    setEditingValue("");
    // TODO: gọi API cập nhật Cổng xuất, vd: congXuatService.update(id, { name: value })
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    // TODO: gọi API xóa Cổng xuất, vd: congXuatService.remove(id)
  };

  return (
    <ModalShell
      title="Quản lý Cổng xuất"
      icon={<Settings2 className="h-5 w-5 text-amber-500" />}
      onClose={onClose}
    >
      <div className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Ví dụ: Cổng 7"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
        />
        <button
          onClick={addItem}
          className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Thêm
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Chưa có dữ liệu. Thêm mục đầu tiên ở trên.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
                  className="flex-1 rounded-md border border-amber-400 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-amber-500/40"
                />
              ) : (
                <span className="text-sm text-slate-700">{item.name}</span>
              )}

              <div className="flex items-center gap-1">
                {editingId === item.id ? (
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                    title="Lưu"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Sửa"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}