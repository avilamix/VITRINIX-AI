import React, { ButtonHTMLAttributes } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out';
  const disabledStyles = 'opacity-60 cursor-not-allowed text-textmuted'; // Text muted for disabled state

  const variantStyles = {
    primary: 'bg-accent text-darkbg shadow-lg shadow-accent/50 hover:bg-neonGreen/80 focus:ring-neonGreen focus:ring-offset-lightbg',
    secondary: 'bg-primary text-white hover:bg-primary/80 focus:ring-primary focus:ring-offset-lightbg',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary focus:ring-offset-lightbg',
    ghost: 'bg-transparent text-primary hover:bg-primary/20 focus:ring-primary focus:ring-offset-lightbg',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 focus:ring-offset-lightbg',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${isLoading || disabled ? disabledStyles : ''} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? <LoadingSpinner /> : children}
    </button>
  );
};

export default Button;