import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA or inside electron, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        title="Instalar One Piece Tactics no celular ou desktop"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all active:scale-95 animate-pulse"
      >
        <Download className="w-3.5 h-3.5 text-emerald-100" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          title="Instalar no iPhone / iPad"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold shadow-md border border-amber-400/40 transition-all active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar iOS</span>
          <span className="sm:hidden">iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-2xl border border-amber-500/40 text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Instalar no iOS (iPhone / iPad)
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                Para jogar em tela cheia sem barra de navegador:
              </p>
              <ol className="mt-2 text-xs space-y-2 text-slate-200 list-decimal list-inside bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <li>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.</li>
                <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 py-2 text-xs font-bold text-slate-950 transition shadow-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
