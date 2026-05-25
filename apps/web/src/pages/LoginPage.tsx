import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setRemaining(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      const e = err as Error & { status?: number; data?: { error?: string; remaining?: number; message?: string } };
      if (e.data?.error === "account_deleted") {
        setError("Account deleted after 3 failed login attempts. Contact admin.");
      } else if (e.data?.remaining !== undefined) {
        setRemaining(e.data.remaining);
        setError(`Invalid credentials. ${e.data.remaining} attempt(s) remaining before account deletion.`);
      } else {
        setError(e.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--wa-bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--wa-green)] flex items-center justify-center text-4xl">
            💬
          </div>
          <h1 className="text-2xl font-light text-[#e9edef]">Secure Chat</h1>
          <p className="text-[#8696a0] text-sm mt-2">Sign in with credentials from your admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#202c33] text-[#e9edef] border border-[#2a3942] focus:outline-none focus:border-[var(--wa-teal)]"
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#202c33] text-[#e9edef] border border-[#2a3942] focus:outline-none focus:border-[var(--wa-teal)]"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
              {remaining !== null && remaining > 0 && (
                <p className="mt-1 text-xs">Warning: account will be deleted on next failed attempt(s).</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[var(--wa-green-light)] text-white font-medium disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-[#8696a0] text-xs text-center mt-6">
          Web privacy protection is best-effort only. Screenshots cannot be fully blocked in a browser.
        </p>
      </div>
    </div>
  );
}
