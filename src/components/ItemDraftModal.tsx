import React, { useState } from 'react';
import { ItemData } from '../types/game';
import { ITEM_DATABASE } from '../data/items';
import { Sparkles, RefreshCw, Package, Check, Shield, Zap, Flame } from 'lucide-react';

interface ItemDraftModalProps {
  isOpen: boolean;
  isBossReward: boolean;
  roundNumber: number;
  onSelectItem: (item: ItemData) => void;
}

// Function to pick 3 distinct items with balanced rarity for synergy emblems
function getRandomItemIds(boss: boolean): string[] {
  const allItems = Object.values(ITEM_DATABASE);
  const battleItems = allItems.filter((i) => !i.grantTrait);
  const traitEmblems = allItems.filter((i) => Boolean(i.grantTrait));

  // Boss battle pool prioritizes higher-tier combat items
  const bossBattleItems = battleItems.filter(
    (i) => i.isSpecialActivation || i.id === 'armadura_haki' || i.id === 'lente_clarividencia' || i.id === 'capa_almirante' || i.id === 'frasco_rum' || i.id === 'espada_pirata'
  );

  const availableBattlePool = boss && bossBattleItems.length >= 3 ? bossBattleItems : battleItems;

  // Emblems are rare: 35% chance of 1 emblem in Boss rounds, 15% chance in normal rounds.
  // CRITICAL: At most 1 emblem can EVER appear in a single draft (never 2 or 3).
  const emblemChance = boss ? 0.35 : 0.15;
  const includeEmblem = Math.random() < emblemChance && traitEmblems.length > 0;

  const chosenIds: string[] = [];

  if (includeEmblem) {
    const randomEmblem = traitEmblems[Math.floor(Math.random() * traitEmblems.length)];
    chosenIds.push(randomEmblem.id);
  }

  // Shuffle battle pool to fill remaining slots (2 or 3)
  const shuffledBattle = [...availableBattlePool];
  for (let i = shuffledBattle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledBattle[i], shuffledBattle[j]] = [shuffledBattle[j], shuffledBattle[i]];
  }

  for (const item of shuffledBattle) {
    if (chosenIds.length >= 3) break;
    if (!chosenIds.includes(item.id)) {
      chosenIds.push(item.id);
    }
  }

  // Shuffle final 3 choices so emblem isn't always in slot 0
  for (let i = chosenIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chosenIds[i], chosenIds[j]] = [chosenIds[j], chosenIds[i]];
  }

  return chosenIds;
}

export const ItemDraftModal: React.FC<ItemDraftModalProps> = ({
  isOpen,
  isBossReward,
  roundNumber,
  onSelectItem,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState<boolean>(false);
  const [offeredItemIds, setOfferedItemIds] = useState<string[]>([]);

  // Regenerate offered items whenever the modal opens or round changes
  React.useEffect(() => {
    if (isOpen) {
      setOfferedItemIds(getRandomItemIds(isBossReward));
      setSelectedItemId(null);
      setHasRefreshed(false);
    }
  }, [isOpen, roundNumber, isBossReward]);

  // Handle refresh (only available on non-boss rounds and once per draft)
  const handleRefresh = () => {
    if (hasRefreshed || isBossReward) return;
    setOfferedItemIds(getRandomItemIds(false));
    setSelectedItemId(null);
    setHasRefreshed(true);
  };

  const handleConfirmChoice = (item: ItemData) => {
    onSelectItem(item);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/70 rounded-3xl p-6 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex flex-col items-center">
        
        {/* Header Badge & Title */}
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
          {isBossReward ? (
            <>
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Tesouro do Boss Conquistado! (Round {roundNumber})</span>
            </>
          ) : (
            <>
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Arsenal de Suprimentos (Round {roundNumber})</span>
            </>
          )}
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-slate-100 text-center tracking-wide">
          {isBossReward ? 'Escolha sua Recompensa Lendária' : 'Selecione 1 Item para sua Bag'}
        </h3>
        <p className="text-xs text-slate-400 text-center max-w-md mt-1 mb-6">
          {isBossReward
            ? 'Você derrotou o Boss! Escolha 1 artefato para fortalecer sua tripulação.'
            : 'Cada escolha define o rumo da sua estratégia. Escolha com sabedoria!'}
        </p>

        {/* 3 Item Choices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
          {offeredItemIds.map((itemId) => {
            const item = ITEM_DATABASE[itemId];
            if (!item) return null;
            const isSelected = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-[1.03] ring-2 ring-amber-400/50'
                    : 'bg-slate-900/80 hover:bg-slate-850 border-slate-700/70 hover:border-slate-500'
                }`}
              >
                {/* Item Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner mb-3">
                  <span className="drop-shadow-md">{item.icon}</span>
                </div>

                {/* Item Name */}
                <h4 className="text-sm font-black text-slate-100 line-clamp-2 min-h-[2.5rem] flex items-center justify-center text-center mb-1">
                  {item.name}
                </h4>

                {/* Badge Type */}
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md mb-2 ${
                    item.isSpecialActivation
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                      : item.grantTrait
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {item.isSpecialActivation
                    ? 'Item Especial (Skill C)'
                    : item.grantTrait
                    ? `+1 Sinergia (${item.grantTrait.toUpperCase()})`
                    : 'Item de Batalha'}
                </span>

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                {/* Selection Check Indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Refresh + Confirm Button */}
        <div className="flex items-center justify-between gap-3 w-full border-t border-slate-800/80 pt-4">
          {!isBossReward ? (
            <button
              onClick={handleRefresh}
              disabled={hasRefreshed}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                hasRefreshed
                  ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400 cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${hasRefreshed ? '' : 'text-amber-400'}`} />
              <span>{hasRefreshed ? 'Refresh Utilizado (0)' : 'Girar Opções (1 Grátis)'}</span>
            </button>
          ) : (
            <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recompensa de Boss sem Reroll</span>
            </div>
          )}

          <button
            disabled={!selectedItemId}
            onClick={() => {
              if (selectedItemId && ITEM_DATABASE[selectedItemId]) {
                handleConfirmChoice(ITEM_DATABASE[selectedItemId]);
              }
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
              selectedItemId
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Escolha</span>
          </button>
        </div>

      </div>
    </div>
  );
};
