import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login, register, t, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        const res = await register({ name, email, password });
        if (res.ok) {
          showToast(t?.registerSuccess || 'Registered', 'info');
          navigate('/');
        } else {
          setError(res.error || t?.registerFailed || 'Register failed');
        }
        return;
      }

      const res = await login(email, password);
      if (res.ok) {
        showToast(t?.welcomeBack || 'Welcome back!', 'info');
        navigate('/');
      } else {
        setError(res.error || t?.loginFailed || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">{t?.loginTitle || 'Login'}</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {isRegister && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t?.name || 'Name'} className="p-2 border rounded" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t?.email || 'Email'} className="p-2 border rounded" />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t?.password || 'Password'} className="p-2 border rounded" />
        {error && <div className="text-red-600">{String(error)}</div>}
        <button
          disabled={loading}
          className="px-4 py-2 text-white rounded flex items-center justify-center gap-2"
          style={{ background: "var(--gc-forest)", opacity: loading ? 0.7 : 1 }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {isRegister ? (t?.register || 'Register') : (t?.login || 'Login')}
        </button>
      </form>

      <div className="mt-3 text-sm text-center">
        {!isRegister ? (
          <>
            <span className="text-[#6B6455]">{t?.noAccount || "Don't have an account?"}</span>
            <button onClick={() => setIsRegister(true)} className="ml-2 font-bold" style={{ color: "var(--gc-forest)" }}>{t?.register || 'Register'}</button>
          </>
        ) : (
          <>
            <span className="text-[#6B6455]">{t?.haveAccount || 'Already have an account?'}</span>
            <button onClick={() => setIsRegister(false)} className="ml-2 font-bold" style={{ color: "var(--gc-forest)" }}>{t?.login || 'Login'}</button>
          </>
        )}
      </div>
    </div>
  );
}
