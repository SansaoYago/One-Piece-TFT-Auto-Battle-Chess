import React, { useState } from 'react';
import { MultiplayerRoomState, AvailableRoomSummary } from '../types/multiplayer';
import {
  Users,
  Globe,
  Play,
  Copy,
  Check,
  LogOut,
  Smartphone,
  Monitor,
  Crown,
  Bot,
  Sparkles,
  RefreshCw,
  LogIn,
  Server,
  Settings,
  AlertCircle,
} from 'lucide-react';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: MultiplayerRoomState | null;
  localPlayerId: string | null;
  isMultiplayerActive: boolean;
  availableRooms: AvailableRoomSummary[];
  onRefreshRooms: () => void;
  serverUrl: string;
  onUpdateServerUrl: (url: string) => void;
  onSelectSoloMode: () => void;
  onCreateRoom: (playerName: string, avatar: string, commanderId: string) => void;
  onJoinRoom: (roomCodeOrId: string, playerName: string, avatar: string, commanderId: string) => void;
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
  isMultiplayerActive: _isMultiplayerActive,
  availableRooms,
  onRefreshRooms,
  serverUrl,
  onUpdateServerUrl,
  onSelectSoloMode,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'SELECT' | 'CREATE' | 'JOIN'>('JOIN');
  const [playerName, setPlayerName] = useState('Capitão');
  const [selectedAvatar, setSelectedAvatar] = useState(PIRATE_AVATARS[0]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [showManualCode, setShowManualCode] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerInput, setCustomServerInput] = useState(serverUrl);

  if (!isOpen) return null;

  const isHost = roomState && localPlayerId ? roomState.hostId === localPlayerId : false;

  const handleCopyCode = () => {
    if (!roomState?.roomCode) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshRooms();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-fadeIn">
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
                Dispute partidas em tempo real com amigos no Desktop (.exe) e Celular
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
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span><strong className="text-red-400">Aviso:</strong> {errorMessage}</span>
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
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Sala Aberta em Tempo Real
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-widest font-mono mt-0.5">
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
                    Sair da Sala
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
                              {p.isHost ? 'Capitão (Host)' : 'Tripulante'}
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
                    ? 'Você é o Capitão desta sala! Clique abaixo para iniciar a batalha quando os jogadores entrarem.'
                    : 'Aguardando o Capitão da sala iniciar a partida...'}
                </div>

                {isHost && (
                  <button
                    onClick={onStartGame}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
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
              {/* Profile Config (Name & Avatar) */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Seu Nome de Pirata
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Ex: Luffy do Chapéu de Palha"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Avatar Selecionado
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                      {PIRATE_AVATARS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedAvatar(p)}
                          title={p.name}
                          className={`p-1.5 rounded-xl border transition ${
                            selectedAvatar.id === p.id
                              ? 'bg-amber-500/25 border-amber-400 scale-110 shadow-sm'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xl">{p.avatar}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setTab('JOIN')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                    tab === 'JOIN'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Entrar em Sala
                </button>
                <button
                  onClick={() => setTab('CREATE')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                    tab === 'CREATE'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Criar Sala
                </button>
                <button
                  onClick={() => setTab('SELECT')}
                  className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                    tab === 'SELECT'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Modo Solo
                </button>
              </div>

              {/* Tab: JOIN (Room Discovery & Instant Entry) */}
              {tab === 'JOIN' && (
                <div className="space-y-4">
                  {/* Top Bar with Refresh Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Salas Abertas em Tempo Real
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Cloud Firestore
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Multiplataforma: sincronização instantânea entre Navegador, Celular e Desktop (.exe)
                      </p>
                    </div>

                    <button
                      onClick={handleRefreshClick}
                      disabled={isRefreshing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                      {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                    </button>
                  </div>

                  {/* Available Rooms List */}
                  {availableRooms && availableRooms.length > 0 ? (
                    <div className="space-y-3">
                      {availableRooms.map((room) => (
                        <div
                          key={room.roomId}
                          className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 hover:border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-4 transition shadow-lg"
                        >
                          <div className="flex items-center gap-3.5 w-full sm:w-auto">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
                              {room.hostAvatar || '👒'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-100">
                                  Sala de {room.hostName}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {room.roomCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Aguardando Jogadores
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Users className="w-3.5 h-3.5 text-amber-400" />
                                  {room.playerCount} / {room.maxPlayers} Jogadores
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            disabled={joiningRoomId === (room.roomId || room.roomCode)}
                            onClick={async () => {
                              const targetId = room.roomId || room.roomCode;
                              setJoiningRoomId(targetId);
                              try {
                                await onJoinRoom(targetId, playerName, selectedAvatar.avatar, selectedAvatar.id);
                              } finally {
                                setTimeout(() => setJoiningRoomId(null), 2000);
                              }
                            }}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-95 ${
                              joiningRoomId === (room.roomId || room.roomCode)
                                ? 'bg-emerald-700/60 text-emerald-200 cursor-wait'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/20'
                            }`}
                          >
                            {joiningRoomId === (room.roomId || room.roomCode) ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Entrando...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                ENTRAR AGORA
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mx-auto text-slate-400">
                        ⛵
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">Nenhuma sala aberta no momento</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Nenhum jogador está com sala aguardando no momento. Você pode criar a sala na aba <strong>&apos;Criar Sala&apos;</strong> ou clicar em Atualizar.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        <button
                          onClick={handleRefreshClick}
                          disabled={isRefreshing}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Atualizar Lista
                        </button>
                        <button
                          onClick={() => setTab('CREATE')}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          Criar Uma Sala Agora
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Optional Manual Code entry toggle */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowManualCode(!showManualCode)}
                      className="text-[11px] text-slate-500 hover:text-slate-400 underline transition"
                    >
                      {showManualCode ? '▲ Ocultar entrada por código' : '▼ Possui um código manual específico? Clique aqui'}
                    </button>

                    {showManualCode && (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <label className="block text-xs font-medium text-slate-400">
                          Digite o código da sala (Ex: LUFFY-481)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={roomCodeInput}
                            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                            placeholder="CÓDIGO"
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-mono text-xs uppercase tracking-widest focus:border-amber-400 focus:outline-none"
                          />
                          <button
                            disabled={!roomCodeInput.trim() || joiningRoomId === roomCodeInput.trim()}
                            onClick={async () => {
                              const code = roomCodeInput.trim();
                              setJoiningRoomId(code);
                              try {
                                await onJoinRoom(code, playerName, selectedAvatar.avatar, selectedAvatar.id);
                              } finally {
                                setTimeout(() => setJoiningRoomId(null), 2000);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              !roomCodeInput.trim()
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : joiningRoomId === roomCodeInput.trim()
                                ? 'bg-amber-600 text-amber-100 cursor-wait'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            {joiningRoomId === roomCodeInput.trim() ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Entrando...
                              </>
                            ) : (
                              'Entrar'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: CREATE */}
              {tab === 'CREATE' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-950 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">Crie sua sala em 1 clique!</div>
                      <div className="text-slate-400 mt-0.5">
                        Assim que você criar, ela aparecerá instantaneamente para qualquer amigo na aba &apos;Entrar em Sala&apos; no Desktop (.exe) ou Celular.
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isCreating}
                    onClick={async () => {
                      setIsCreating(true);
                      try {
                        await onCreateRoom(playerName, selectedAvatar.avatar, selectedAvatar.id);
                      } finally {
                        setTimeout(() => setIsCreating(false), 2000);
                      }
                    }}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl transition flex items-center justify-center gap-2 active:scale-95 ${
                      isCreating
                        ? 'bg-amber-600/60 text-amber-200 cursor-wait'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        CRIANDO SALA...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 fill-slate-950" />
                        CRIAR SALA ONLINE AGORA
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab: SOLO */}
              {tab === 'SELECT' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/30 border border-blue-500/30 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 text-3xl">
                      ⚔️
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-blue-300">Modo Solo (Treino vs 7 Bots)</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Jogue localmente sem depender de conexão de rede. Enfrente 7 comandantes controlados
                        pela IA inteligente com sinergias reais, itens e progressão.
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

              {/* Server Connection & Cross-play Footer */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>Desktop (.exe)</span>
                    <span className="text-slate-600">⇄</span>
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Celular (PWA)</span>
                  </div>
                  <button
                    onClick={() => setShowServerConfig(!showServerConfig)}
                    className="flex items-center gap-1 text-[11px] text-amber-400/90 hover:text-amber-300 font-medium transition"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Servidor Nuvem</span>
                    <Settings className="w-3 h-3 text-slate-500" />
                  </button>
                </div>

                {showServerConfig && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>URL do Servidor Central:</span>
                      <button
                        onClick={() => {
                          const def = 'https://ais-dev-4jri3d5iut235w662qvv2e-167791983539.us-east1.run.app';
                          setCustomServerInput(def);
                          onUpdateServerUrl(def);
                        }}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Restaurar Padrão
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customServerInput}
                        onChange={(e) => setCustomServerInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={() => onUpdateServerUrl(customServerInput)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Tanto o executável .exe quanto a versão web se comunicam através deste mesmo servidor em nuvem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
