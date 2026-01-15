import React from 'react';
import { EnglishLevel } from '../types';
import { LEVELS } from '../constants';
import { Settings, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentLevel: EnglishLevel;
  setLevel: (level: EnglishLevel) => void;
  onGoHome: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentLevel, setLevel, onGoHome }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center cursor-pointer group" 
          onClick={onGoHome}
        >
          <div className="bg-primary text-white p-2 rounded-lg mr-3 group-hover:bg-blue-600 transition-colors">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Eng<span className="text-primary">Fluent</span>
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-1 py-1 border border-slate-200">
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setLevel(level)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  ${currentLevel === level 
                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
