import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, Truck, FlaskConical,
  ClipboardList, History, LogOut, Menu, X,
  BarChart2, ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/delivery/new", label: "New Delivery", icon: ClipboardList },
  { to: "/history", label: "History", icon: History },
  { divider: true, label: "MASTER DATA" },
  { to: "/master/customers", label: "Customers", icon: Users },
  { to: "/master/vehicles", label: "Vehicles & Drivers", icon: Truck },
  { to: "/master/design-mix", label: "Design Mix", icon: FlaskConical },
  { divider: true, label: "REPORTS" },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/admin", label: "Admin Panel", icon: ShieldCheck, adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-primary text-white flex flex-col w-56 shrink-0 transition-all ${open ? "" : "hidden md:flex"}`}>
        <div className="px-4 py-5 border-b border-blue-800">
          <p className="font-bold text-accent text-sm leading-tight">Sri Amman RMC</p>
          <p className="text-xs text-blue-300 mt-0.5">Batching ERP</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={idx} className="px-4 pt-4 pb-1">
                  <p className="text-xs font-semibold text-blue-400 tracking-widest uppercase">{item.label}</p>
                </div>
              );
            }
            if (item.adminOnly && user?.role !== "admin") return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-800 transition-colors
                  ${location.pathname === item.to ? "bg-blue-800 text-accent font-medium" : "text-blue-100"}`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-blue-800 text-xs text-blue-300">
          <p className="font-medium text-white">{user?.username}</p>
          <p className="capitalize">{user?.role}</p>
          <button onClick={handleLogout} className="flex items-center gap-1 mt-2 hover:text-white">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 md:hidden no-print">
          <button onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-primary text-sm">Sri Amman RMC</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
