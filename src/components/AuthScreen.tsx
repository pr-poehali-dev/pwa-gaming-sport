import { useState } from "react";
import Icon from "@/components/ui/icon";
import { auth } from "@/api";

type AuthMode = "login" | "register" | "verify-sent" | "verify-success";

interface Props {
  onAuth: (user: { id: number; nickname: string; rank_level: number; streak_days: number; is_admin: boolean }, token: string) => void;
  initialVerifyToken?: string;
}

export default function AuthScreen({ onAuth, initialVerifyToken }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialVerifyToken ? "verify-sent" : "login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  // Auto-verify if token in URL
  useState(() => {
    if (initialVerifyToken) {
      auth.verify(initialVerifyToken).then(res => {
        if (res.ok) setVerifyDone(true);
      });
    }
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await auth.login(email, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    localStorage.setItem("auth_token", res.token);
    onAuth(res.user, res.token);
  }

  async function handleResend() {
    if (!email || resendLoading || resendDone) return;
    setResendLoading(true);
    await auth.resend(email);
    setResendLoading(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 60000);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await auth.register(email, nickname, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setMode("verify-sent");
  }

  const inputCls = "w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-white/30";

  if (mode === "verify-sent" || initialVerifyToken) {
    return (
      <div className="fixed inset-0 bg-[#080808] flex flex-col items-center justify-center px-8 text-center">
        {verifyDone ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-5">
              <Icon name="CheckCircle" size={36} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-oswald font-bold text-white mb-2">Email подтверждён!</h2>
            <p className="text-white/50 text-sm mb-6">Теперь можешь войти в приложение</p>
            <button onClick={() => setMode("login")} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-oswald font-bold text-lg">
              Войти
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-5">
              <Icon name="Mail" size={36} className="text-primary" />
            </div>
            <h2 className="text-2xl font-oswald font-bold text-white mb-2">Проверь почту</h2>
            <p className="text-white/50 text-sm mb-2">Отправили письмо на</p>
            <p className="text-primary font-semibold text-sm mb-6">{email || "твой email"}</p>
            <p className="text-white/30 text-xs">Нажми на ссылку в письме, чтобы активировать аккаунт</p>

            <button
              onClick={handleResend}
              disabled={resendLoading || resendDone || !email}
              className="mt-6 w-full py-3.5 rounded-2xl border border-white/15 text-sm font-bold transition-all disabled:opacity-40 active:scale-95"
            >
              {resendLoading ? "Отправляем..." : resendDone ? "Письмо отправлено ✓" : "Выслать письмо повторно"}
            </button>

            <button onClick={() => setMode("login")} className="mt-3 text-white/30 text-sm underline">
              Вернуться ко входу
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-4">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-4"
          style={{ boxShadow: "0 0 40px rgba(255,215,0,0.3)" }}>
          <Icon name="Dumbbell" size={36} className="text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-oswald font-black text-white tracking-wide mb-1">PullUp</h1>
        <p className="text-white/40 text-sm">Уличные подтягивания · Рейтинг · Дуэли</p>
      </div>

      {/* Form */}
      <div className="px-6 pb-10">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "login" ? "bg-primary text-primary-foreground" : "text-white/40"}`}
          >
            Вход
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "register" ? "bg-primary text-primary-foreground" : "text-white/40"}`}
          >
            Регистрация
          </button>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls} required autoComplete="email" />
            <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} required autoComplete="current-password" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-oswald font-bold text-lg mt-1 active:scale-95 transition-transform disabled:opacity-50">
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls} required autoComplete="email" />
            <input type="text" placeholder="Никнейм (2–30 символов)" value={nickname} onChange={e => setNickname(e.target.value)}
              className={inputCls} required minLength={2} maxLength={30} autoComplete="username" />
            <input type="password" placeholder="Пароль (минимум 6 символов)" value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} required minLength={6} autoComplete="new-password" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-oswald font-bold text-lg mt-1 active:scale-95 transition-transform disabled:opacity-50">
              {loading ? "Регистрируем..." : "Создать аккаунт"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}