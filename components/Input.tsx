import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className = '', ...props }, ref) => {
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-textlight mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark placeholder-textmuted focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm ${className}`}
        {...props}
      />
    </div>
  );
});

export default Input;