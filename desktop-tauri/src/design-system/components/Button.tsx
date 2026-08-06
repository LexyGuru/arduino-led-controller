import type {
  ButtonHTMLAttributes,
  ReactNode
} from 'react';

interface ButtonProps
  extends
    ButtonHTMLAttributes<
      HTMLButtonElement
    > {
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={
        `ds-button ds-button--${variant} ${className}`
      }
      {...props}
    >
      {children}
    </button>
  );
}
