import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "../../app/store";
import { Badge, Card, Modal, PageHeader, Stat } from "../../components/ui";
import { dateTime } from "../../lib/format";
import { ROLE_LABEL, type Role, type User } from "../../mocks/seed";

/** A01 — Users (US24). */
export function UsersPage() {
  const { users, setUsers, user: me, log, toast } = useStore();
  const [editing, setEditing] = useState<User | null>(null);
  const isNew = editing && !users.some((u) => u.id === editing.id);
  const dupEmail = editing && users.some((u) => u.email === editing.email && u.id !== editing.id);

  const save = () => {
    if (!editing) return;
    setUsers(isNew ? [...users, editing] : users.map((u) => (u.id === editing.id ? editing : u)));
    log(isNew ? "CREATE_USER" : "UPDATE_USER", editing.email, `${ROLE_LABEL[editing.role]}, ${editing.active ? "hoạt động" : "khóa"}`);
    toast(isNew ? "Đã tạo tài khoản. Mật khẩu tạm đã gửi qua email." : "Đã lưu tài khoản.");
    setEditing(null);
  };

  return (
    <>
      <PageHeader title="Người dùng" actions={<button className="btn primary" onClick={() => setEditing({ id: `u${Date.now()}`, name: "", email: "", role: "CASHIER", active: true, lastLogin: "" })}><Plus size={16} /> Thêm người dùng</button>} />
      <div className="stats">
        <Stat label="Tổng tài khoản" value={users.length} />
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <Stat key={r} label={ROLE_LABEL[r]} value={users.filter((u) => u.role === r).length} />)}
        <Stat label="Đang khóa" value={users.filter((u) => !u.active).length} tone="warn" />
      </div>
      <Card bodyClass="">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th /></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td className="strong">{u.name}</td><td>{u.email}</td><td>{ROLE_LABEL[u.role]}</td>
              <td>{u.active ? <Badge tone="ok">Hoạt động</Badge> : <Badge tone="danger">Khóa</Badge>}</td>
              <td>{u.lastLogin ? dateTime(u.lastLogin) : "Chưa từng"}</td>
              <td className="row">
                <button className="btn sm" onClick={() => setEditing(u)}>Sửa</button>
                <button className="btn sm" onClick={() => toast(`Đã gửi mật khẩu tạm cho ${u.email}.`)}>Đặt lại mật khẩu</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      {editing && (
        <Modal title={isNew ? "Thêm người dùng" : "Sửa người dùng"} onClose={() => setEditing(null)} footer={<>
          <button className="btn" onClick={() => setEditing(null)}>Hủy</button>
          <button className="btn primary" disabled={!editing.name.trim() || !/^\S+@\S+\.\S+$/.test(editing.email) || !!dupEmail} onClick={save}>Lưu</button>
        </>}>
          <label className="field"><span>Họ tên</span><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
          <label className="field"><span>Email</span><input className="input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            {dupEmail && <span className="small" style={{ color: "var(--danger)" }}>Email đã được dùng.</span>}</label>
          <label className="field"><span>Vai trò</span>
            <select className="select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select></label>
          <label className="row"><input type="checkbox" checked={editing.active} disabled={editing.id === me?.id} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Tài khoản hoạt động
            {editing.id === me?.id && <span className="small faint">(không tự khóa chính mình)</span>}</label>
        </Modal>
      )}
    </>
  );
}
