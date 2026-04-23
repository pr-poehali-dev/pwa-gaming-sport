import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { records as recordsApi } from "@/api";

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

const GLOBAL_LEADERS = [
  { rank: 1, name: "Максим К.", avatar: "МК", score: 2840, record: 31, streak: 22, isUser: false },
  { rank: 2, name: "Артём Д.", avatar: "АД", score: 2610, record: 29, streak: 18, isUser: false },
  { rank: 3, name: "Дима Р.", avatar: "ДР", score: 2480, record: 28, streak: 14, isUser: false },
  { rank: 4, name: "Ты", avatar: "ТЫ", score: 1950, record: 15, streak: 7, isUser: true },
  { rank: 5, name: "Серёга В.", avatar: "СВ", score: 1820, record: 18, streak: 5, isUser: false },
  { rank: 6, name: "Иван Н.", avatar: "ИН", score: 1640, record: 16, streak: 3, isUser: false },
];

const DUELS: DuelEntry[] = [
  { id: 1, opponent: "Максим К.", avatar: "МК", exercise: "Подтягивания макс", myScore: 15, theirScore: 0, status: "pending", deadline: "Сег. 20:00" },
  { id: 2, opponent: "Артём Д.", avatar: "АД", exercise: "Лесенка до 10", myScore: 55, theirScore: 48, status: "active", deadline: "Завтра" },
  { id: 3, opponent: "Дима Р.", avatar: "ДР", exercise: "Подтягивания макс", myScore: 15, theirScore: 13, status: "won", deadline: "вчера" },
  { id: 4, opponent: "Серёга В.", avatar: "СВ", exercise: "Лесенка до 8", myScore: 28, theirScore: 36, status: "lost", deadline: "2 дня назад" },
];

// ─── Duels Screen ─────────────────────────────────────────────────────────────
export function DuelsScreen() {
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
export function RatingScreenReal({ currentUserId }: { currentUserId: number }) {
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
