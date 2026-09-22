import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, Check, Copy, ExternalLink, ShieldCheck, HelpCircle, Gamepad2, ArrowRight, Sparkles } from 'lucide-react';

interface ReleaseInfo {
  version: string;
  name: string;
  exeUrl: string;
  exeSize: string;
  apkUrl: string;
  apkSize: string;
  publishedDate?: string;
}

interface DownloadPageProps {
  onPlayInBrowser?: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ onPlayInBrowser }) => {
  const [release, setRelease] = useState<ReleaseInfo>({
    version: 'v0.1.6',
    name: 'One Piece Tactics v0.1.6',
    exeUrl: 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest',
    exeSize: '~300 MB',
    apkUrl: 'https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest',
    apkSize: '~79 MB',
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

  // Fetch latest release details from GitHub
  useEffect(() => {
    let isMounted = true;
    fetch('https://api.github.com/repos/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Não foi possível carregar a release');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        let exe = `https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/tag/${data.tag_name || 'v0.1.6'}`;
        let apk = exe;
        let exeSz = '~300 MB';
        let apkSz = '~79 MB';

        if (Array.isArray(data.assets)) {
          const exeAsset = data.assets.find(
            (a: any) => typeof a.name === 'string' && a.name.endsWith('.exe') && !a.name.includes('blockmap')
          );
          if (exeAsset) {
            exe = exeAsset.browser_download_url;
            exeSz = `${(exeAsset.size / (1024 * 1024)).toFixed(1)} MB`;
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
          exeSize: exeSz,
          apkUrl: apk,
          apkSize: apkSz,
          publishedDate: data.published_at ? new Date(data.published_at).toLocaleDateString('pt-BR') : undefined,
        });
      })
      .catch((err) => {
        console.warn('Usando links de fallback da release:', err);
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
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">👒</span>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wider text-amber-400">
              ONE PIECE TACTICS
            </h1>
            <p className="text-[11px] text-slate-400 font-medium -mt-1">
              Auto Battle Chess &bull; Multiplayer
            </p>
          </div>
        </div>

        {onPlayInBrowser && (
          <button
            id="play-in-browser-nav-btn"
            onClick={onPlayInBrowser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-amber-400 text-xs font-semibold text-amber-300 transition-all active:scale-95"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Jogar no Navegador</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col items-center text-center">
        {/* Version Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Versão Oficial {release.version}</span>
          {release.publishedDate && (
            <span className="text-slate-400 font-normal">&bull; Atualizado em {release.publishedDate}</span>
          )}
        </div>

        {/* Hero Title */}
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          Baixe e Jogue com Seus Amigos
        </h2>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-8 leading-relaxed">
          Escolha a versão para o seu celular ou computador abaixo. Ambos contam com suporte a salas multiplayer online e sincronização em tempo real.
        </p>

        {/* 2 Big Download Buttons Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
          
          {/* BOTÃO ANDROID (APK) */}
          <div
            id="download-card-android"
            className={`relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border ${
              userPlatform === 'android'
                ? 'border-emerald-400 shadow-xl shadow-emerald-950/50 ring-2 ring-emerald-500/40'
                : 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/30'
            }`}
          >
            {userPlatform === 'android' && (
              <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">
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
                  <p className="text-[11px] text-slate-400 mt-1">Formato: Arquivo APK</p>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                Android
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-5">
                Para celulares e tablets com Android. Instale o APK diretamente no aparelho.
              </p>
            </div>

            <div>
              <a
                id="btn-download-apk"
                href={release.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Baixar APK (Android)</span>
              </a>

              {/* Dicas de Instalação Android */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> Como instalar no celular:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                  <li>Toque no botão e baixe o arquivo.</li>
                  <li>Abra o arquivo baixado e toque em <strong>Instalar</strong>.</li>
                  <li>Se o Android pedir, marque <em>"Permitir desta fonte"</em>.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* BOTÃO WINDOWS (EXE) */}
          <div
            id="download-card-windows"
            className={`relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-900 border ${
              userPlatform === 'windows'
                ? 'border-cyan-400 shadow-xl shadow-cyan-950/50 ring-2 ring-cyan-500/40'
                : 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/30'
            }`}
          >
            {userPlatform === 'windows' && (
              <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">
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
                  <p className="text-[11px] text-slate-400 mt-1">Formato: Instalador Setup</p>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                Windows (PC)
              </h3>
              <p className="text-sm text-slate-300 mt-1 mb-5">
                Para notebooks e computadores Windows. Inclui o Launcher com atualização automática.
              </p>
            </div>

            <div>
              <a
                id="btn-download-exe"
                href={release.exeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wide transition-all shadow-lg shadow-cyan-900/40 cursor-pointer"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Baixar Instalador (Windows)</span>
              </a>

              {/* Dicas de Instalação Windows */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Como instalar no computador:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                  <li>Baixe o instalador <strong>Setup.exe</strong>.</li>
                  <li>Dê dois cliques no arquivo para instalar.</li>
                  <li>Se o SmartScreen abrir, clique em <em>"Mais informações"</em> e <em>"Executar assim mesmo"</em>.</li>
                </ol>
              </div>
            </div>
          </div>

        </div>

        {/* Box de Compartilhamento com os Sobrinhos/Amigos */}
        <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 mb-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                🔗 Link para Enviar aos Sobrinhos ou Amigos
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie este link no WhatsApp para que eles abram esta página e escolham baixar o APK ou o EXE:
              </p>
            </div>

            <button
              id="copy-share-download-link-btn"
              onClick={handleCopyLink}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all active:scale-95 shadow cursor-pointer"
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

          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto">
            <span className="text-amber-400 select-none">URL:</span>
            <span className="select-all">{shareUrl}</span>
          </div>

          {copied && (
            <p className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Link copiado para a área de transferência! Pronto para colar no WhatsApp.
            </p>
          )}
        </div>

        {/* Link para Jogar no Navegador sem instalar */}
        {onPlayInBrowser && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Quer jogar direto agora sem instalar nada?
              </p>
              <p className="text-xs text-slate-400">
                A versão web roda direto no navegador com todas as funções online.
              </p>
            </div>
            <button
              id="play-browser-bottom-btn"
              onClick={onPlayInBrowser}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all border border-slate-700 active:scale-95"
            >
              <span>Abrir no Navegador</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Link para as releases do GitHub */}
        <div className="mt-6">
          <a
            href="https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            Ver histórico de versões e código no GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>One Piece Tactics &bull; Jogo para fãs &bull; Todas as marcas pertencem aos seus respectivos proprietários.</p>
      </footer>
    </div>
  );
};
