import React from 'react';
import { Award, Phase } from '../types';

interface AwardCardProps {
    award: Award;
}

const phaseStyles: Record<Phase, { bg: string; text: string; label: string }> = {
    NOMINATION: { bg: 'bg-blue-500', text: 'text-blue-100', label: 'Nominaciones Abiertas' },
    FINAL_VOTING: { bg: 'bg-green-500', text: 'text-green-100', label: 'Votaciones' },
    RESULTS: { bg: 'bg-purple-500', text: 'text-purple-100', label: 'Resultados' },
    CLOSED: { bg: 'bg-gray-600', text: 'text-gray-200', label: 'Cerrado' },
};

const AwardCard: React.FC<AwardCardProps> = ({ award }) => {
    const style = phaseStyles[award.phase] || phaseStyles.CLOSED;

    return (
        <div
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 ease-in-out cursor-pointer flex flex-col"
        >
            <div className="p-6 flex-grow">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{award.name}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                    </span>
                </div>
                <p className="text-gray-400 text-sm">
                    {award.description}
                </p>
            </div>
            <div className="bg-gray-700 px-6 py-3">
                <p className="text-indigo-400 text-sm font-medium">
                    {award.phase === 'NOMINATION' ? `Selecciona ${award.max_nominations} nominados` : 'Ver Detalles y Votar'}
                </p>
            </div>
        </div>
    );
};

export default AwardCard;
