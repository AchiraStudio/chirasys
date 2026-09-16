import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /* padding: none by default so tables can flush-fit; pass 'padded' for standard spacing */
  padded?: boolean;
}

export function Card({ padded, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-card border border-line rounded-xl shadow-xs transition-colors ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 sm:px-5 py-4 border-b border-line ${className}`} {...rest} />;
}

export function CardTitle({ className = '', ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-sm font-bold text-heading ${className}`} {...rest} />;
}

export function CardBody({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 sm:p-5 ${className}`} {...rest} />;
}
