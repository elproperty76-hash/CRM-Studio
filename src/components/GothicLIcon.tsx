import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GothicLIcon({ size = 'md', className = '' }: Props) {
  const sizeMap = {
    sm: 'w-7 h-7 text-lg rounded-lg',
    md: 'w-8 h-8 text-2xl rounded-xl',
    lg: 'w-11 h-11 text-3xl rounded-2xl',
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-amber-500/30 shadow-sm select-none overflow-hidden shrink-0 ${sizeMap[size]} ${className}`}
      title="Logo L Gothic"
    >
      {/* Gothic subtle glow & texture */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
      <div className="absolute inset-[1px] border border-amber-400/20 rounded-[inherit] pointer-events-none" />

      {/* Gothic Letter L (Fraktur Blackletter) */}
      <span 
        className="relative z-10 font-normal leading-none text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transform -translate-y-[1px]"
        style={{
          fontFamily: "'UnifrakturMaguntia', 'Pirata One', 'Old English Text MT', 'Fraktur', cursive, serif",
        }}
      >
        𝕷
      </span>
    </div>
  );
}
