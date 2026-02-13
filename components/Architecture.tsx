import React from 'react';

const Architecture = () => {
  return (
    <div className="bg-gray-900 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">Architecture-at-a-Glance</h2>
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold">Agent</h3>
              <p className="text-gray-400">Monitors files and logs</p>
            </div>
          </div>
          <div className="relative w-1/3 mx-4">
            <div className="bg-gray-700 h-2 rounded-full"></div>
            <div className="absolute top-0 left-0 h-full w-full flex items-center">
              <div className="packet-animation h-4 w-4 bg-blue-500 rounded-full shadow-lg"></div>
            </div>
            <div className="text-center mt-4">
              <p className="font-semibold">UDP Port 1514</p>
              <p className="text-sm text-gray-400">Blowfish/AES Encryption</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold">Manager</h3>
              <p className="text-gray-400">Analyzes and alerts</p>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .packet-animation {
          animation: travel 4s linear infinite;
        }
        @keyframes travel {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(100% - 1rem));
          }
        }
      `}</style>
    </div>
  );
};

export default Architecture;
