import React, { useEffect, useState, useRef } from 'react';
import { TheftEvent } from '../types/combat';
import { Coins, Sparkles, ShieldAlert } from 'lucide-react';
import { ChampionVisual } from './ChampionVisual';

interface TheftBannerNotificationProps {
  theft: TheftEvent | null;
  onClose: () => void;
}

export const TheftBannerNotification: React.FC<TheftBannerNotificationProps> = ({
  theft,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (theft) {
      setIsVisible(true);

      // Auto-dismiss strictly after 2500ms (2.5 seconds)
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onCloseRef.current?.();
        }, 300);
      }, 2500);

      return () => {
        clearTimeout(timer);
      };
    } else {
      setIsVisible(false);
    }
  }, [theft?.id]); // Only trigger timer when the theft event ID changes, immune to parent re-renders

  if (!theft || !isVisible) return null;

  const isPlayerThief = theft.isPlayerThief;
  const cleanUnitId = (theft.thiefUnitId || '').toLowerCase().replace(/^(champ_|unit_)/, '');
  const isNami = cleanUnitId.includes('nami');
  const isBuggy = cleanUnitId.includes('buggy');

  const thiefEmoji = isNami ? '🍊' : isBuggy ? '🎪' : '🏴‍☠️';
  const portraitUrl = isBuggy
    ? '/champions/portraits/buggy.png'
    : isNami
    ? '/champions/portraits/nami.png'
    : `/champions/portraits/${cleanUnitId}.png`;

  const bannerBg = isPlayerThief
    ? 'from-amber-950/95 via-yellow-900/90 to-amber-950/95 border-amber-500/80 shadow-amber-500/30'
    : 'from-rose-950/95 via-red-900/90 to-rose-950/95 border-rose-500/80 shadow-rose-500/30';

  return (
    <div
      id="theft-notification-banner"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-md w-[92%] sm:w-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-r ${bannerBg} p-3.5 text-white shadow-2xl backdrop-blur-md`}
      >
        {/* Glow effect overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          {/* Thief Avatar / Portrait */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-400/80 bg-slate-900/90 flex items-center justify-center shadow-lg relative">
              <ChampionVisual
                unitId={cleanUnitId}
                customSrc={portraitUrl}
                avatarFallback={thiefEmoji}
                mode="portrait"
                className="w-full h-full"
                imageClassName="w-full h-full object-cover"
                alt={theft.thiefName}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-xs px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
              <span>{thiefEmoji}</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isPlayerThief ? (
                <>
                  <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    SAQUE PIRATA REALIZADO!
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} className="text-rose-400 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                    SUA TRIPULAÇÃO FOI SAQUEADA!
                  </span>
                </>
              )}
            </div>

            <h4 className="text-sm font-bold text-slate-100 truncate">
              {theft.thiefName}{' '}
              <span className="text-xs font-normal text-slate-300">
                {isPlayerThief ? 'saqueou de' : 'roubou de'} {theft.victimName}
              </span>
            </h4>

            {/* Stolen Loot Box */}
            <div className="mt-1 flex items-center gap-2 bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
              {theft.type === 'GOLD' ? (
                <>
                  <Coins size={16} className="text-yellow-400 shrink-0" />
                  <div className="text-xs font-medium text-amber-200">
                    <strong className="text-yellow-300 font-extrabold text-sm">
                      {isPlayerThief ? `+${theft.goldAmount}฿` : `-${theft.goldAmount}฿`}
                    </strong>{' '}
                    de Ouro roubado das reservas inimigas!
                  </div>
                </>
              ) : (
                <>
                  <span className="text-lg shrink-0">{theft.stolenItemIcon || '🗡️'}</span>
                  <div className="text-xs font-medium text-amber-100 truncate">
                    Item Surrupiado:{' '}
                    <strong className="text-amber-300 font-bold">
                      {theft.stolenItemName || 'Item de Segurar'}
                    </strong>
                    {isPlayerThief && (
                      <span className="block text-[10px] text-emerald-300">
                        📦 Enviado direto para o seu Baú de Itens!
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
