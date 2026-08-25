import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import PasswordInput from "../components/PasswordInput";

export default function Register() {
  const { register, t, showToast } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError(t?.fieldsRequired || 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError(t?.passwordMismatch || 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError(t?.passwordTooShort || 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await register({ name, email, password });
      if (res.ok) {
        showToast(t?.registerSuccess || 'Registered', 'info');
        navigate('/');
      } else {
        setError(res.error || t?.registerFailed || 'Register failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{t?.registerTitle || 'Register'}</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t?.name || 'Name'} className="p-2 rounded" style={{ background: "var(--gc-surface)", color: "var(--gc-charcoal)", border: "1px solid var(--gc-border)" }} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t?.email || 'Email'} className="p-2 rounded" style={{ background: "var(--gc-surface)", color: "var(--gc-charcoal)", border: "1px solid var(--gc-border)" }} />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t?.password || 'Password'} className="p-2 rounded" style={{ background: "var(--gc-surface)", color: "var(--gc-charcoal)", border: "1px solid var(--gc-border)" }} />
        <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t?.confirmPassword || 'Confirm password'} className="p-2 rounded" style={{ background: "var(--gc-surface)", color: "var(--gc-charcoal)", border: "1px solid var(--gc-border)" }} />
        {error && <div className="text-red-600">{String(error)}</div>}
        <button
          disabled={loading}
          className="px-4 py-2 text-white rounded flex items-center justify-center gap-2"
          style={{ background: "var(--gc-forest)", opacity: loading ? 0.7 : 1 }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {t?.register || 'Register'}
        </button>
      </form>
    </div>
  );
}
