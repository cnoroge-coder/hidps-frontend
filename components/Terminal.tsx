"use client";

import { useState, useEffect } from 'react';

const lines = [
  '[INIT] Sentinel Agent started...', 
  '[SCAN] Checking /etc/passwd integrity... [OK]', 
  '[ALERT] 5 Failed login attempts detected from 192.168.10.5',
  '[ACTION] Triggering Africa\'s Talking SMS API...', 
];

const Terminal = () => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const delayBetweenLines = 1500;

  useEffect(() => {
    const handleTyping = () => {
      const currentLine = lines[currentLineIndex];
      if (isDeleting) {
        setDisplayedText((prev) => prev.substring(0, prev.length - 1));
      } else {
        setDisplayedText((prev) => currentLine.substring(0, prev.length + 1));
      }

      if (!isDeleting && displayedText === currentLine) {
        setTimeout(() => setIsDeleting(true), delayBetweenLines);
      } else if (isDeleting && displayedText === '') {
        setIsDeleting(false);
        setCurrentLineIndex((prev) => (prev + 1) % lines.length);
        if (currentLineIndex === lines.length - 1) {
            setLoopNum(loopNum + 1);
        }
      }
    };

    const typingTimeout = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(typingTimeout);
  }, [displayedText, isDeleting, currentLineIndex, loopNum]);

  return (
    <div className="bg-black py-20 px-4">
        <h2 className="text-4xl font-bold text-center text-white mb-12">Live Action Sentinel</h2>
      <div className="w-full max-w-4xl mx-auto bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 p-4 flex items-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-grow text-center text-gray-400">bash</div>
        </div>
        <div className="p-8 font-mono text-green-400">
          <p>
            <span className="text-green-400">$</span> {displayedText}
            <span className="animate-pulse">_</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
