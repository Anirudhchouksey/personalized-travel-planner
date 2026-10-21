import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'forest' | 'ocean' | 'sand' | 'amber' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'forest',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    forest: 'bg-forest-50 text-forest-800 border-forest-200',
    ocean: 'bg-ocean-50 text-ocean-800 border-ocean-200',
    sand: 'bg-sand-100 text-slate-700 border-sand-300',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
