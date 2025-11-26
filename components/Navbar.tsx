import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-darkbg text-textdark p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold">VitrineX AI</h1>
        {/* Potentially add user profile/logout here */}
        <div>
          {/* <button className="text-sm px-3 py-1 rounded hover:bg-gray-700">Logout</button> */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;