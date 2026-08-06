import type {
  HTMLAttributes,
  ReactNode
} from 'react';

interface CardProps
  extends
    HTMLAttributes<
      HTMLElement
    > {
  children: ReactNode;
  elevated?: boolean;
}

export function Card({
  children,
  elevated = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <section
      className={
        `ds-card ${elevated ? 'ds-card--elevated' : ''} ${className}`
      }
      {...props}
    >
      {children}
    </section>
  );
}
