import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8 w-auto", showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Abstract Geometric Logo for White Label Usage */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Platform Logo"
      >
        <rect width="40" height="40" rx="8" className="fill-primary" fillOpacity="0.1" />
        <path 
            d="M20 8L32 14.9282V28.7846L20 35.7128L8 28.7846V14.9282L20 8Z" 
            className="stroke-primary" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
        />
        <circle cx="20" cy="22" r="5" className="fill-primary" />
      </svg>
      
      {showText && (
        <div className="flex flex-col justify-center">
            <span className="font-bold text-lg tracking-tight text-title leading-none">
              Nexus<span className="text-primary">AI</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Enterprise</span>
        </div>
      )}
    </div>
  );
};

export default Logo;