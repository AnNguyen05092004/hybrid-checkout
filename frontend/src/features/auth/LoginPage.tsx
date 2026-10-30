import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Boxes, Eye, EyeOff, ScanBarcode, Camera, ShieldCheck } from "lucide-react";
import { useStore } from "../../app/store";
import { HOME } from "../../app/home";
import { DEMO_USER, ROLE_LABEL, type Role } from "../../mocks/seed";

/** S01 — Login. */
export function LoginPage() {
  const { user, login, users, log } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const enter = (role: Role) => {
    login(DEMO_USER[role]);
    log("LOGIN", "—", `${DEMO_USER[role].name} đăng nhập`);
    navigate(HOME[role]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = users.find((x) => x.email === email.trim() && x.active);
    // Prototype: any password of 8+ characters is accepted for an active account.
    if (!u || password.length < 8) return setError("Email hoặc mật khẩu không đúng.");
    login(u);
    navigate(HOME[u.role]);
  };

  return (
    <div style={{ minHeight: "100%", display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>
      <section style={{ background: "#0b2b2b", color: "#e2efee", padding: 48, display: "flex", flexDirection: "column", gap: 28, justifyContent: "center" }}>
        <div className="row" style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}><Boxes size={28} /> HybridCheckout</div>
        <h1 style={{ fontSize: 34, lineHeight: 1.25, color: "#fff", maxWidth: 520 }}>Mã vạch tính tiền,<br />camera kiểm tra khay.</h1>
        <p style={{ maxWidth: 520, color: "#a9c7c5", fontSize: 15 }}>
          Hệ thống thanh toán tại quầy kết hợp mã vạch và thị giác máy tính: phát hiện món chưa quét trước khi khách trả tiền,
          làn nhanh cho khay nhiều món, và cập nhật model khi cửa hàng nhập hàng mới.
        </p>
        <div className="col" style={{ gap: 12, color: "#cfe3e2" }}>
          <span className="row"><ScanBarcode size={18} /> Kiểm tra chéo danh sách quét với ảnh khay</span>
          <span className="row"><Camera size={18} /> Làn nhanh: camera đề xuất, thu ngân quét bổ sung</span>
          <span className="row"><ShieldCheck size={18} /> Cảnh báo nghiêm trọng cần quản lý xác nhận</span>
        </div>
      </section>
      <section style={{ display: "grid", placeItems: "center", padding: 32 }}>
        <div className="col" style={{ width: "min(380px, 100%)", gap: 20 }}>
          <div>
            <h1>Đăng nhập</h1>
            <p className="muted" style={{ marginTop: 6 }}>Dùng tài khoản do quản trị viên cấp.</p>
          </div>
          <form className="col" style={{ gap: 14 }} onSubmit={submit}>
            <label className="field"><span>Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label className="field"><span>Mật khẩu</span>
              <span className="row" style={{ gap: 0 }}>
                <input className="input" style={{ flex: 1, borderRadius: "6px 0 0 6px" }} type={show ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="btn" style={{ borderRadius: "0 6px 6px 0", borderLeft: 0 }} onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            {error && <div className="badge danger" role="alert" style={{ height: "auto", padding: "8px 10px" }}>{error}</div>}
            <button className="btn primary lg block" type="submit">Đăng nhập</button>
          </form>
          <div className="sim col">
            <span className="small strong" style={{ color: "var(--info)" }}>Tài khoản demo (chỉ có trong prototype)</span>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.keys(DEMO_USER) as Role[]).map((r) => (
                <button key={r} className="btn" onClick={() => enter(r)}>{ROLE_LABEL[r]}</button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
