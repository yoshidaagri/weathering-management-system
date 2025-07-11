import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', children, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'border-amber-200 bg-amber-50 text-amber-800',
      destructive: 'border-red-200 bg-red-50 text-red-800',
    };

    return (
      <div
        ref={ref}
        className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p ref={ref} className={`text-sm leading-relaxed ${className}`} {...props}>
        {children}
      </p>
    );
  }
);

AlertDescription.displayName = 'AlertDescription'; 