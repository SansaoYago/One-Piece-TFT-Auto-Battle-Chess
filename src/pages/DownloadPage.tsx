import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  HelpCircle, 
  Gamepad2, 
  ArrowRight, 
  Sparkles,
  Swords,
  Users,
  Shield,
  Zap,
  Flame,
  Crown,
  BookOpen,
  Info
} from 'lucide-react';

interface ReleaseInfo {
  version: string;
  name: string;
  exeUrl: string;
  exeSize: string;
  exePortableUrl: string;
  apkUrl: string;
  apkSize: string;
  publishedDate?: string;
}

interface DownloadPageProps {
  onPlayInBrowser?: () => void;
}

type OfficialTab = 'download' | 'overview' | 'synergies' | 'patch' | 'guide';

export const DownloadPage: React.FC<DownloadPageProps> = ({ onPlayInBrowser }) => {
  const [activeTab, setActiveTab] = useState<OfficialTab>('download');
  const [release, setRelease] = useState<ReleaseInfo>({
    version: 'v0.1.6',
    name: 'One Piece Tactics v0.1.6',
    exeUrl: 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.Tactics.Setup.0.1.6.exe',
    exePortableUrl: 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.Tactics.0.1.6.exe',
    exeSize: '284 MB',
    apkUrl: 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.TFT.0.1.6.apk',
    apkSize: '75.5 MB',
    publishedDate: '22/09/2026',
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [userPlatform, setUserPlatform] = useState<'android' | 'windows' | 'other'>('other');

  // Detect platform on client
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      setUserPlatform('android');
    } else if (ua.includes('win')) {
      setUserPlatform('windows');
    }
  }, []);

  // Fetch latest release details from GitHub API
  useEffect(() => {
    let isMounted = true;
    fetch('https://api.github.com/repos/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar release');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        let exe = 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.Tactics.Setup.0.1.6.exe';
        let exePortable = 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.Tactics.0.1.6.exe';
        let apk = 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/download/v0.1.6/One.Piece.TFT.0.1.6.apk';
        let exeSz = '284 MB';
        let apkSz = '75.5 MB';

        if (Array.isArray(data.assets)) {
          const setupAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.endsWith('.exe') && (a.name.toLowerCase().includes('setup') || a.name.includes('Setup'))
          );
          if (setupAsset) {
            exe = setupAsset.browser_download_url;
            exeSz = `${(setupAsset.size / (1024 * 1024)).toFixed(1)} MB`;
          }

          const portableAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.endsWith('.exe') && !a.name.toLowerCase().includes('setup') && !a.name.includes('blockmap')
          );
          if (portableAsset) {
            exePortable = portableAsset.browser_download_url;
          }

          const apkAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.endsWith('.apk')
          );
          if (apkAsset) {
            apk = apkAsset.browser_download_url;
            apkSz = `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`;
          }
        }

        setRelease({
          version: data.tag_name || 'v0.1.6',
          name: data.name || `One Piece Tactics ${data.tag_name || 'v0.1.6'}`,
          exeUrl: exe,
          exePortableUrl: exePortable,
          exeSize: exeSz,
          apkUrl: apk,
          apkSize: apkSz,
          publishedDate: data.published_at ? new Date(data.published_at).toLocaleDateString('pt-BR') : '22/09/2026',
        });
      })
      .catch(() => {
        // Fallback já garantido no state inicial
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/download`
    : 'https://ais-dev-fmywirde5xywnne37us2ja-832554492192.us-east1.run.app/download';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Background Decorativo Grand Line */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-25 z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-red-600/15 blur-3xl" />
      </div>

      {/* Top Navbar Oficial do Game */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-lg">
              ⚓
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-amber-400 leading-none">
                ONE PIECE TACTICS
              </h1>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Oficial
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Auto-Battle Chess &bull; Multiplayer Multiplataforma
            </p>
          </div>
        </div>

        {/* Botão de Jogar Direto no Navegador */}
        {onPlayInBrowser && (
          <button
            id="play-in-browser-nav-btn"
            onClick={onPlayInBrowser}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wide transition-all shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Jogar no Navegador</span>
          </button>
        )}
      </header>

      {/* Hero Banner do Portal Oficial */}
      <div className="relative z-10 w-full bg-gradient-to-b from-slate-900/60 to-transparent border-b border-slate-900 px-4 pt-8 pb-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge de Lançamento */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Página Oficial do Game &bull; Versão {release.version}</span>
            {release.publishedDate && (
              <span className="text-slate-400 font-normal hidden sm:inline">&bull; Atualizado em {release.publishedDate}</span>
            )}
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Monte Sua Tripulação e Conquiste a Grand Line
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mt-2 mb-6">
            Estratégia auto-chess em tempo real inspirada no universo de One Piece. Disponível para Windows PC, Android e Navegador Web.
          </p>

          {/* Abas Oficiais do Game */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap max-w-2xl mx-auto p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <button
              id="tab-btn-download"
              onClick={() => setActiveTab('download')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'download'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'download' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {release.version}
              </span>
            </button>

            <button
              id="tab-btn-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>O Jogo</span>
            </button>

            <button
              id="tab-btn-synergies"
              onClick={() => setActiveTab('synergies')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'synergies'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Sinergias</span>
            </button>

            <button
              id="tab-btn-patch"
              onClick={() => setActiveTab('patch')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'patch'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Patch Notes</span>
            </button>

            <button
              id="tab-btn-guide"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Como Instalar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico por Aba */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        
        {/* =========================================
            ABA 1: DOWNLOAD
           ========================================= */}
        {activeTab === 'download' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header da Aba */}
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Escolha a Sua Plataforma
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Todas as versões contam com cross-play, salas multiplayer online compartilhadas e sincronização de tabuleiros.
              </p>
            </div>

            {/* Grid dos Cards de Download */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              
              {/* CARD ANDROID (APK) */}
              <div
                id="download-card-android"
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border ${
                  userPlatform === 'android'
                    ? 'border-emerald-400 shadow-2xl shadow-emerald-950/60 ring-2 ring-emerald-500/40'
                    : 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-950/30'
                }`}
              >
                {userPlatform === 'android' && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">
                    Seu Aparelho Detectado
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                        {release.apkSize}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">APK Android Nativo</p>
                    </div>
                  </div>

                  <h4 className="text-2xl font-black text-white flex items-center gap-2">
                    Android
                  </h4>
                  <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed">
                    Para smartphones e tablets Android. Roda nativamente com suporte a toques e sincronização com PC.
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-400 mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Compatível com Android 8.0 ou superior
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Atualização direta pelo APK
                    </p>
                  </div>
                </div>

                <div>
                  <a
                    id="btn-download-apk"
                    href={release.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>Baixar APK Android</span>
                  </a>

                  <p className="text-center text-[11px] text-slate-400 mt-2.5">
                    Nome: <code className="text-emerald-300 font-mono">One.Piece.TFT.0.1.6.apk</code>
                  </p>
                </div>
              </div>

              {/* CARD WINDOWS (EXE) */}
              <div
                id="download-card-windows"
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-900 border ${
                  userPlatform === 'windows'
                    ? 'border-cyan-400 shadow-2xl shadow-cyan-950/60 ring-2 ring-cyan-500/40'
                    : 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-950/30'
                }`}
              >
                {userPlatform === 'windows' && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">
                    Seu Computador Detectado
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
                      <Monitor className="w-8 h-8" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-500/40">
                        {release.exeSize}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">Windows 64-bit</p>
                    </div>
                  </div>

                  <h4 className="text-2xl font-black text-white flex items-center gap-2">
                    Windows (PC)
                  </h4>
                  <p className="text-sm text-slate-300 mt-1 mb-4 leading-relaxed">
                    Para computadores e notebooks Windows. Acompanha o Launcher oficial com atualizações automáticas via GitHub.
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-400 mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Check className="w-3.5 h-3.5 text-cyan-400" /> Instalador NSIS com Launcher oficial
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Check className="w-3.5 h-3.5 text-cyan-400" /> Atualização automática silenciosa
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <a
                    id="btn-download-exe"
                    href={release.exeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-lg shadow-cyan-900/40 cursor-pointer"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>Baixar Instalador (Setup.exe)</span>
                  </a>

                  {release.exePortableUrl && (
                    <a
                      id="btn-download-portable-exe"
                      href={release.exePortableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition-all text-center"
                    >
                      <span>Ou baixe a versão portátil (sem instalar)</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Box de Compartilhamento WhatsApp / Amigos */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    🔗 Compartilhar Página de Download com Amigos e Família
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Envie este link no WhatsApp para que eles possam escolher baixar no Android ou no PC:
                  </p>
                </div>

                <button
                  id="copy-share-download-link-btn"
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all active:scale-95 shadow cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                      <span>Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto">
                <span className="text-amber-400 select-none">URL:</span>
                <span className="select-all">{shareUrl}</span>
              </div>
            </div>

            {/* Dica para Jogar no Navegador */}
            {onPlayInBrowser && (
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">Não quer baixar nada agora?</h5>
                    <p className="text-xs text-slate-300">
                      Você pode jogar diretamente no seu navegador, com todas as funções de multiplayer online liberadas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onPlayInBrowser}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Entrar no Jogo Agora
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            ABA 2: VISÃO GERAL (O JOGO)
           ========================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Como Funciona o One Piece Tactics
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Uma experiência de batalha tática de auto-chess com foco em estratégia, economia e composições de piratas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Fase de Preparação</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Recrute campeões da loja, reposicione no tabuleiro, combine 3 unidades iguais para subir de nível e gerencie seus itens.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Swords className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Combate Automático</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Seus personagens atacam, acumulam mana e desferem habilidades supremas épicas com base no posicionamento e nas sinergias ativas.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Multiplayer em Tempo Real</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Crie ou entre em salas de até 8 jogadores. Veja a arena do seu oponente, mande emotes piratas e dispute quem chega vivo à rodada final!
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 mt-6">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> Sistema Econômico e Progressão
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Juros de Ouro:</strong> A cada 10 de ouro guardado (até 50), você ganha +1 de ouro extra por rodada.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Sequência de Vitórias/Derrotas:</strong> Manter uma sequência garante renda adicional para acelerar sua economia.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Nível de Comandante:</strong> Compre XP para aumentar o número de campeões que você pode colocar em campo (até 10).</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 3: SINERGIAS & TRIPULAÇÕES
           ========================================= */}
        {activeTab === 'synergies' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Sinergias e Tripulações
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Combine personagens da mesma tripulação ou mesma classe para desbloquear bônus passivos devastadores.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-900 border border-amber-500/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-amber-400">👒 Chapéus de Palha</h4>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">2 / 4 / 6</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Luffy, Zoro, Sanji, Nami, Usopp, Chopper. Concedem bônus de vida máxima e aceleração de mana ao acertar ataques.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-blue-500/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-blue-400">⚓ Marinha & Justiça</h4>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">2 / 4 / 6</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Smoker, Tashigi, Kizaru, Aokiji, Akainu, Garp. Concedem armadura massiva e escudo para toda a equipe.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-purple-500/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-purple-400">👑 Shichibukai & Yonkou</h4>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">1 / 2 / 4</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mihawk, Doflamingo, Crocodile, Kaido, Shanks, Barba Branca. Poder bruto, dano verdadeiro e habilidades de grande área.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-emerald-400">⚔️ Mestres Espadachins</h4>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">2 / 4</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Zoro, Mihawk, Tashigi, Law. Chance de desferir cortes duplos que ignoram parte da armadura inimiga.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 4: NOTAS DA VERSÃO (PATCH NOTES)
           ========================================= */}
        {activeTab === 'patch' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Notas do Patch Oficial v0.1.6
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Lançamento das compilações multiplataforma oficiais para PC e Android.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
              <div>
                <h4 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Destaques da Versão v0.1.6
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Suporte Completo a Windows (EXE):</strong> Disponível tanto em instalador com Launcher automático quanto em executável portátil.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Suporte Completo a Android (APK):</strong> Versão dedicada para celulares e tablets com layout responsivo para toques.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Sincronização de Tabuleiro Remoto:</strong> No multiplayer online, os jogadores agora visualizam a movimentação e combate do adversário sem descompassos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Página Oficial com Downloads:</strong> Centralização de todos os links oficiais sem poluir o cabeçalho do jogo.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Build Tag: v0.1.6</span>
                <a
                  href="https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/tag/v0.1.6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold"
                >
                  <span>Ver Release Completa no GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 5: COMO INSTALAR (GUIA)
           ========================================= */}
        {activeTab === 'guide' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Guia Passo a Passo de Instalação
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Tire suas dúvidas e veja como instalar o jogo com total facilidade e segurança.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Passo a Passo Android */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">No Celular (Android)</h4>
                    <p className="text-xs text-slate-400">Instalando o arquivo .apk</p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                  <li className="leading-relaxed">
                    Clique no botão <strong>Baixar APK Android</strong> na aba de download.
                  </li>
                  <li className="leading-relaxed">
                    Ao terminar, abra o arquivo baixado nas notificações ou no gerenciador de arquivos.
                  </li>
                  <li className="leading-relaxed">
                    Se o sistema exibir um aviso sobre fontes desconhecidas, clique em <strong>Configurações</strong> e ative <strong>Permitir desta fonte</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Toque em <strong>Instalar</strong>. O ícone de One Piece Tactics aparecerá na tela inicial!
                  </li>
                </ol>
              </div>

              {/* Passo a Passo Windows */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">No Computador (Windows)</h4>
                    <p className="text-xs text-slate-400">Instalando o Setup.exe</p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
                  <li className="leading-relaxed">
                    Clique em <strong>Baixar Instalador (Setup.exe)</strong> na aba de download.
                  </li>
                  <li className="leading-relaxed">
                    Dê dois cliques no arquivo baixado para iniciar o assistente.
                  </li>
                  <li className="leading-relaxed">
                    Se o Windows SmartScreen aparecer (por ser um jogo independente), clique em <strong>"Mais informações"</strong> e depois em <strong>"Executar assim mesmo"</strong>.
                  </li>
                  <li className="leading-relaxed">
                    O Launcher criará o atalho na sua Área de Trabalho e verificará novas atualizações automaticamente sempre que você abrir!
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Oficial */}
      <footer className="relative z-10 w-full border-t border-slate-900 bg-slate-950/90 py-5 text-center text-xs text-slate-500 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            One Piece Tactics &bull; Fan game não-comercial inspirado na obra de Eiichiro Oda / Shueisha / Toei Animation.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              GitHub
            </a>
            <span>&bull;</span>
            <a
              href="https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              Releases
            </a>
            <span>&bull;</span>
            <span className="text-amber-400 font-mono">v0.1.6</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
