import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';

interface NomineeWithVotes extends User {
    nomination_count: number;
    nominators: string;
}

interface NomineesModalProps {
    awardId: string;
    token: string;
    onClose: () => void;
    awardName: string;
}

const NomineesModal: React.FC<NomineesModalProps> = ({ awardId, token, onClose, awardName }) => {
    const [nominees, setNominees] = useState<NomineeWithVotes[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNominees = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const candidates = await api.getAwardNominations(awardId, token);
                setNominees(candidates);
            } catch (error) {
                console.error('Error fetching nominees:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNominees();
    }, [awardId, token]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Nominados para {awardName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Spinner />
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <ul className="space-y-3 p-2">
                            {nominees.map(nominee => (
                                <li key={nominee.id} className="flex items-center bg-gray-700/50 p-3 rounded-lg transition-transform hover:scale-105">
                                    <img
                                        src={nominee.avatar_url || `https://picsum.photos/seed/${nominee.id}/40`}
                                        alt={nominee.full_name}
                                        className="h-10 w-10 rounded-full mr-4 border-2 border-gray-600"
                                    />
                                    <div className="flex-1">
                                        <span className="text-white font-medium">{nominee.full_name}</span>
                                        <p className="text-sm text-gray-400">
                                            Votes: {nominee.nomination_count}
                                        </p>
                                        <p className="text-xs text-gray-500" title={nominee.nominators}>
                                            Nominators: {nominee.nominators}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NomineesModal;