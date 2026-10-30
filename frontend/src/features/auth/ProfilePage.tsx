import { useState } from "react";
import { useStore } from "../../app/store";
import { Card, PageHeader } from "../../components/ui";
import { ROLE_LABEL } from "../../mocks/seed";

/** S02 — Profile. */
export function ProfilePage() {
  const { user, toast } = useStore();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pin, setPin] = useState("");
  if (!user) return null;
  const pwError = pw.next && pw.next.length < 8 ? "Mật khẩu mới cần ít nhất 8 ký tự." : pw.confirm && pw.confirm !== pw.next ? "Xác nhận không khớp." : "";

  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <Card title="Thông tin tài khoản">
          <div className="col" style={{ gap: 12 }}>
            <div><div className="small muted">Họ tên</div><div className="strong">{user.name}</div></div>
            <div><div className="small muted">Email</div><div>{user.email}</div></div>
            <div><div className="small muted">Vai trò</div><div>{ROLE_LABEL[user.role]} <span className="small faint">(chỉ quản trị viên đổi được)</span></div></div>
            <div><div className="small muted">Cửa hàng</div><div>Cửa hàng demo — 12 Nguyễn Trãi</div></div>
          </div>
        </Card>
        <Card title="Đổi mật khẩu">
          <form className="col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); toast("Đã đổi mật khẩu."); setPw({ current: "", next: "", confirm: "" }); }}>
            <label className="field"><span>Mật khẩu hiện tại</span><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
            <label className="field"><span>Mật khẩu mới</span><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></label>
            <label className="field"><span>Xác nhận mật khẩu mới</span><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></label>
            {pwError && <span className="small" style={{ color: "var(--danger)" }}>{pwError}</span>}
            <button className="btn primary" disabled={!!pwError || !pw.current}>Lưu mật khẩu</button>
          </form>
        </Card>
        {user.role === "STORE_MANAGER" && (
          <Card title="PIN quản lý">
            <div className="col" style={{ gap: 12 }}>
              <p className="small muted">PIN 6 số dùng để xác nhận tại quầy (báo nhầm, xóa dòng, hủy giao dịch). PIN không hiển thị lại sau khi lưu. PIN demo hiện tại: <b>246810</b>.</p>
              <input className="input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="6 chữ số" />
              <button className="btn primary" disabled={pin.length !== 6} onClick={() => { toast("Đã cập nhật PIN quản lý."); setPin(""); }}>Lưu PIN</button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
