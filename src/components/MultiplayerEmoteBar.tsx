import React, { useState } from 'react';
import { EmoteMessage } from '../types/multiplayer';
import { Smile, MessageSquare, Send } from 'lucide-react';

interface MultiplayerEmoteBarProps {
  onSendEmote: (text: string, icon?: string) => void;
  activeEmotes: EmoteMessage[];
}

const QUICK_EMOTES = [
  { icon: '👒', text: 'Gomu Gomu no...' },
  { icon: '⚔️', text: 'Santoryu!' },
  { icon: '🍊', text: 'Ouro, meu ouro!' },
  { icon: '🦵', text: 'Diable Jambe!' },
  { icon: '🔥', text: 'Punho de Fogo!' },
  { icon: '⚡', text: 'Haki do Conquistador!' },
  { icon: '🍖', text: 'Preciso de Carne!' },
  { icon: '💀', text: 'Yo-ho-ho-ho!' },
  { icon: '💰', text: 'Economia nos 50 de ouro!' },
  { icon: '👑', text: 'Vou ser o Rei dos Piratas!' },
  { icon: '🤝', text: 'Boa partida! GG!' },
];

export const MultiplayerEmoteBar: React.FC<MultiplayerEmoteBarProps> = ({
  onSendEmote,
  activeEmotes,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating incoming emotes overlay */}
      <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none max-w-xs">
        {activeEmotes.slice(-4).map((emote) => (
          <div
            key={emote.id}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-900/90 border border-amber-400/50 shadow-xl backdrop-blur-md animate-fadeIn transition-all"
          >
            <span className="text-2xl animate-bounce-short">{emote.icon || '💬'}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-300">{emote.senderName}</span>
              <span className="text-xs text-white font-medium">{emote.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Emote trigger button and popup tray */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Emotes & Mensagens Rápidas"
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 shadow-md transition active:scale-95 flex items-center justify-center"
        >
          <Smile className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute bottom-10 right-0 z-50 w-64 p-3 rounded-2xl bg-slate-950/95 border border-amber-500/50 shadow-2xl backdrop-blur-lg animate-fadeIn">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-amber-400">
              <span>Emotes dos Piratas</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {QUICK_EMOTES.map((e, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSendEmote(e.text, e.icon);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-500/20 text-left border border-slate-800/80 hover:border-amber-500/40 transition active:scale-95"
                >
                  <span className="text-lg">{e.icon}</span>
                  <span className="text-xs text-slate-200 font-medium truncate">{e.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
