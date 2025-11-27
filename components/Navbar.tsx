import React from 'react';
import Logo from './Logo';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-surface text-body px-6 py-3 shadow-sm border-b border-gray-200 z-20">
      <div className="flex justify-between items-center max-w-full">
        <div className="flex items-center">
            <Logo className="h-9 w-9" />
        </div>
        
        <div className="flex items-center gap-4">
           {/* Placeholder for user profile */}
           <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer">
              <span className="text-xs font-bold text-primary">US</span>
           </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;