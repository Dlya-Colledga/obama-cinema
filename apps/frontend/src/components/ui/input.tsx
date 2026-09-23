import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, leftIcon, rightIcon, ...props }, ref) => {
    const inputElement = (
      <div className="relative flex w-full items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-muted-foreground pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-destructive ring-1 ring-destructive/40',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-muted-foreground flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (label || error) {
      return (
        <div className="w-full flex flex-col gap-1.5">
          {label && (
            <label className="text-xs font-medium text-gray-300">
              {label}
            </label>
          )}
          {inputElement}
          {error && (
            <span className="text-xs text-destructive mt-0.5">{error}</span>
          )}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = 'Input';

export { Input };
