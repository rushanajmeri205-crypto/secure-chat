import { useEffect, useState, type FormEvent } from "react";
import { api, type AdminUser } from "../../lib/api";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const { users: u } = await api.adminUsers();
    setUsers(u);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.adminCreateUser(username, password);
      setUsername("");
      setPassword("");
      setSuccess(`User ${username} created`);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user ${name}? This cannot be undone.`)) return;
    await api.adminDeleteUser(id);
    load();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-[#e9edef] font-medium mb-4">Manage Users</h2>
      <p className="text-[#8696a0] text-sm mb-4">
        Only admins can create or delete users. Users cannot self-register.
      </p>

      <form onSubmit={handleCreate} className="space-y-3 mb-6 p-4 bg-[var(--wa-panel)] rounded-lg">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          pattern="[a-zA-Z0-9_]+"
          className="w-full px-3 py-2 rounded bg-[#202c33] text-[#e9edef] border border-[#2a3942]"
          required
        />
        <input
          type="password"
          placeholder="Initial password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="w-full px-3 py-2 rounded bg-[#202c33] text-[#e9edef] border border-[#2a3942]"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
        <button
          type="submit"
          className="w-full py-2 rounded bg-[var(--wa-teal)] text-white font-medium"
        >
          Create User
        </button>
      </form>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between p-3 bg-[var(--wa-panel)] rounded-lg"
          >
            <div>
              <p className="text-[#e9edef]">{u.username}</p>
              <p className="text-xs text-[#8696a0]">
                Failed logins: {u.failedLoginAttempts}/3
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(u.id, u.username)}
              className="text-red-400 text-sm px-3 py-1 border border-red-400/50 rounded"
            >
              Delete
            </button>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-[#8696a0] text-sm">No users yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
