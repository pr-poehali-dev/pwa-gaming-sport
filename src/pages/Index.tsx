import { useState } from "react";
import Icon from "@/components/ui/icon";

type Tab = "home" | "map" | "rating" | "stats" | "profile";

interface Notification {
  id: number;
  type: "record" | "challenge" | "tournament";
  text: string;
  time: string;
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "record", text: "Алексей побил твой рекорд по бегу!", time: "2 мин", read: false },
  { id: 2, type: "challenge", text: "Максим вызывает тебя на 5 км-марафон", time: "15 мин", read: false },
  { id: 3, type: "tournament", text: "Турнир «Весенний спринт» начнётся через 2 дня", time: "1 ч", read: false },
  { id: 4, type: "record", text: "Новый личный рекорд: 10 км за 47:12!", time: "3 ч", read: true },
  { id: 5, type: "challenge", text: "Ты принял вызов от Дарьи", time: "вчера", read: true },
];

interface LeaderEntry {
  rank: number;
  name: string;
  score: number;
  change: number;
  avatar: string;
  isUser?: boolean;
}

const LEADERBOARD: LeaderEntry[] = [
  { rank: 1, name: "Алексей К.", score: 12840, change: +2, avatar: "АК" },
  { rank: 2, name: "Михаил С.", score: 11220, change: -1, avatar: "МС" },
  { rank: 3, name: "Дарья П.", score: 10980, change: +1, avatar: "ДП" },
  { rank: 4, name: "Ты", score: 9650, change: 0, avatar: "ТЫ", isUser: true },
  { rank: 5, name: "Иван Р.", score: 9340, change: -2, avatar: "ИР" },
  { rank: 6, name: "Анна В.", score: 8760, change: +3, avatar: "АВ" },
  { rank: 7, name: "Сергей М.", score: 8120, change: 0, avatar: "СМ" },
];

const WEEK_STATS = [
  { day: "Пн", km: 5.2, active: false },
  { day: "Вт", km: 8.7, active: false },
  { day: "Ср", km: 3.1, active: false },
  { day: "Чт", km: 11.4, active: false },
  { day: "Пт", km: 7.8, active: false },
  { day: "Сб", km: 14.2, active: false },
  { day: "Вс", km: 6.5, active: true },
];

const MAX_KM = Math.max(...WEEK_STATS.map(d => d.km));

const ACHIEVEMENTS = [
  { icon: "🏆", label: "Марафонец", desc: "42 км за неделю", done: true },
  { icon: "⚡", label: "Спринтер", desc: "5 км < 25 мин", done: true },
  { icon: "🔥", label: "7 дней подряд", desc: "Серия активности", done: true },
  { icon: "🎯", label: "Снайпер", desc: "10 тренировок в цель", done: false },
];

function HomeScreen({ onBellClick }: { onBellClick: () => void }) {
  const unread = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between pt-2 animate-fade-in">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Четверг, 24 апр</p>
          <h1 className="text-2xl font-oswald font-semibold text-foreground mt-0.5">Привет, Никита 👋</h1>
        </div>
        <button
          onClick={onBellClick}
          className="relative w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
        >
          <Icon name="Bell" size={20} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* Today card */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-5 animate-fade-in stagger-1">
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full bg-white/5 translate-y-6" />
        <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-widest mb-3">Сегодня</p>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-5xl font-oswald font-bold text-primary-foreground leading-none">6.5</p>
            <p className="text-primary-foreground/70 text-sm mt-1 font-medium">км пройдено</p>
          </div>
          <div className="flex flex-col gap-1 mb-1">
            <p className="text-primary-foreground/90 text-sm font-semibold">524 ккал</p>
            <p className="text-primary-foreground/70 text-xs">52:18 мин</p>
          </div>
        </div>
        <div className="mt-4 bg-primary-foreground/20 rounded-full h-1.5">
          <div className="bg-primary-foreground h-1.5 rounded-full" style={{ width: "65%" }} />
        </div>
        <p className="text-primary-foreground/70 text-xs mt-1.5">Цель: 10 км · 65%</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in stagger-2">
        {[
          { label: "Шаги", value: "8 420", icon: "Footprints" },
          { label: "Пульс", value: "72", icon: "Heart" },
          { label: "Серия", value: "7 дн", icon: "Flame" },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-2xl p-4 flex flex-col gap-2">
            <Icon name={item.icon} size={18} className="text-primary" />
            <p className="text-xl font-oswald font-bold text-foreground leading-none">{item.value}</p>
            <p className="text-muted-foreground text-xs font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Active challenges */}
      <div className="animate-fade-in stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Вызовы</h2>
          <button className="text-xs text-primary font-semibold">Все</button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { name: "Максим С.", type: "5 км-бег", deadline: "Сег. 18:00", avatar: "МС" },
            { name: "Дарья П.", type: "100 отжиманий", deadline: "Завтра", avatar: "ДП" },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type} · {c.deadline}</p>
              </div>
              <button className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform">
                Принять
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby tournament */}
      <div className="animate-fade-in stagger-4 bg-card rounded-2xl p-4 border border-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Турнир · через 2 дня</p>
            <p className="text-base font-oswald font-semibold text-foreground">Весенний спринт 5K</p>
            <p className="text-xs text-muted-foreground mt-0.5">Парк Победы · 127 участников</p>
          </div>
          <button className="bg-primary/10 text-primary text-xs font-bold px-3 py-2 rounded-xl mt-1">
            Участвовать
          </button>
        </div>
      </div>
    </div>
  );
}

function MapScreen() {
  const routes = [
    { name: "Утренний маршрут", km: "5.2 км", time: "28 мин", color: "#FFD700" },
    { name: "Парковая трасса", km: "8.7 км", time: "47 мин", color: "#4ade80" },
    { name: "Городской забег", km: "12.1 км", time: "1 ч 8 мин", color: "#60a5fa" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="pt-2 animate-fade-in">
        <h1 className="text-2xl font-oswald font-semibold">Карта</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Маршруты рядом с тобой</p>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-card border border-border animate-fade-in stagger-1" style={{ height: 260 }}>
        <div className="absolute inset-0 map-grid" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 260" preserveAspectRatio="none">
          <path d="M40 200 Q100 150 160 120 Q220 90 280 110 Q340 130 380 80" stroke="#FFD700" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M20 240 Q80 200 120 160 Q180 110 240 130 Q300 155 360 140 Q380 135 400 120" stroke="#4ade80" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M60 260 Q100 220 140 190 Q200 150 260 160 Q320 170 360 200 Q380 215 400 200" stroke="#60a5fa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
          <circle cx="160" cy="120" r="8" fill="#FFD700" opacity="0.3" />
          <circle cx="160" cy="120" r="4" fill="#FFD700" />
        </svg>
        <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground border border-border">
          Москва, ЗАО
        </div>
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button className="w-9 h-9 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-border">
            <Icon name="Plus" size={16} />
          </button>
          <button className="w-9 h-9 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-border">
            <Icon name="Minus" size={16} />
          </button>
        </div>
        <button className="absolute bottom-3 left-3 w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Icon name="Navigation" size={16} className="text-primary-foreground" />
        </button>
      </div>

      <div className="animate-fade-in stagger-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Мои маршруты</h2>
          <button className="text-xs text-primary font-semibold">+ Новый</button>
        </div>
        <div className="flex flex-col gap-2">
          {routes.map((r) => (
            <div key={r.name} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3">
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.km} · {r.time}</p>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingScreen() {
  const [period, setPeriod] = useState(0);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="pt-2 animate-fade-in">
        <h1 className="text-2xl font-oswald font-semibold">Рейтинг</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Топ спортсменов этой недели</p>
      </div>

      <div className="flex gap-2 animate-fade-in stagger-1">
        {["Неделя", "Месяц", "Всё время"].map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriod(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${period === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div className="animate-fade-in stagger-2 flex items-end justify-center gap-3 py-4">
        {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((p, i) => {
          const heights = [72, 96, 60];
          const order = [2, 1, 3];
          return (
            <div key={p.name} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {p.avatar}
              </div>
              <p className="text-xs font-semibold text-foreground truncate max-w-[64px] text-center">{p.name.split(" ")[0]}</p>
              <div
                className={`w-16 rounded-t-xl flex items-start justify-center pt-2 ${i === 1 ? "bg-primary" : "bg-secondary"}`}
                style={{ height: heights[i] }}
              >
                <span className={`text-sm font-oswald font-bold ${i === 1 ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {order[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 animate-fade-in stagger-3">
        {LEADERBOARD.map((user, i) => (
          <div
            key={user.rank}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${user.isUser ? "bg-primary/10 border border-primary/30" : "bg-card"}`}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <span className={`w-6 text-sm font-oswald font-bold ${user.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
              {user.rank}
            </span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${user.isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              {user.avatar}
            </div>
            <p className={`flex-1 text-sm font-semibold ${user.isUser ? "text-primary" : "text-foreground"}`}>
              {user.name}
            </p>
            <div className="flex items-center gap-2">
              {user.change !== 0 && (
                <span className={`text-xs font-semibold ${user.change > 0 ? "text-green-400" : "text-red-400"}`}>
                  {user.change > 0 ? "↑" : "↓"}{Math.abs(user.change)}
                </span>
              )}
              <span className="text-sm font-oswald font-bold text-foreground">
                {user.score.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsScreen() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="pt-2 animate-fade-in">
        <h1 className="text-2xl font-oswald font-semibold">Статистика</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Апрель 2026</p>
      </div>

      <div className="grid grid-cols-2 gap-3 animate-fade-in stagger-1">
        {[
          { label: "Всего км", value: "124.8", sub: "+12% к прошлому месяцу", color: "text-primary" },
          { label: "Тренировок", value: "22", sub: "Цель: 24", color: "text-green-400" },
          { label: "Ккал сожжено", value: "9 840", sub: "Ср. 447/день", color: "text-blue-400" },
          { label: "Лучший темп", value: "4:32", sub: "на км", color: "text-orange-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4">
            <p className={`text-2xl font-oswald font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{s.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-4 animate-fade-in stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Км за неделю</h2>
          <span className="text-xs text-muted-foreground">57.9 км итого</span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {WEEK_STATS.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${(d.km / MAX_KM) * 80}px` }}>
                <div className={`absolute inset-0 rounded-t-lg ${d.active ? "bg-primary" : "bg-secondary"}`} />
              </div>
              <span className={`text-[10px] font-semibold ${d.active ? "text-primary" : "text-muted-foreground"}`}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-fade-in stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Достижения</h2>
          <button className="text-xs text-primary font-semibold">Все</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.label}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 bg-card ${!a.done ? "opacity-50" : ""}`}
            >
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="text-xs font-bold text-foreground">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 animate-fade-in stagger-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Типы активности</h2>
        {[
          { type: "Бег", pct: 68, color: "bg-primary" },
          { type: "Ходьба", pct: 22, color: "bg-blue-400" },
          { type: "Велосипед", pct: 10, color: "bg-green-400" },
        ].map((a) => (
          <div key={a.type} className="flex items-center gap-3 mb-2.5 last:mb-0">
            <p className="text-xs font-medium text-foreground w-20 shrink-0">{a.type}</p>
            <div className="flex-1 bg-secondary rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${a.color}`} style={{ width: `${a.pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [challengeEnabled, setChallengeEnabled] = useState(true);
  const [tournamentEnabled, setTournamentEnabled] = useState(false);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="pt-2 animate-fade-in">
        <h1 className="text-2xl font-oswald font-semibold">Профиль</h1>
      </div>

      <div className="bg-card rounded-2xl p-5 flex items-center gap-4 animate-fade-in stagger-1">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-oswald font-bold">
            НЛ
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-background" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-oswald font-bold text-foreground">Никита Лебедев</p>
          <p className="text-sm text-muted-foreground">@nikita_run · Москва</p>
          <p className="text-xs text-primary font-semibold mt-1">4 место в рейтинге</p>
        </div>
        <button className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
          <Icon name="Pencil" size={15} className="text-foreground" />
        </button>
      </div>

      <div className="animate-fade-in stagger-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Личные рекорды</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "5K", value: "24:18" },
            { label: "10K", value: "47:12" },
            { label: "21K", value: "1:58:44" },
          ].map((r) => (
            <div key={r.label} className="bg-card rounded-2xl p-3 text-center">
              <p className="text-lg font-oswald font-bold text-primary">{r.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 animate-fade-in stagger-3">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="Bell" size={15} className="text-primary" />
          Уведомления
        </p>
        {[
          { label: "Новые рекорды", value: notifEnabled, set: setNotifEnabled },
          { label: "Вызовы от друзей", value: challengeEnabled, set: setChallengeEnabled },
          { label: "Турниры рядом", value: tournamentEnabled, set: setTournamentEnabled },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <p className="text-sm text-foreground">{n.label}</p>
            <button
              onClick={() => n.set(!n.value)}
              className={`w-11 h-6 rounded-full transition-colors relative ${n.value ? "bg-primary" : "bg-secondary"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${n.value ? "left-6" : "left-1"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="animate-fade-in stagger-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Друзья · 8</p>
          <button className="text-xs text-primary font-semibold">+ Добавить</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["МС", "ДП", "АК", "ИР", "АВ", "СМ"].map((a) => (
            <div key={a} className="shrink-0 w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
              {a}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl divide-y divide-border animate-fade-in stagger-5">
        {[
          { icon: "Target", label: "Цели тренировок" },
          { icon: "Watch", label: "Синхронизация трекера" },
          { icon: "Shield", label: "Приватность" },
          { icon: "Settings", label: "Настройки приложения" },
        ].map((s) => (
          <button key={s.label} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-secondary/50 transition-colors">
            <Icon name={s.icon} size={17} className="text-muted-foreground" />
            <p className="text-sm font-medium text-foreground flex-1 text-left">{s.label}</p>
            <Icon name="ChevronRight" size={15} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const typeIcon = (t: string) => {
    if (t === "record") return "Trophy";
    if (t === "challenge") return "Swords";
    return "Medal";
  };
  const typeColor = (t: string) => {
    if (t === "record") return "text-primary";
    if (t === "challenge") return "text-blue-400";
    return "text-green-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-background rounded-t-3xl border-t border-border p-5 animate-slide-up max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-oswald font-semibold">Уведомления</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Icon name="X" size={15} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {NOTIFICATIONS.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-3 rounded-2xl ${n.read ? "bg-card" : "bg-primary/5 border border-primary/20"}`}
            >
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Icon name={typeIcon(n.type)} size={16} className={typeColor(n.type)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium leading-snug">{n.text}</p>
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

const NAV_TABS = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "map", label: "Карта", icon: "Map" },
  { id: "rating", label: "Рейтинг", icon: "Trophy" },
  { id: "stats", label: "Статистика", icon: "BarChart2" },
  { id: "profile", label: "Профиль", icon: "User" },
] as const;

export default function Index() {
  const [tab, setTab] = useState<Tab>("home");
  const [showNotifs, setShowNotifs] = useState(false);

  const renderTab = () => {
    switch (tab) {
      case "home": return <HomeScreen onBellClick={() => setShowNotifs(true)} />;
      case "map": return <MapScreen />;
      case "rating": return <RatingScreen />;
      case "stats": return <StatsScreen />;
      case "profile": return <ProfileScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24" key={tab}>
        {renderTab()}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/90 backdrop-blur-md border-t border-border px-2">
        <div className="flex">
          {NAV_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-95 relative ${tab === t.id ? "tab-active" : ""}`}
            >
              <Icon
                name={t.icon}
                size={22}
                className={`transition-colors ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}
              />
              <span className={`text-[10px] font-semibold transition-colors ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
    </div>
  );
}