import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-white/20',
        age: 'border-primary/30 bg-background text-gray-300 font-semibold',
        type: 'border-primary/30 bg-primary/15 text-primary font-medium',
        rating: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  ratingValue?: number;
}

function Badge({ className, variant, ratingValue, children, ...props }: BadgeProps) {
  let customRatingClass = '';
  if (variant === 'rating' && ratingValue !== undefined) {
    if (ratingValue >= 7.5) {
      customRatingClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold';
    } else if (ratingValue >= 6.0) {
      customRatingClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold';
    } else {
      customRatingClass = 'bg-gray-500/20 text-gray-300 border-gray-500/30 font-bold';
    }
  }

  return (
    <div
      className={cn(badgeVariants({ variant }), customRatingClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
