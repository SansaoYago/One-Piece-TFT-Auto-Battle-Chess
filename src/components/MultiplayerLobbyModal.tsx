import React, { useState } from 'react';
import { MultiplayerRoomState } from '../types/multiplayer';
import { Users, Globe, Play, Copy, Check, LogOut, Shield, Smartphone, Monitor, Crown, Bot, Sparkles } from 'lucide-react';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: MultiplayerRoomState | null;
  localPlayerId: string | null;
  isMultiplayerActive: boolean;
  onSelectSoloMode: () => void;
  onCreateRoom: (playerName: string, avatar: string, commanderId: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string, commanderId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  errorMessage?: string | null;
}

const PIRATE_AVATARS = [
  { id: 'luffy', avatar: '👒', name: 'Monkey D. Luffy' },
  { id: 'zoro', avatar: '⚔️', name: 'Roronoa Zoro' },
  { id: 'nami', avatar: '🍊', name: 'Nami' },
  { id: 'sanji', avatar: '🦵', name: 'Sanji Vinsmoke' },
  { id: 'ace', avatar: '🔥', name: 'Portgas D. Ace' },
  { id: 'law', avatar: '⚡', name: 'Trafalgar Law' },
  { id: 'whitebeard', avatar: '🌊', name: 'Barba Branca' },
  { id: 'shanks', avatar: '🦁', name: 'Shanks o Ruivo' },
];

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  roomState,
  localPlayerId,
  isMultiplayerActive,
  onSelectSoloMode,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
  const [playerName, setPlayerName] = useState('Capitão');
  const [selectedAvatar, setSelectedAvatar] = useState(PIRATE_AVATARS[0]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const isHost = roomState && localPlayerId ? roomState.hostId === localPlayerId : false;

  const handleCopyCode = () => {
    if (!roomState?.roomCode) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900/95 border-2 border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-300 tracking-wide flex items-center gap-2">
                MODO DE JOGO & SALAS ONLINE
              </h2>
              <p className="text-xs text-slate-400">
                Jogue Solo vs Bots ou dispute partidas com amigos no Desktop e Celular
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            Fechar ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-shake">
            <span className="text-red-400 font-bold">Aviso:</span> {errorMessage}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* If already in a Room Lobby */}
          {roomState ? (
            <div className="space-y-5">
              {/* Room Code Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Código da Sala (Compartilhe para entrar)
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-widest font-mono">
                    {roomState.roomCode}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition active:scale-95"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedCode ? 'Copiado!' : 'Copiar Código'}
                  </button>

                  <button
                    onClick={onLeaveRoom}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 text-xs font-bold transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>

              {/* Connected Players Grid (8 Slots) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    Tripulantes na Sala ({roomState.players.length}/8)
                  </span>
                  <span className="text-[11px] text-amber-400/90 italic flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" />
                    Vagas vazias serão preenchidas por Bots automáticos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const p = roomState.players[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                          p
                            ? 'bg-slate-800/80 border-amber-500/50 shadow-md'
                            : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-70'
                        }`}
                      >
                        {p ? (
                          <>
                            <div className="relative text-3xl mb-1">
                              {p.avatar}
                              {p.isHost && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1 fill-amber-400 drop-shadow" />
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-100 truncate w-full px-1">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-amber-400/80 mt-0.5">
                              {p.isHost ? 'Capitão (Host)' : 'Pronto'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl mb-1 text-slate-600">🤖</div>
                            <div className="text-[11px] text-slate-500 font-semibold">Slot {idx + 1}</div>
                            <div className="text-[9px] text-slate-600">Bot de Treino</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Host Start Controls */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {isHost
                    ? 'Você é o Capitão desta sala! Clique abaixo para iniciar a partida quando todos estiverem prontos.'
                    : 'Aguardando o Capitão da sala iniciar a partida...'}
                </div>

                {isHost && (
                  <button
                    onClick={onStartGame}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 animate-bounce-short"
                  >
                    <Play className="w-5 h-5 fill-slate-950" />
                    INICIAR BATALHA ONLINE
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Mode Selection & Create/Join */
            <div className="space-y-6">
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setTab('SELECT')}
                  className={`py-2 text-xs font-bold rounded-xl transition ${
                    tab === 'SELECT'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Modo Solo
                </button>
                <button
                  onClick={() => setTab('CREATE')}
                  className={`py-2 text-xs font-bold rounded-xl transition ${
                    tab === 'CREATE'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Criar Sala Online
                </button>
                <button
                  onClick={() => setTab('JOIN')}
                  className={`py-2 text-xs font-bold rounded-xl transition ${
                    tab === 'JOIN'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Entrar em Sala
                </button>
              </div>

              {/* Tab 1: Solo Mode */}
              {tab === 'SELECT' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/30 border border-blue-500/30 flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-4 rounded-2xl bg-blue-500/20 text-blue-400 text-4xl">
                      ⚔️
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-base font-bold text-blue-300">Modo Solo (Treino vs 7 Bots)</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Jogue localmente sem depender de conexão de rede. Enfrente 7 comandantes controlados
                        pela IA inteligente com sinergias reais, compra de itens e dificuldade selecionável.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectSoloMode();
                      onClose();
                    }}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-900/40 transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    JOGAR MODO SOLO OFFLINE
                  </button>
                </div>
              )}

              {/* Tab 2: Create Online Room */}
              {tab === 'CREATE' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Seu Nome de Pirata
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Ex: Luffy do Chapéu de Palha"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Escolha seu Comandante / Avatar
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PIRATE_AVATARS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedAvatar(p)}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                            selectedAvatar.id === p.id
                              ? 'bg-amber-500/20 border-amber-400 scale-105'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-2xl">{p.avatar}</span>
                          <span className="text-[10px] text-slate-300 truncate w-full text-center">
                            {p.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    Ao criar a sala, você receberá um código para convidar amigos que jogam no Celular ou Desktop (.exe)!
                  </div>

                  <button
                    onClick={() => {
                      onCreateRoom(playerName, selectedAvatar.avatar, selectedAvatar.id);
                    }}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4 fill-slate-950" />
                    CRIAR SALA ONLINE
                  </button>
                </div>
              )}

              {/* Tab 3: Join Room */}
              {tab === 'JOIN' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Código da Sala
                    </label>
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ex: LUFFY-481"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono text-base tracking-widest uppercase focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Seu Nome de Pirata
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Ex: Zoro Caçador de Piratas"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Escolha seu Avatar
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PIRATE_AVATARS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedAvatar(p)}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                            selectedAvatar.id === p.id
                              ? 'bg-amber-500/20 border-amber-400 scale-105'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-2xl">{p.avatar}</span>
                          <span className="text-[10px] text-slate-300 truncate w-full text-center">
                            {p.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={!roomCodeInput.trim()}
                    onClick={() => {
                      onJoinRoom(roomCodeInput.trim(), playerName, selectedAvatar.avatar, selectedAvatar.id);
                    }}
                    className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                      roomCodeInput.trim()
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    ENTRAR NA SALA
                  </button>
                </div>
              )}

              {/* Mobile vs EXE cross-play instruction footer */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>Desktop (.exe)</span>
                  <span className="text-slate-600">⇄</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Celular (PWA Web)</span>
                </div>
                <span className="text-[11px] text-amber-400/90 font-medium">Cross-play Total</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
