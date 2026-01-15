import React from 'react';
import { Scenario } from '../types';
import { ICON_MAP } from '../constants';
import { ChevronRight } from 'lucide-react';

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onClick }) => {
  const Icon = ICON_MAP[scenario.icon] || ICON_MAP.Coffee;

  return (
    <button
      onClick={onClick}
      className="
        flex flex-col text-left
        bg-white rounded-2xl p-6 
        border border-slate-200 shadow-sm
        hover:shadow-md hover:border-primary/30 hover:scale-[1.02]
        transition-all duration-300 group
        h-full
      "
    >
      <div className="flex items-start justify-between w-full mb-4">
        <div className="p-3 rounded-xl bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <Icon size={28} strokeWidth={2} />
        </div>
        <ChevronRight className="text-slate-300 group-hover:text-primary transition-colors" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 mb-1">{scenario.title}</h3>
      <h4 className="text-sm font-medium text-slate-500 font-kr mb-3">{scenario.titleKr}</h4>
      <p className="text-sm text-slate-600 leading-relaxed">
        {scenario.description}
      </p>
    </button>
  );
};

export default ScenarioCard;
