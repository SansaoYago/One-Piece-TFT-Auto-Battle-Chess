import React, { useState, useEffect, useRef } from 'react';
import { UnitBaseData } from '../types/game';
import { CHAMPION_DATABASE } from '../data/units';
import { SYNERGY_DATABASE } from '../data/synergies';
import { ChampionVisual } from './ChampionVisual';
import { Sparkles, Clock, Star, CheckCircle, ShieldAlert } from 'lucide-react';

interface MiniShopModalProps {
  isOpen: boolean;
  onSelectChampion: (champion: UnitBaseData) => void;
}

const TIER_CONFIG: Record<number, { border: string; bg: string; badge: string; text: string; label: string }> = {
  1: {
    border: 'border-slate-500/80 hover:border-slate-300',
    bg: 'from-slate-900 via-slate-950 to-slate-950',
    badge: 'bg-slate-700 text-slate-100 border-slate-600',
    text: 'text-slate-200',
    label: 'Tier 1 • Comum (1฿)',
  },
  2: {
    border: 'border-emerald-500/80 hover:border-emerald-300',
    bg: 'from-emerald-950/60 via-slate-950 to-slate-950',
    badge: 'bg-emerald-700 text-emerald-100 border-emerald-500',
    text: 'text-emerald-300',
    label: 'Tier 2 • Incomum (2฿)',
  },
};

export const MiniShopModal: React.FC<MiniShopModalProps> = ({
  isOpen,
  onSelectChampion,
}) => {
  const [candidates, setCandidates] = useState<UnitBaseData[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const candidatesRef = useRef<UnitBaseData[]>([]);
  const hasChosenRef = useRef<boolean>(false);

  // Helper to pick 3 distinct random champions among Tier 1 and 2
  const pickThreeChampions = (): UnitBaseData[] => {
    const eligible = Object.values(CHAMPION_DATABASE).filter(
      (champ) => !champ.isEnemy && (champ.tier === 1 || champ.tier === 2)
    );

    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, 3);
  };

  useEffect(() => {
    if (isOpen) {
      const generated = pickThreeChampions();
      setCandidates(generated);
      candidatesRef.current = generated;
      setTimeLeft(10);
      setSelectedId(null);
      hasChosenRef.current = false;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Time expired: auto-pick a random champion if none picked yet!
            if (!hasChosenRef.current && candidatesRef.current.length > 0) {
              hasChosenRef.current = true;
              const randomIndex = Math.floor(Math.random() * candidatesRef.current.length);
              const autoPick = candidatesRef.current[randomIndex];
              setSelectedId(autoPick.id);
              setTimeout(() => {
                onSelectChampion(autoPick);
              }, 400);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleManualSelect = (champ: UnitBaseData) => {
    if (hasChosenRef.current) return;
    hasChosenRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedId(champ.id);

    setTimeout(() => {
      onSelectChampion(champ);
    }, 350);
  };

  if (!isOpen) return null;

  const timerPercent = (timeLeft / 10) * 100;
  const isUrgent = timeLeft <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/80 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.45)] flex flex-col items-center text-center">
        
        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Vitória no Round 1 • Marinheiros Derrotados!</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 uppercase tracking-wide drop-shadow-md">
          Mini Loja de Recrutamento
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mt-1 leading-snug">
          Escolha <strong className="text-amber-300 font-bold">1 campeão</strong> (Tier 1 ou 2) para entrar na sua tripulação. Caso o tempo acabe, um campeão será selecionado aleatoriamente!
        </p>

        {/* Countdown Timer with Animated Progress Bar */}
        <div className="w-full max-w-md my-3.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
              Tempo restante:
            </span>
            <span
              className={`font-black px-2 py-0.5 rounded text-xs ${
                isUrgent
                  ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                isUrgent ? 'bg-gradient-to-r from-rose-600 to-amber-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>

        {/* 3 Champion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full my-2">
          {candidates.map((champ) => {
            const config = TIER_CONFIG[champ.tier] || TIER_CONFIG[1];
            const isPicked = selectedId === champ.id;

            return (
              <div
                key={champ.id}
                onClick={() => handleManualSelect(champ)}
                className={`group relative flex flex-col items-center p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer bg-gradient-to-b ${config.bg} ${config.border} ${
                  isPicked
                    ? 'ring-4 ring-amber-400 scale-102 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                    : 'hover:scale-102 hover:shadow-xl shadow-md'
                }`}
              >
                {/* Picked checkmark overlay */}
                {isPicked && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                    <CheckCircle className="w-3 h-3" />
                    <span>Escolhido</span>
                  </div>
                )}

                {/* Tier Badge */}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border mb-2 shadow-xs ${config.badge}`}>
                  {config.label}
                </span>

                {/* Champion Artwork / Visual */}
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-950/80 border-2 border-slate-700/80 group-hover:border-amber-400/80 flex items-center justify-center p-1 relative shadow-inner overflow-hidden my-1">
                  <ChampionVisual
                    championId={champ.id}
                    size={72}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute bottom-1 right-1 flex items-center text-amber-300">
                    <Star className="w-3 h-3 fill-amber-300" />
                  </div>
                </div>

                {/* Champion Name */}
                <h3 className={`text-sm sm:text-base font-black truncate max-w-full mt-1 ${config.text}`}>
                  {champ.name}
                </h3>

                {/* Traits / Synergies */}
                <div className="flex items-center justify-center gap-1 flex-wrap my-1.5 min-h-[22px]">
                  {(champ.traits || []).map((traitId) => {
                    const syn = SYNERGY_DATABASE[traitId];
                    return (
                      <span
                        key={traitId}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-200 border border-slate-700 flex items-center gap-1 shadow-xs"
                      >
                        <span>{syn?.icon || '⚔️'}</span>
                        <span>{syn?.name || traitId}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Main Skill Preview */}
                <div className="w-full bg-slate-950/80 rounded-xl p-2 border border-slate-800/80 text-[10px] text-slate-300 text-left my-1 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span className="truncate">{champ.skillA?.name || 'Golpe'}</span>
                    <span className="text-[9px] text-slate-400 shrink-0 font-mono">{champ.skillA?.manaCost || 0} MP</span>
                  </div>
                  <p className="line-clamp-2 text-[9px] text-slate-400 leading-tight">
                    {champ.skillA?.description || 'Habilidade de combate.'}
                  </p>
                </div>

                {/* Action Recruit Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualSelect(champ);
                  }}
                  className={`mt-2 w-full py-1.5 px-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-200 shadow-md ${
                    isPicked
                      ? 'bg-amber-400 text-slate-950 border border-amber-300'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  }`}
                >
                  Recrutar
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>A loja normal completa estará disponível com novos personagens a partir da Rodada 2!</span>
        </div>

      </div>
    </div>
  );
};
