import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart3, Boxes, Cpu, FileClock, Gauge, LayoutDashboard, LogOut, MonitorSmartphone,
  PackagePlus, Receipt, ScanLine, Settings, SlidersHorizontal, Tags, UserCircle, Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "../app/store";
import { ROLE_LABEL, type Role } from "../mocks/seed";
import { Badge } from "../components/ui";

interface Item { to: string; label: string; icon: ReactNode }
interface Group { title: string; items: Item[] }

/** Menu per role: docs/03-information-architecture.md section 2. */
export const NAV: Record<Exclude<Role, "CASHIER">, Group[]> = {
  STORE_MANAGER: [
    { title: "Cửa hàng", items: [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { to: "/alerts", label: "Cảnh báo & Hậu kiểm", icon: <AlertTriangle size={18} /> },
      { to: "/transactions", label: "Giao dịch", icon: <Receipt size={18} /> },
      { to: "/skus", label: "Danh mục SKU", icon: <Tags size={18} /> },
      { to: "/batches", label: "Đợt nhập SKU", icon: <PackagePlus size={18} /> },
    ] },
    { title: "Model (xem)", items: [
      { to: "/models", label: "Phiên bản model", icon: <Cpu size={18} /> },
      { to: "/monitoring", label: "Giám sát model", icon: <Gauge size={18} /> },
    ] },
  ],
  ML_ENGINEER: [
    { title: "Model", items: [
      { to: "/models", label: "Phiên bản model", icon: <Cpu size={18} /> },
      { to: "/jobs", label: "Job", icon: <FileClock size={18} /> },
      { to: "/thresholds", label: "Ngưỡng nhận diện", icon: <SlidersHorizontal size={18} /> },
      { to: "/monitoring", label: "Giám sát model", icon: <Gauge size={18} /> },
    ] },
    { title: "Dữ liệu", items: [
      { to: "/batches", label: "Đợt nhập SKU", icon: <PackagePlus size={18} /> },
      { to: "/skus", label: "Danh mục SKU", icon: <Tags size={18} /> },
      { to: "/dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
    ] },
  ],
  ADMIN: [
    { title: "Quản trị", items: [
      { to: "/admin/users", label: "Người dùng", icon: <Users size={18} /> },
      { to: "/admin/counters", label: "Quầy & Camera", icon: <MonitorSmartphone size={18} /> },
      { to: "/admin/audit", label: "Nhật ký hệ thống", icon: <FileClock size={18} /> },
      { to: "/admin/settings", label: "Cài đặt lưu trữ", icon: <Settings size={18} /> },
    ] },
  ],
};

export function AdminLayout() {
  const { user, logout, activeBatch } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!user || user.role === "CASHIER") return null;
  const groups = NAV[user.role];
  const current = groups.flatMap((g) => g.items).find((i) => pathname.startsWith(i.to));

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand"><Boxes size={22} /> HybridCheckout</div>
        {groups.map((g) => (
          <div key={g.title}>
            <div className="group">{g.title}</div>
            {g.items.map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? "active" : "")}>{i.icon}{i.label}</NavLink>
            ))}
          </div>
        ))}
        <div className="spacer" />
        {user.role === "STORE_MANAGER" && (
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/pos"); }}><ScanLine size={18} />Mở màn quầy</a>
        )}
      </aside>
      <div>
        <header className="topbar">
          <span className="muted">{current?.label ?? "Hồ sơ"}</span>
          <div className="spacer" />
          <Badge tone="ok">Model đang chạy: v{activeBatch}</Badge>
          <NavLink to="/profile" className="row" style={{ color: "var(--text)" }}>
            <UserCircle size={22} />
            <span className="col" style={{ gap: 0 }}>
              <span className="strong">{user.name}</span>
              <span className="small muted">{ROLE_LABEL[user.role]}</span>
            </span>
          </NavLink>
          <button className="btn ghost sm" onClick={() => { logout(); navigate("/login"); }} aria-label="Đăng xuất"><LogOut size={18} /></button>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}
