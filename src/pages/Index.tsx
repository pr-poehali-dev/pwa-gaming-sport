import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { spots as spotsApi, records as recordsApi } from "@/api";

interface AppUser {
  id: number;
  nickname: string;
  rank_level: number;
  streak_days: number;
  is_admin: boolean;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "home" | "map" | "duels" | "rating";
type WorkoutPhase = "idle" | "scanning" | "countdown" | "active" | "result" | "record";

interface Spot {
  id: number;
  name: string;
  dist: string;
  pullupRecord: number;
  myRecord: number;
  leaders: { name: string; avatar: string; record: number }[];
}

interface DuelEntry {
  id: number;
  opponent: string;
  avatar: string;
  exercise: string;
  myScore: number;
  theirScore: number;
  status: "pending" | "active" | "won" | "lost";
  deadline: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const NEAREST_SPOT: Spot = {
  id: 1,
  name: "Парк Горького · Секция А",
  dist: "38 м",
  pullupRecord: 24,
  myRecord: 15,
  leaders: [
    { name: "Макс К.", avatar: "МК", record: 24 },
    { name: "Дима Р.", avatar: "ДР", record: 21 },
    { name: "Серёга", avatar: "СВ", record: 18 },
  ],
};

const SPOTS = [
  { id: 1, name: "Парк Горького · А", dist: "38 м", record: 24, x: 48, y: 52 },
  { id: 2, name: "Лужники · Набережная", dist: "1.2 км", record: 31, x: 22, y: 38 },
  { id: 3, name: "Воробьёвы горы", dist: "2.8 км", record: 28, x: 70, y: 30 },
  { id: 4, name: "Измайловский парк", dist: "4.1 км", record: 19, x: 80, y: 65 },
  { id: 5, name: "Сокольники", dist: "5.6 км", record: 22, x: 35, y: 20 },
];

const GLOBAL_LEADERS = [
  { rank: 1, name: "Максим К.", avatar: "МК", score: 2840, record: 31, streak: 22 },
  { rank: 2, name: "Артём Д.", avatar: "АД", score: 2610, record: 29, streak: 18 },
  { rank: 3, name: "Дима Р.", avatar: "ДР", score: 2480, record: 28, streak: 14 },
  { rank: 4, name: "Ты", avatar: "ТЫ", score: 1950, record: 15, streak: 7, isUser: true },
  { rank: 5, name: "Серёга В.", avatar: "СВ", score: 1820, record: 18, streak: 5 },
  { rank: 6, name: "Иван Н.", avatar: "ИН", score: 1640, record: 16, streak: 3 },
];

const DUELS: DuelEntry[] = [
  { id: 1, opponent: "Максим К.", avatar: "МК", exercise: "Подтягивания макс", myScore: 15, theirScore: 0, status: "pending", deadline: "Сег. 20:00" },
  { id: 2, opponent: "Артём Д.", avatar: "АД", exercise: "Лесенка до 10", myScore: 55, theirScore: 48, status: "active", deadline: "Завтра" },
  { id: 3, opponent: "Дима Р.", avatar: "ДР", exercise: "Подтягивания макс", myScore: 15, theirScore: 13, status: "won", deadline: "вчера" },
  { id: 4, opponent: "Серёга В.", avatar: "СВ", exercise: "Лесенка до 8", myScore: 28, theirScore: 36, status: "lost", deadline: "2 дня назад" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Максим побил твой рекорд: 16 подтягиваний!", time: "5 мин", read: false, icon: "Trophy" },
  { id: 2, text: "Артём бросил тебе вызов на дуэль!", time: "20 мин", read: false, icon: "Swords" },
  { id: 3, text: "Новый атлет рядом с твоим споттом", time: "1 ч", read: true, icon: "MapPin" },
];

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotifPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="bg-[#0f0f0f] rounded-t-3xl border-t border-white/10 p-5 animate-slide-up max-h-[60vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-oswald font-semibold tracking-wide">Уведомления</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Icon name="X" size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {NOTIFICATIONS.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-2xl ${n.read ? "bg-white/5" : "bg-primary/10 border border-primary/20"}`}>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon name={n.icon} size={16} className={n.read ? "text-muted-foreground" : "text-primary"} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-snug">{n.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time} назад</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Workout Flow ─────────────────────────────────────────────────────────────
function WorkoutFlow({ spot, onClose, onSave }: { spot: Spot; onClose: () => void; onSave?: (maxReps: number, totalReps: number, mode: string, sets: number[]) => Promise<void> }) {
  const [phase, setPhase] = useState<WorkoutPhase>("scanning");
  const [countdown, setCountdown] = useState(3);
  const [sets, setSets] = useState<number[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [_ladderTarget] = useState(5);
  const [mode, setMode] = useState<"max" | "ladder">("max");
  const [isNewRecord, setIsNewRecord] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate QR scan after 1.2s
  useEffect(() => {
    if (phase === "scanning") {
      const t = setTimeout(() => setPhase("countdown"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("active"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase === "active") setTimeout(() => inputRef.current?.focus(), 100);
  }, [phase]);

  const totalReps = sets.reduce((a, b) => a + b, 0);
  const maxSet = sets.length ? Math.max(...sets) : 0;
  const ladderStep = sets.length + 1;

  function submitSet() {
    const n = parseInt(inputVal);
    if (!n || n <= 0) return;
    const newSets = [...sets, n];
    setSets(newSets);
    setInputVal("");
    if (mode === "ladder" && n < ladderStep) {
      const newMax = Math.max(...newSets);
      const newTotal = newSets.reduce((a, b) => a + b, 0);
      if (newMax > 0 && onSave) onSave(newMax, newTotal, mode, newSets).catch(() => {});
      const isRec = newMax > spot.myRecord;
      setIsNewRecord(isRec);
      setPhase("result");
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function finish() {
    const currentMax = sets.length ? Math.max(...sets) : 0;
    const currentTotal = sets.reduce((a, b) => a + b, 0);
    if (currentMax > 0 && onSave) {
      onSave(currentMax, currentTotal, mode, sets).catch(() => {});
    }
    const isRec = currentMax > spot.myRecord;
    setIsNewRecord(isRec);
    setPhase("result");
  }

  // Scanning phase
  if (phase === "scanning") {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-6">
        <div className="w-56 h-56 border-2 border-primary rounded-3xl relative flex items-center justify-center">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          <div className="w-40 h-0.5 bg-primary animate-pulse absolute" style={{ animation: "scan-line 1.2s ease-in-out forwards" }} />
          <Icon name="QrCode" size={48} className="text-primary/40" />
        </div>
        <p className="text-white/60 text-sm font-medium">Наведи камеру на QR-код</p>
        <button onClick={onClose} className="text-white/40 text-sm">Отмена</button>
        <style>{`@keyframes scan-line { 0%{top:10%} 100%{top:90%} }`}</style>
      </div>
    );
  }

  // Countdown phase
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center">
          <span className="text-7xl font-oswald font-black text-primary animate-scale-in" key={countdown}>
            {countdown === 0 ? "GO" : countdown}
          </span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-white font-oswald text-xl font-semibold">{spot.name}</p>
          <p className="text-white/50 text-sm mt-1">Твой рекорд здесь — <span className="text-primary font-bold">{spot.myRecord}</span></p>
        </div>
      </div>
    );
  }

  // Active training
  if (phase === "active") {
    return (
      <div className="fixed inset-0 z-40 bg-[#080808] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{spot.name}</p>
            <p className="text-white font-oswald text-lg font-semibold mt-0.5">
              {mode === "ladder" ? `Лесенка · шаг ${ladderStep}` : "Максимальный подход"}
            </p>
          </div>
          <button onClick={finish} className="bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl">
            Завершить
          </button>
        </div>

        {/* Mode toggle */}
        {sets.length === 0 && (
          <div className="flex gap-2 px-5 mb-4">
            <button
              onClick={() => setMode("max")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === "max" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/50"}`}
            >
              Макс
            </button>
            <button
              onClick={() => setMode("ladder")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === "ladder" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/50"}`}
            >
              Лесенка
            </button>
          </div>
        )}

        {/* Sets display */}
        <div className="flex-1 flex flex-col px-5 gap-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-2xl p-4 text-center">
              <p className="text-3xl font-oswald font-black text-primary">{totalReps}</p>
              <p className="text-white/40 text-xs mt-1 font-medium">Всего повторов</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 text-center">
              <p className="text-3xl font-oswald font-black text-white">{maxSet}</p>
              <p className="text-white/40 text-xs mt-1 font-medium">Макс. за подход</p>
            </div>
          </div>

          {/* Ladder hint */}
          {mode === "ladder" && (
            <div className="bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20">
              <p className="text-primary text-sm font-bold">
                Шаг {ladderStep}: сделай {ladderStep} подтягиваний
              </p>
              <p className="text-white/40 text-xs mt-0.5">Когда не можешь — серия закончена</p>
            </div>
          )}

          {/* Sets log */}
          {sets.length > 0 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Подходы</p>
              <div className="flex flex-wrap gap-2">
                {sets.map((s, i) => (
                  <div key={i} className="w-12 h-12 rounded-xl bg-white/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-white/40">{i + 1}</span>
                    <span className="text-base font-oswald font-bold text-white leading-none">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 pb-10 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs mb-2 font-medium text-center">
            {mode === "ladder" ? `Ввести результат шага ${ladderStep}` : "Ввести количество повторов"}
          </p>
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitSet()}
              placeholder="0"
              className="flex-1 bg-white/10 border border-white/20 rounded-2xl text-center text-3xl font-oswald font-bold text-white py-4 outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={submitSet}
              disabled={!inputVal || parseInt(inputVal) <= 0}
              className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
            >
              <Icon name="Check" size={28} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result
  if (phase === "result") {
    return (
      <div className="fixed inset-0 z-40 bg-[#080808] flex flex-col items-center justify-center px-6 text-center">
        {isNewRecord && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  animation: `confetti-fall ${0.8 + Math.random() * 1.2}s ease-out ${Math.random() * 0.5}s forwards`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
        )}
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-20px) rotate(0deg); opacity:1; }
            100% { transform: translateY(200px) rotate(360deg); opacity:0; }
          }
        `}</style>

        {isNewRecord ? (
          <>
            <div className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center mb-4 animate-scale-in">
              <span className="text-4xl">🏆</span>
            </div>
            <p className="text-primary font-oswald text-xl font-bold uppercase tracking-wider mb-1">Новый рекорд!</p>
            <p className="text-6xl font-oswald font-black text-white mb-1">{maxSet}</p>
            <p className="text-white/40 text-sm mb-6">подтягиваний · был {spot.myRecord}</p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4 animate-scale-in">
              <span className="text-4xl">💪</span>
            </div>
            <p className="text-white font-oswald text-xl font-bold mb-1">Хорошая работа!</p>
            <p className="text-5xl font-oswald font-black text-primary mb-1">{maxSet}</p>
            <p className="text-white/40 text-sm mb-6">макс. за подход · рекорд {spot.myRecord}</p>
          </>
        )}

        <div className="w-full bg-white/5 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-oswald font-bold text-white">{sets.length}</p>
              <p className="text-xs text-white/40">подходов</p>
            </div>
            <div>
              <p className="text-2xl font-oswald font-bold text-primary">{totalReps}</p>
              <p className="text-xs text-white/40">всего</p>
            </div>
            <div>
              <p className="text-2xl font-oswald font-bold text-white">{maxSet}</p>
              <p className="text-xs text-white/40">макс</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-oswald font-bold text-lg active:scale-95 transition-transform"
        >
          Готово
        </button>
      </div>
    );
  }

  return null;
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ onScan, onNotif, unread, onProfile, user }: {
  onScan: () => void;
  onNotif: () => void;
  unread: number;
  onProfile: () => void;
  user: AppUser;
}) {
  const [bottomTab, setBottomTab] = useState<"progress" | "leaders">("leaders");
  const streak = user.streak_days;
  const toNextLevel = Math.max(0, (user.rank_level * 10) - streak);

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-6">
        <button onClick={onProfile} className="relative w-12 h-12">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-sm font-oswald font-bold text-white">
            {user.nickname.slice(0, 2).toUpperCase()}
          </div>
          <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="22" fill="none" stroke="hsl(54,100%,54%)" strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 22 * 0.62} ${2 * Math.PI * 22}`}
              strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <p className="text-white font-oswald font-semibold text-sm tracking-wide">Атлет II ранга</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-base">🔥</span>
            <span className="text-primary font-oswald font-bold text-sm">{streak}</span>
            <span className="text-white/40 text-xs font-medium">дней подряд</span>
          </div>
        </div>

        <button onClick={onNotif} className="relative w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
          <Icon name="Bell" size={20} className="text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* GPS spot card */}
      <div className="mx-5 mb-6 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: "0 0 6px #4ade80" }} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{NEAREST_SPOT.name}</p>
          <p className="text-white/40 text-xs">{NEAREST_SPOT.dist} · Рекорд площадки: <span className="text-primary font-bold">{NEAREST_SPOT.pullupRecord}</span></p>
        </div>
        <button className="bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/30">
          GPS-старт
        </button>
      </div>

      {/* SCAN BUTTON */}
      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        <button
          onClick={onScan}
          className="relative w-44 h-44 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
          style={{ boxShadow: "0 0 60px rgba(255,215,0,0.25), 0 0 120px rgba(255,215,0,0.1)" }}
        >
          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          <div className="flex flex-col items-center gap-2">
            <Icon name="QrCode" size={52} className="text-primary-foreground" />
            <span className="font-oswald font-black text-primary-foreground text-lg tracking-widest leading-none">СТАРТ</span>
          </div>
        </button>
        <p className="text-white/30 text-sm font-medium">Наведи на QR-код турника</p>
      </div>

      {/* Bottom card: progress / leaders */}
      <div className="mx-5 mb-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setBottomTab("leaders")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${bottomTab === "leaders" ? "text-primary border-b-2 border-primary -mb-px" : "text-white/40"}`}
          >
            Лидеры спота
          </button>
          <button
            onClick={() => setBottomTab("progress")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${bottomTab === "progress" ? "text-primary border-b-2 border-primary -mb-px" : "text-white/40"}`}
          >
            Мой прогресс
          </button>
        </div>

        {bottomTab === "leaders" && (
          <div className="p-4 flex flex-col gap-2">
            {NEAREST_SPOT.leaders.map((l, i) => (
              <div key={l.name} className="flex items-center gap-3">
                <span className={`w-5 text-xs font-oswald font-bold ${i === 0 ? "text-primary" : "text-white/30"}`}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                  {l.avatar}
                </div>
                <p className="flex-1 text-sm font-medium text-white">{l.name}</p>
                <p className={`font-oswald font-bold text-base ${i === 0 ? "text-primary" : "text-white"}`}>{l.record}</p>
                <p className="text-white/30 text-xs">подт.</p>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-3">
              <span className="w-5 text-xs font-oswald font-bold text-white/30">4</span>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground">
                ТЫ
              </div>
              <p className="flex-1 text-sm font-medium text-primary">Ты</p>
              <p className="font-oswald font-bold text-base text-primary">{NEAREST_SPOT.myRecord}</p>
              <p className="text-white/30 text-xs">подт.</p>
            </div>
          </div>
        )}

        {bottomTab === "progress" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 font-medium">Подтягивания за неделю</p>
              <p className="text-xs text-primary font-bold">+{toNextLevel} до III ранга</p>
            </div>
            <div className="flex items-end gap-1.5 h-14 mb-3">
              {[8, 15, 0, 12, 10, 18, 15].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={`rounded-t-md ${i === 6 ? "bg-primary" : "bg-white/20"}`}
                    style={{ height: `${v === 0 ? 2 : (v / 18) * 100}%`, minHeight: v === 0 ? 2 : undefined }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-oswald font-black text-white">78</span>
                <span className="text-white/40 text-xs ml-1">всего за неделю</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-oswald font-black text-primary">15</span>
                <span className="text-white/40 text-xs ml-1">личный рекорд</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Map Screen ───────────────────────────────────────────────────────────────
function MapScreen({ onScan }: { onScan: () => void }) {
  const [selected, setSelected] = useState<typeof SPOTS[0] | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-oswald font-semibold">Карта споттов</h1>
        <p className="text-white/40 text-sm mt-0.5">Уличные турники Москвы</p>
      </div>

      {/* Map */}
      <div className="relative mx-5 rounded-2xl overflow-hidden bg-[#0f0f0f] border border-white/10 mb-4" style={{ height: 280 }}>
        <div className="absolute inset-0 map-grid opacity-40" />
        {/* Roads */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 50 Q25 45 50 52 Q75 58 100 50" stroke="white" strokeOpacity="0.06" strokeWidth="3" fill="none" />
          <path d="M30 0 Q35 25 32 50 Q28 75 30 100" stroke="white" strokeOpacity="0.06" strokeWidth="2" fill="none" />
          <path d="M0 30 Q50 28 100 32" stroke="white" strokeOpacity="0.04" strokeWidth="1.5" fill="none" />
          <path d="M60 0 Q62 50 65 100" stroke="white" strokeOpacity="0.04" strokeWidth="1.5" fill="none" />
        </svg>
        {/* Spot pins */}
        {SPOTS.map(spot => (
          <button
            key={spot.id}
            onClick={() => setSelected(selected?.id === spot.id ? null : spot)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selected?.id === spot.id ? "bg-primary border-primary scale-125" : "bg-[#1a1a1a] border-white/20"}`}>
              <Icon name="Dumbbell" size={14} className={selected?.id === spot.id ? "text-black" : "text-primary"} />
            </div>
          </button>
        ))}
        {/* User location */}
        <div className="absolute" style={{ left: "48%", top: "52%" }}>
          <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white" style={{ boxShadow: "0 0 0 6px rgba(96,165,250,0.2)" }} />
        </div>
        {/* Controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          <button className="w-9 h-9 bg-black/70 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
            <Icon name="Plus" size={16} className="text-white" />
          </button>
          <button className="w-9 h-9 bg-black/70 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
            <Icon name="Minus" size={16} className="text-white" />
          </button>
        </div>
        <button className="absolute bottom-3 left-3 w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Icon name="Navigation" size={16} className="text-black" />
        </button>
      </div>

      {/* Selected spot card */}
      {selected && (
        <div className="mx-5 mb-3 bg-white/5 border border-primary/30 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-oswald font-semibold text-base">{selected.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{selected.dist} от тебя</p>
            </div>
            <div className="text-right">
              <p className="text-primary font-oswald font-black text-2xl leading-none">{selected.record}</p>
              <p className="text-white/40 text-xs">рекорд</p>
            </div>
          </div>
          <button
            onClick={onScan}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-oswald font-bold text-sm tracking-wide active:scale-95 transition-transform"
          >
            Чекинься и начни
          </button>
        </div>
      )}

      {/* Spot list */}
      <div className="px-5 flex-1 overflow-y-auto pb-4">
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Все площадки</p>
        <div className="flex flex-col gap-2">
          {SPOTS.map(spot => (
            <button
              key={spot.id}
              onClick={() => setSelected(selected?.id === spot.id ? null : spot)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${selected?.id === spot.id ? "bg-primary/10 border border-primary/30" : "bg-white/5 border border-white/10"}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon name="Dumbbell" size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{spot.name}</p>
                <p className="text-xs text-white/40">{spot.dist}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-primary font-oswald font-bold text-lg leading-none">{spot.record}</p>
                <p className="text-white/30 text-[10px]">рекорд</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Duels Screen ─────────────────────────────────────────────────────────────
function DuelsScreen() {
  const [tab, setTab] = useState<"active" | "search">("active");

  const statusLabel: Record<DuelEntry["status"], string> = {
    pending: "Ждёт твоего подхода",
    active: "В процессе",
    won: "Победа 🏆",
    lost: "Поражение",
  };
  const statusColor: Record<DuelEntry["status"], string> = {
    pending: "text-primary",
    active: "text-blue-400",
    won: "text-green-400",
    lost: "text-red-400",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-oswald font-semibold">Дуэли</h1>
        <p className="text-white/40 text-sm mt-0.5">Брось вызов — докажи превосходство</p>
      </div>

      <div className="flex gap-2 px-5 mb-4">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === "active" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/50"}`}
        >
          Мои дуэли
        </button>
        <button
          onClick={() => setTab("search")}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === "search" ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/50"}`}
        >
          Найти соперника
        </button>
      </div>

      {tab === "active" && (
        <div className="px-5 flex flex-col gap-3 overflow-y-auto pb-4">
          {DUELS.map(d => (
            <div key={d.id} className={`bg-white/5 rounded-2xl p-4 border ${d.status === "pending" ? "border-primary/30" : "border-white/10"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {d.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{d.opponent}</p>
                  <p className="text-white/40 text-xs">{d.exercise}</p>
                </div>
                <span className={`text-xs font-bold ${statusColor[d.status]}`}>{statusLabel[d.status]}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-2xl font-oswald font-black text-primary">{d.myScore}</p>
                  <p className="text-white/40 text-[10px]">Ты</p>
                </div>
                <span className="text-white/20 font-oswald font-bold text-sm">VS</span>
                <div className="flex-1 bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-2xl font-oswald font-black text-white">{d.theirScore || "?"}</p>
                  <p className="text-white/40 text-[10px]">{d.opponent.split(" ")[0]}</p>
                </div>
              </div>
              {d.status === "pending" && (
                <button className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform">
                  Сделать подход
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "search" && (
        <div className="px-5 flex flex-col gap-3 pb-4 overflow-y-auto">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
            <p className="text-primary font-oswald font-bold text-base">Бросить новый вызов</p>
            <p className="text-white/40 text-sm mt-1">Выбери атлета из рейтинга и задай упражнение</p>
          </div>
          {GLOBAL_LEADERS.filter(l => !l.isUser).map(l => (
            <div key={l.rank} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {l.avatar}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{l.name}</p>
                <p className="text-white/40 text-xs">Рекорд: {l.record} подт. · 🔥{l.streak}</p>
              </div>
              <button className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1.5 rounded-xl">
                Вызов
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rating Screen (real data) ────────────────────────────────────────────────
function RatingScreenReal({ currentUserId }: { currentUserId: number }) {
  const [leaders, setLeaders] = useState<typeof GLOBAL_LEADERS>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    recordsApi.rating().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setLeaders(data.map((r: { rank: number; user_id: number; nickname: string; streak: number; rank_level: number; record: number; total: number }) => ({
          rank: r.rank,
          name: r.nickname,
          avatar: r.nickname.slice(0, 2).toUpperCase(),
          score: r.total,
          record: r.record,
          streak: r.streak,
          isUser: r.user_id === currentUserId,
        })));
      }
      setLoaded(true);
    });
  }, [currentUserId]);

  const display = loaded && leaders.length > 0 ? leaders : GLOBAL_LEADERS;
  const top3 = display.length >= 3 ? [display[1], display[0], display[2]] : display;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-oswald font-semibold">Рейтинг</h1>
        <p className="text-white/40 text-sm mt-0.5">Кто правит турниками</p>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="px-5 flex items-end justify-center gap-3 mb-5">
          {top3.map((p, i) => {
            const h = [76, 100, 60];
            const pos = [2, 1, 3];
            return (
              <div key={p.name} className="flex flex-col items-center gap-2">
                <p className={`text-xs font-oswald font-bold ${i === 1 ? "text-primary" : "text-white"}`}>{p.record}</p>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${p.isUser ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
                  {p.avatar}
                </div>
                <p className="text-[10px] text-white/50 font-semibold max-w-[56px] text-center truncate">{p.name.split(" ")[0]}</p>
                <div
                  className={`w-16 rounded-t-xl flex items-start justify-center pt-2 ${i === 1 ? "bg-primary" : "bg-white/10"}`}
                  style={{ height: h[i] }}
                >
                  <span className={`text-sm font-oswald font-black ${i === 1 ? "text-primary-foreground" : "text-white/40"}`}>{pos[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-5 flex flex-col gap-2 overflow-y-auto pb-4">
        {display.map((u) => (
          <div
            key={u.rank}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${u.isUser ? "bg-primary/10 border border-primary/30" : "bg-white/5 border border-white/5"}`}
          >
            <span className={`w-5 text-sm font-oswald font-bold shrink-0 ${u.rank <= 3 ? "text-primary" : "text-white/30"}`}>{u.rank}</span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${u.isUser ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}>
              {u.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${u.isUser ? "text-primary" : "text-white"}`}>{u.name}</p>
              <p className="text-white/30 text-xs">🔥{u.streak} дней</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-oswald font-black text-lg leading-none ${u.isUser ? "text-primary" : "text-white"}`}>{u.record}</p>
              <p className="text-white/30 text-[10px]">макс</p>
            </div>
          </div>
        ))}
        {loaded && leaders.length === 0 && (
          <div className="text-center py-10 text-white/30 text-sm">Пока нет рекордов. Будь первым!</div>
        )}
      </div>
    </div>
  );
}

// ─── Map Screen (real spots) ──────────────────────────────────────────────────
function MapScreenReal({ onScan }: { onScan: (spot: { id: number; name: string; address: string }) => void }) {
  const [apiSpots, setApiSpots] = useState<{ id: number; name: string; address: string; lat: number; lng: number; spot_record: number; x?: number; y?: number }[]>([]);
  const [selected, setSelected] = useState<typeof apiSpots[0] | null>(null);

  useEffect(() => {
    spotsApi.list().then(data => {
      if (Array.isArray(data)) {
        setApiSpots(data.map((s, i) => ({ ...s, x: 20 + (i * 23) % 70, y: 20 + (i * 31) % 60 })));
      }
    });
  }, []);

  const display = apiSpots.length > 0 ? apiSpots : SPOTS.map(s => ({ ...s, address: s.name, spot_record: s.record }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-oswald font-semibold">Карта споттов</h1>
        <p className="text-white/40 text-sm mt-0.5">Уличные турники</p>
      </div>

      <div className="relative mx-5 rounded-2xl overflow-hidden bg-[#0f0f0f] border border-white/10 mb-4" style={{ height: 280 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 50 Q25 45 50 52 Q75 58 100 50" stroke="white" strokeOpacity="0.06" strokeWidth="3" fill="none" />
          <path d="M30 0 Q35 25 32 50 Q28 75 30 100" stroke="white" strokeOpacity="0.06" strokeWidth="2" fill="none" />
        </svg>
        {display.map((spot, i) => (
          <button
            key={spot.id}
            onClick={() => setSelected(selected?.id === spot.id ? null : spot)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${spot.x ?? (20 + i * 20)}%`, top: `${spot.y ?? (20 + i * 15)}%` }}
          >
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selected?.id === spot.id ? "bg-primary border-primary scale-125" : "bg-[#1a1a1a] border-white/20"}`}>
              <Icon name="Dumbbell" size={14} className={selected?.id === spot.id ? "text-black" : "text-primary"} />
            </div>
          </button>
        ))}
        <div className="absolute" style={{ left: "50%", top: "52%" }}>
          <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white" style={{ boxShadow: "0 0 0 6px rgba(96,165,250,0.2)" }} />
        </div>
      </div>

      {selected && (
        <div className="mx-5 mb-3 bg-white/5 border border-primary/30 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-oswald font-semibold text-base">{selected.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{selected.address}</p>
            </div>
            <div className="text-right">
              <p className="text-primary font-oswald font-black text-2xl leading-none">{selected.spot_record}</p>
              <p className="text-white/40 text-xs">рекорд</p>
            </div>
          </div>
          <button
            onClick={() => onScan(selected)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-oswald font-bold text-sm tracking-wide"
          >
            Начать тренировку
          </button>
        </div>
      )}

      <div className="px-5 flex-1 overflow-y-auto pb-4">
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Все площадки</p>
        <div className="flex flex-col gap-2">
          {display.map(spot => (
            <button
              key={spot.id}
              onClick={() => setSelected(selected?.id === spot.id ? null : spot)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${selected?.id === spot.id ? "bg-primary/10 border border-primary/30" : "bg-white/5 border border-white/10"}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon name="Dumbbell" size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{spot.name}</p>
                <p className="text-xs text-white/40">{spot.address}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-primary font-oswald font-bold text-lg leading-none">{spot.spot_record}</p>
                <p className="text-white/30 text-[10px]">рекорд</p>
              </div>
            </button>
          ))}
          {apiSpots.length === 0 && (
            <div className="text-center py-6 text-white/30 text-sm">Споттов пока нет. Добавь первый!</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "map", label: "Карта", icon: "Map" },
  { id: "duels", label: "Дуэли", icon: "Swords" },
  { id: "rating", label: "Рейтинг", icon: "Trophy" },
] as const;

export default function Index({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [workoutSpot, setWorkoutSpot] = useState<Spot>(NEAREST_SPOT);
  const unread = NOTIFICATIONS.filter(n => !n.read).length;

  const handleSaveWorkout = useCallback(async (maxReps: number, totalReps: number, mode: string, sets: number[]) => {
    await recordsApi.save(workoutSpot.id, maxReps, totalReps, mode, sets);
  }, [workoutSpot.id]);

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="flex-1 overflow-y-auto" key={tab}>
        {tab === "home" && (
          <HomeScreen
            onScan={() => setShowWorkout(true)}
            onNotif={() => setShowNotifs(true)}
            unread={unread}
            onProfile={onLogout}
            user={user}
          />
        )}
        {tab === "map" && (
          <MapScreenReal onScan={(spot) => {
            setWorkoutSpot({ id: spot.id, name: spot.name, dist: "", pullupRecord: 0, myRecord: 0, leaders: [] });
            setShowWorkout(true);
          }} />
        )}
        {tab === "duels" && <DuelsScreen />}
        {tab === "rating" && <RatingScreenReal currentUserId={user.id} />}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#080808]/95 backdrop-blur-md px-2 pb-safe">
        <div className="flex">
          {NAV.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className="flex-1 flex flex-col items-center gap-1 py-3 active:scale-95 transition-transform relative"
            >
              {t.id === "duels" && unread > 0 && (
                <span className="absolute top-2 right-5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              <Icon
                name={t.icon}
                size={22}
                className={`transition-colors ${tab === t.id ? "text-primary" : "text-white/30"}`}
              />
              <span className={`text-[10px] font-semibold transition-colors ${tab === t.id ? "text-primary" : "text-white/30"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)} />}
      {showWorkout && (
        <WorkoutFlow
          spot={workoutSpot}
          onClose={() => setShowWorkout(false)}
          onSave={handleSaveWorkout}
        />
      )}
    </div>
  );
}