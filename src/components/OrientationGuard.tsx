import React, { useEffect, useState } from 'react';
import { RotateCw, Smartphone, Maximize, Compass } from 'lucide-react';

export const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;

      // Check both aspect ratio and orientation
      const isHeightGreater = window.innerHeight > window.innerWidth;
      const isMobileDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 900;

      // Lock condition: portrait on mobile/tablet screens
      setIsPortrait(isHeightGreater && isMobileDevice);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Screen orientation API listener
    if (typeof window !== 'undefined' && window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (typeof window !== 'undefined' && window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      // 1. Try Fullscreen first (often required before orientation locking)
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      }

      // 2. Try Screen Orientation Lock API
      const screenAny = window.screen as any;
      if (screenAny?.orientation?.lock) {
        await screenAny.orientation.lock('landscape');
      } else if (screenAny?.lockOrientation) {
        screenAny.lockOrientation('landscape');
      }
    } catch {
      // Browsers may restrict orientation lock outside user-installed PWA or native app
    }
  };

  if (!isPortrait) {
    return null;
  }

  return (
    <div
      id="orientation-landscape-guard"
      className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
    >
      {/* Background Animated Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full flex flex-col items-center space-y-6">
        {/* Animated Rotating Phone Graphic */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
          <div className="w-24 h-24 rounded-3xl bg-slate-900/90 border-2 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center justify-center relative">
            <Smartphone className="w-12 h-12 text-amber-400 animate-[spin_4s_ease-in-out_infinite]" />
            <RotateCw className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-spin duration-1000" />
          </div>
        </div>

        {/* Title & Explanatory Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-amber-400" /> Modo Paisagem Obrigatório
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Gire a tela para a Horizontal
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-amber-400">One Piece Tactics</strong> foi projetado para a visão tática panorâmica da arena em modo <strong className="text-slate-200">Paisagem (Landscape)</strong>.
          </p>
        </div>

        {/* Landscape Action Button */}
        <button
          onClick={handleRequestLandscape}
          className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Maximize className="w-4 h-4" />
          Travar Paisagem / Tela Cheia
        </button>

        <p className="text-[10px] text-slate-500 font-mono">
          Desbloqueie a rotação automática do seu aparelho para continuar.
        </p>
      </div>
    </div>
  );
};
