import React, { useState, useEffect } from 'react';
import { UnitVisualAssets } from '../types/game';

export type VisualMode = 'portrait' | 'battle' | 'dragging';

interface ChampionVisualProps {
  unitId?: string;
  avatarFallback?: string;
  visualAssets?: UnitVisualAssets;
  customSrc?: string;
  mode?: VisualMode;
  className?: string;
  imageClassName?: string;
  alt?: string;
  sizeClassName?: string;
}

export const ChampionVisual: React.FC<ChampionVisualProps> = ({
  unitId = '',
  avatarFallback = '🏴‍☠️',
  visualAssets,
  customSrc,
  mode = 'portrait',
  className = '',
  imageClassName = '',
  alt = 'Champion',
}) => {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Normalize unit ID for common aliases and variants
  const getNormalizedId = (id?: string): string => {
    if (!id || typeof id !== 'string') return '';
    const lower = id.toLowerCase();
    if (lower.startsWith('marine')) return 'marine';
    if (lower === 'smoker') return 'smoke';
    if (lower === 'crocodile') return 'crocodile';
    return lower;
  };

  // Build ordered candidate URLs to try sequentially
  const getCandidateUrls = (): string[] => {
    if (customSrc) return [customSrc];
    if (!unitId) return [];

    const candidates: string[] = [];
    const normId = getNormalizedId(unitId);

    if (visualAssets) {
      if (mode === 'portrait' && visualAssets.portrait) candidates.push(visualAssets.portrait);
      if (mode === 'battle' && visualAssets.battleSprite) candidates.push(visualAssets.battleSprite);
      if (mode === 'dragging' && visualAssets.draggingSprite) candidates.push(visualAssets.draggingSprite);
      if (visualAssets.portrait && !candidates.includes(visualAssets.portrait)) candidates.push(visualAssets.portrait);
    }

    if (mode === 'battle') {
      candidates.push(`./champions/sprites/${unitId}.png`);
      candidates.push(`/champions/sprites/${unitId}.png`);
      candidates.push(`./champions/sprites/${normId}.png`);
    } else if (mode === 'dragging') {
      candidates.push(`./champions/dragging/${unitId}.png`);
      candidates.push(`/champions/dragging/${unitId}.png`);
      candidates.push(`./champions/dragging/${normId}.png`);
    }

    // Standard portrait paths (relative first, then root-relative)
    candidates.push(`./champions/portraits/${unitId}.png`);
    candidates.push(`/champions/portraits/${unitId}.png`);
    if (normId !== unitId) {
      candidates.push(`./champions/portraits/${normId}.png`);
      candidates.push(`/champions/portraits/${normId}.png`);
    }
    if (unitId === 'smoker') {
      candidates.push(`./champions/portraits/smoke.png`);
      candidates.push(`/champions/portraits/smoke.png`);
      candidates.push(`./champions/portraits/smoker.png`);
      candidates.push(`/champions/portraits/smoker.png`);
    }
    if (unitId === 'crocodile') {
      candidates.push(`./champions/portraits/crocodilepng.png`);
      candidates.push(`/champions/portraits/crocodilepng.png`);
      candidates.push(`./champions/portraits/crocodile.png`);
      candidates.push(`/champions/portraits/crocodile.png`);
    }

    return Array.from(new Set(candidates.filter(Boolean)));
  };

  const candidates = getCandidateUrls();
  const currentSrc = attemptIndex < candidates.length ? candidates[attemptIndex] : null;

  // Reset state when unitId, mode or customSrc changes
  useEffect(() => {
    setAttemptIndex(0);
    setIsLoaded(false);
  }, [unitId, mode, customSrc]);

  const handleImageError = () => {
    if (attemptIndex < candidates.length - 1) {
      setAttemptIndex((prev) => prev + 1);
      setIsLoaded(false);
    } else {
      setAttemptIndex(candidates.length); // All candidates exhausted
    }
  };

  const hasExhaustedAll = attemptIndex >= candidates.length || !currentSrc;

  const safeFallback = avatarFallback || '🏴‍☠️';
  const isFallbackAnUrl =
    typeof safeFallback === 'string' &&
    (safeFallback.startsWith('http://') ||
      safeFallback.startsWith('https://') ||
      safeFallback.startsWith('/') ||
      safeFallback.startsWith('./'));

  if (hasExhaustedAll) {
    if (isFallbackAnUrl) {
      return (
        <span className={`inline-flex items-center justify-center ${className}`}>
          <span className="text-xl">🏴‍☠️</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`}>
        {safeFallback}
      </span>
    );
  }

  const isMarine =
    Boolean(unitId && unitId.toLowerCase().includes('marine')) ||
    (currentSrc ? currentSrc.toLowerCase().includes('marine') : false);

  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}>
      {/* Hidden fallback rendered while image is loading */}
      {!isLoaded && (
        <span className="absolute inset-0 flex items-center justify-center select-none animate-pulse">
          {avatarFallback}
        </span>
      )}

      {/* Main Image with Graceful Multi-source Fallback */}
      <img
        key={currentSrc}
        src={currentSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={handleImageError}
        className={`w-full h-full object-contain pointer-events-none transition-opacity duration-200 ${
          isMarine ? 'animate-marine-idle drop-shadow-[0_4px_8px_rgba(30,58,138,0.5)]' : ''
        } ${isLoaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
      />
    </div>
  );
};
