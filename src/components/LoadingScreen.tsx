import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
  progress: number;
  currentAsset: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  progress,
  currentAsset,
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="global-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 select-none overflow-hidden"
        >
          {/* Subtle Background Glow and Tactical Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.15),transparent_70%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

          {/* Central Logo & Emblem */}
          <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
            {/* Animated Glowing Crest */}
            <div className="relative mb-6 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full border-2 border-amber-500/20 border-dashed"
              />
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-1 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-600/30 to-rose-600/20 blur-md"
              />
              <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center">
                <Swords className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              One Piece Auto Battle
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Preparando Arena Tática & Ativos 3D
            </p>

            {/* Progress Container */}
            <div className="w-full mt-8 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
              {/* Status Header */}
              <div className="flex items-center justify-between text-xs font-bold mb-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  )}
                  <span className="truncate max-w-[200px] text-left">
                    {currentAsset || 'Carregando Modelos FBX...'}
                  </span>
                </span>
                <span className="font-mono text-amber-400 text-sm font-black">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Asset Pipeline Badges */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/70 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 justify-center py-1 rounded bg-slate-950/60 border border-slate-800/50 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Cache em Memória 60fps
                </div>
                <div className="flex items-center gap-1.5 justify-center py-1 rounded bg-slate-950/60 border border-slate-800/50 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Renderizador Three.js
                </div>
              </div>
            </div>

            {/* Quick Tactical Tip */}
            <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-500/70" />
              <span>Personagens corpo a corpo cercam inimigos pelos flancos e costas!</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
