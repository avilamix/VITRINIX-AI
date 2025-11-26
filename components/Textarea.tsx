import React, { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, className = '', ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-textlight mb-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark placeholder-textmuted focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm resize-y ${className}`}
        {...props}
      ></textarea>
    </div>
  );
};

export default Textarea;