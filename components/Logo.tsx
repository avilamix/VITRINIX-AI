import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8 w-auto", showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="VitrineX AI Logo"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" /> {/* primary */}
            <stop offset="100%" stopColor="#00FF99" /> {/* accent */}
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Hexagon Frame */}
        <path
          d="M50 5 L93.3 30 V80 L50 105 L6.7 80 V30 Z"
          stroke="url(#logoGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* Neural Nodes 'V' Shape */}
        <g filter="url(#glow)">
            {/* Left Node */}
            <circle cx="30" cy="40" r="6" fill="#00FF99" />
            {/* Right Node */}
            <circle cx="70" cy="40" r="6" fill="#00FF99" />
            {/* Bottom Node */}
            <circle cx="50" cy="75" r="8" fill="#8B5CF6" />
            
            {/* Connections */}
            <path d="M30 40 L50 75 L70 40" stroke="white" strokeWidth="4" strokeLinecap="round" />
            <path d="M50 75 L50 55" stroke="#8B5CF6" strokeWidth="2" />
            <circle cx="50" cy="55" r="4" fill="#00FF99" />
        </g>
      </svg>
      {showText && (
        <span className="font-bold text-xl md:text-2xl tracking-tight text-white">
          Vitrine<span className="text-accent">X</span> <span className="text-primary text-sm align-top">AI</span>
        </span>
      )}
    </div>
  );
};

export default Logo;