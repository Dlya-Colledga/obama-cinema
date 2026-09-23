import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'rating' | 'age' | 'type' | 'default';
  ratingValue?: number;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  ratingValue,
  className = '',
}) => {
  let styleClasses = 'bg-white/10 text-gray-200 border-white/10';

  if (variant === 'age') {
    styleClasses = 'bg-[#000000] text-gray-300 border-[#FF002F]/30 font-semibold';
  } else if (variant === 'type') {
    styleClasses = 'bg-[#FF002F]/15 text-[#FF002F] border-[#FF002F]/30 font-medium';
  } else if (variant === 'rating' && ratingValue !== undefined) {
    if (ratingValue >= 7.5) {
      styleClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold';
    } else if (ratingValue >= 6.0) {
      styleClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold';
    } else {
      styleClasses = 'bg-gray-500/20 text-gray-300 border-gray-500/30 font-bold';
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border backdrop-blur-sm ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
