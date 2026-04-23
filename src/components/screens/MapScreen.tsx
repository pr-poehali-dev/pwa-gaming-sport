import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { spots as spotsApi } from "@/api";

const SPOTS = [
  { id: 1, name: "Парк Горького · А", dist: "38 м", record: 24, x: 48, y: 52 },
  { id: 2, name: "Лужники · Набережная", dist: "1.2 км", record: 31, x: 22, y: 38 },
  { id: 3, name: "Воробьёвы горы", dist: "2.8 км", record: 28, x: 70, y: 30 },
  { id: 4, name: "Измайловский парк", dist: "4.1 км", record: 19, x: 80, y: 65 },
  { id: 5, name: "Сокольники", dist: "5.6 км", record: 22, x: 35, y: 20 },
];

// ─── Map Screen (mock, unused but kept for reference) ─────────────────────────
export function MapScreen({ onScan }: { onScan: () => void }) {
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
        <div className="absolute" style={{ left: "50%", top: "52%" }}>
          <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white" style={{ boxShadow: "0 0 0 6px rgba(96,165,250,0.2)" }} />
        </div>
      </div>

      {selected && (
        <div className="mx-5 mb-3 bg-white/5 border border-primary/30 rounded-2xl p-4">
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

// ─── Map Screen (real spots) ──────────────────────────────────────────────────
export function MapScreenReal({ onScan }: { onScan: (spot: { id: number; name: string; address: string }) => void }) {
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
