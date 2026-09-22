import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, X, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
}

interface ReleaseData {
  tagName: string;
  name: string;
  exeUrl: string;
  exeSize: string;
  apkUrl: string;
  apkSize: string;
  publishedAt?: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  currentVersion = '0.1.6',
}) => {
  const [release, setRelease] = useState<ReleaseData>({
    tagName: `v${currentVersion}`,
    name: `One Piece Tactics v${currentVersion}`,
    exeUrl: `https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest`,
    exeSize: '~300 MB',
    apkUrl: `https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest`,
    apkSize: '~79 MB',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    fetch('https://api.github.com/repos/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/latest')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao buscar release');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        let exeUrl = `https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases/tag/${data.tag_name || `v${currentVersion}`}`;
        let apkUrl = exeUrl;
        let exeSize = '~300 MB';
        let apkSize = '~79 MB';

        if (Array.isArray(data.assets)) {
          // Localizar o instalador Windows .exe
          const exeAsset = data.assets.find(
            (a: any) => a.name.endsWith('.exe') && !a.name.includes('blockmap')
          );
          if (exeAsset) {
            exeUrl = exeAsset.browser_download_url;
            exeSize = `${(exeAsset.size / (1024 * 1024)).toFixed(1)} MB`;
          }

          // Localizar o arquivo Android .apk
          const apkAsset = data.assets.find((a: any) => a.name.endsWith('.apk'));
          if (apkAsset) {
            apkUrl = apkAsset.browser_download_url;
            apkSize = `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`;
          }
        }

        setRelease({
          tagName: data.tag_name || `v${currentVersion}`,
          name: data.name || `One Piece Tactics ${data.tag_name || currentVersion}`,
          exeUrl,
          exeSize,
          apkUrl,
          apkSize,
          publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString('pt-BR') : undefined,
        });
      })
      .catch((err) => {
        console.warn('Usando links padrão de fallback para download:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentVersion]);

  if (!isOpen) return null;

  return (
    <div
      id="download-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="download-modal-container"
        className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl p-6 sm:p-7 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          id="close-download-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wide text-amber-400 flex items-center gap-2">
              Baixar One Piece Tactics
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {release.tagName}
              </span>
              {release.publishedAt && <span>Atualizado em {release.publishedAt}</span>}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Escolha a sua plataforma para baixar a versão instalável do jogo com suporte a multiplayer e atualizações automáticas:
        </p>

        {/* Lista de Botões de Download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* BOTÃO ANDROID (APK) */}
          <a
            id="download-apk-btn"
            href={release.apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-900/40 transition-all active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {release.apkSize}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Android
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Arquivo APK instalável</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Baixar APK
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>

          {/* BOTÃO WINDOWS (EXE) */}
          <a
            id="download-exe-btn"
            href={release.exeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 via-slate-900 to-slate-900 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-900/40 transition-all active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-900/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {release.exeSize}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                Windows (PC)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Instalador com Launcher</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Baixar EXE
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        </div>

        {/* Instruções úteis */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Android:</strong> Caso o celular bloqueie a instalação, toque em <em>"Configurações"</em> e ative <em>"Permitir desta fonte"</em>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Windows:</strong> O instalador inclui o Launcher com auto-update. Se o SmartScreen alertar, clique em <em>"Mais informações"</em> e <em>"Executar assim mesmo"</em>.
            </span>
          </div>
        </div>

        {/* Link para página de download e WhatsApp */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <a
            href="/download"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/download');
              window.dispatchEvent(new PopStateEvent('popstate'));
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition-colors"
          >
            Abrir Página Completa de Download <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://github.com/SansaoYago/One-Piece-TFT-Auto-Battle-Chess/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Releases no GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
