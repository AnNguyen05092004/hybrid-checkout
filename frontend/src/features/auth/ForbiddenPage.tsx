import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useStore } from "../../app/store";
import { HOME } from "../../app/home";

/** S03 — No permission. */
export function ForbiddenPage() {
  const { user } = useStore();
  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center" }}>
      <div className="empty card" style={{ padding: 40, maxWidth: 420 }}>
        <ShieldOff size={40} color="var(--danger)" />
        <h2>Bạn không có quyền vào trang này</h2>
        <p className="muted">Trang này dành cho vai trò khác. Nếu cần quyền, hãy liên hệ quản trị viên.</p>
        <Link className="btn primary" to={user ? HOME[user.role] : "/login"}>Về trang chính</Link>
      </div>
    </div>
  );
}
