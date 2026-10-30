import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, Camera, Cpu, History, LayoutDashboard, LogOut, User } from "lucide-react";
import { useStore } from "../app/store";

/** Full-screen counter area: status bar on top, no sidebar (docs/03-information-architecture.md, section 3). */
export function PosLayout() {
  const { user, logout, shift, counters, activeBatch } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const counter = counters.find((c) => c.id === shift?.counterId);

  return (
    <div className="pos">
      <header className="pos-bar">
        <span className="row strong"><Boxes size={20} /> HybridCheckout</span>
        <span className="chip">{counter ? counter.name : "Chưa mở ca"}</span>
        {counter && (
          <span className="chip"><i className="dot" style={{ background: counter.cameraOnline ? "#4ade80" : "#f87171" }} />
            <Camera size={14} /> Camera {counter.cameraOnline ? "hoạt động" : "mất kết nối"}</span>
        )}
        <span className="chip"><Cpu size={14} /> Model v{activeBatch}</span>
        <div className="spacer" />
        <span className="chip"><User size={14} /> {user?.name}</span>
        <span className="chip">{now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
        {shift && <NavLink to="/pos/shift" className="btn sm"><History size={16} /> Lịch sử ca</NavLink>}
        {user?.role === "STORE_MANAGER" && <NavLink to="/dashboard" className="btn sm"><LayoutDashboard size={16} /> Quản trị</NavLink>}
        <button className="btn sm" onClick={() => { logout(); navigate("/login"); }}><LogOut size={16} /> Đăng xuất</button>
      </header>
      <Outlet />
    </div>
  );
}
