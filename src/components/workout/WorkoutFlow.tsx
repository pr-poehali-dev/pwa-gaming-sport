import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

type WorkoutPhase = "idle" | "scanning" | "countdown" | "active" | "result" | "record";

interface Spot {
  id: number;
  name: string;
  dist: string;
  pullupRecord: number;
  myRecord: number;
  leaders: { name: string; avatar: string; record: number }[];
}

const NOTIFICATIONS = [
  { id: 1, text: "Максим побил твой рекорд: 16 подтягиваний!", time: "5 мин", read: false, icon: "Trophy" },
  { id: 2, text: "Артём бросил тебе вызов на дуэль!", time: "20 мин", read: false, icon: "Swords" },
  { id: 3, text: "Новый атлет рядом с твоим споттом", time: "1 ч", read: true, icon: "MapPin" },
];

// ─── Notification Panel ───────────────────────────────────────────────────────
export function NotifPanel({ onClose }: { onClose: () => void }) {
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
export function WorkoutFlow({ spot, onClose, onSave }: { spot: Spot; onClose: () => void; onSave?: (maxReps: number, totalReps: number, mode: string, sets: number[]) => Promise<void> }) {
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
