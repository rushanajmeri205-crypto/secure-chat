import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-dvh flex flex-col bg-[var(--wa-bg)]">
      <header className="bg-[var(--wa-green)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate("/")} className="text-white">
            ←
          </button>
          <h1 className="text-lg font-medium text-white">Admin Panel</h1>
        </div>
        <button type="button" onClick={() => logout()} className="text-white/80 text-sm">
          Logout
        </button>
      </header>

      <nav className="flex gap-4 px-4 py-2 bg-[var(--wa-panel)] border-b border-[#222d34]">
        <Link to="/admin/users" className="text-[var(--wa-teal)] text-sm">
          Users
        </Link>
        <Link to="/admin/chats" className="text-[var(--wa-teal)] text-sm">
          All Chats
        </Link>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
