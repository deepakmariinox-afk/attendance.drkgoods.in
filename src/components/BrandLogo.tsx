import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'glass';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showSubtitle = true,
  className = '',
}) => {
  const isDark = variant === 'dark';
  const isGlass = variant === 'glass';

  const sizeConfigs = {
    sm: {
      emblem: 'w-7 h-7 rounded-lg text-[10px]',
      drkText: 'text-sm font-black',
      goodsText: 'text-[9px] px-1.5 py-0.5',
      subtitle: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      emblem: 'w-9 h-9 rounded-xl text-xs',
      drkText: 'text-base font-black',
      goodsText: 'text-[10px] px-1.5 py-0.5',
      subtitle: 'text-[10px]',
      gap: 'gap-2.5',
    },
    lg: {
      emblem: 'w-11 h-11 rounded-2xl text-sm',
      drkText: 'text-xl font-black',
      goodsText: 'text-xs px-2 py-0.5',
      subtitle: 'text-xs',
      gap: 'gap-3',
    },
    xl: {
      emblem: 'w-14 h-14 rounded-2xl text-base',
      drkText: 'text-2xl font-black',
      goodsText: 'text-xs px-2.5 py-1',
      subtitle: 'text-xs',
      gap: 'gap-3.5',
    },
  };

  const cfg = sizeConfigs[size];

  return (
    <div className={`flex items-center ${cfg.gap} select-none ${className}`}>
      {/* 3D Geometric Brand Monogram Emblem */}
      <div
        className={`relative shrink-0 ${cfg.emblem} flex items-center justify-center font-extrabold tracking-tight transition-all duration-300 shadow-md ${
          isDark || isGlass
            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border border-blue-500/30 shadow-blue-500/10'
            : 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white border border-slate-700/60 shadow-slate-900/20'
        }`}
        style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}
      >
        {/* Subtle inner reflection */}
        <div className="absolute inset-0 rounded-inherit bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 blur-[2px] opacity-70" />

        {/* Dynamic Logo Symbol */}
        <div className="relative z-10 flex items-center justify-center">
          <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-xs font-black">
            D
          </span>
          <span className="bg-gradient-to-r from-sky-200 via-white to-blue-300 bg-clip-text text-transparent font-black -ml-0.5">
            R
          </span>
          <span className="text-blue-400 font-black -ml-0.5">K</span>
        </div>
      </div>

      {/* Styled Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          {/* Main "DRK" Wordmark with Luxury Display Font */}
          <span
            className={`tracking-tight font-black transition-colors ${
              isDark || isGlass
                ? 'bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 bg-clip-text text-transparent'
            } ${cfg.drkText}`}
            style={{ fontFamily: "'Outfit', 'Syne', sans-serif" }}
          >
            DRK
          </span>

          {/* Styled "GOODS" Badge Tag */}
          <span
            className={`font-extrabold uppercase tracking-[0.18em] rounded-md transition-all ${
              isDark || isGlass
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-2xs shadow-blue-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-600/25'
            } ${cfg.goodsText}`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            GOODS
          </span>
        </div>

        {showSubtitle && (
          <p
            className={`font-medium uppercase tracking-[0.14em] mt-1 ${
              isDark || isGlass ? 'text-slate-400' : 'text-slate-500'
            } ${cfg.subtitle}`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Enterprise Workforce & Logistics
          </p>
        )}
      </div>
    </div>
  );
};
