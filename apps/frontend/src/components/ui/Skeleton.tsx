import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[#1e080b]/80 rounded-xl ${className}`}
    />
  );
};
