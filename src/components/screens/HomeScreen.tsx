import { useState } from "react";
import Icon from "@/components/ui/icon";

interface AppUser {
  id: number;
  nickname: string;
  rank_level: number;
  streak_days: number;
  is_admin: boolean;
}

interface Spot {
  id: number;
  name: string;
  dist: string;
  pullupRecord: number;
  myRecord: number;
  leaders: { name: string; avatar: string; record: number }[];
}

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

// ─── Home Screen ──────────────────────────────────────────────────────────────
export function HomeScreen({ onScan, onNotif, unread, onProfile, user }: {
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
