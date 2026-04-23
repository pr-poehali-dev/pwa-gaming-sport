import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { records as recordsApi } from "@/api";
import { NotifPanel, WorkoutFlow } from "@/components/workout/WorkoutFlow";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { MapScreenReal } from "@/components/screens/MapScreen";
import { DuelsScreen, RatingScreenReal } from "@/components/screens/DuelsRatingScreen";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "home" | "map" | "duels" | "rating";

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

// ─── Mock data ────────────────────────────────────────────────────────────────
const NEAREST_SPOT: Spot = {
  id: 0,
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

const NOTIFICATIONS = [
  { id: 1, text: "Максим побил твой рекорд: 16 подтягиваний!", time: "5 мин", read: false, icon: "Trophy" },
  { id: 2, text: "Артём бросил тебе вызов на дуэль!", time: "20 мин", read: false, icon: "Swords" },
  { id: 3, text: "Новый атлет рядом с твоим споттом", time: "1 ч", read: true, icon: "MapPin" },
];

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
    if (workoutSpot.id <= 0) return; // моковый спот — не сохраняем
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