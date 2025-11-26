import React from 'react';
import Logo from './Logo';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-darkbg text-textdark p-4 shadow-md border-b border-gray-800">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
            <Logo className="h-10 w-10" />
        </div>
        
        {/* Potentially add user profile/logout here */}
        <div>
          {/* <button className="text-sm px-3 py-1 rounded hover:bg-gray-700">Logout</button> */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;