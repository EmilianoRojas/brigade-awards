import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAwards } from '../services/api';
import { Award } from '../types';
import Spinner from '../components/Spinner';
import AwardCard from '../components/AwardCard';
import { useNotification } from '../hooks/useNotification';

interface AwardsPageProps {
    onSelectAward: (award: Award) => void;
}

const AwardsPage: React.FC<AwardsPageProps> = ({ onSelectAward }) => {
    const { token } = useAuth();
    const { showNotification } = useNotification();
    const [awards, setAwards] = useState<Award[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchAwards = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const fetchedAwards = await getAwards(token);
                setAwards(fetchedAwards);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to fetch awards.';
                showNotification(message, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAwards();
    }, [token, showNotification]);

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-8">Awards</h2>
            {awards.length === 0 ? (
                <p className="text-gray-400">No awards available at the moment.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {awards.map((award) => (
                        <AwardCard key={award.id} award={award} onSelect={onSelectAward} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AwardsPage;
