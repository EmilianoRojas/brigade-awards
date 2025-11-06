import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAwards } from '../services/api';
import { Award } from '../types';
import Spinner from '../components/Spinner';
import AwardCard from '../components/AwardCard';
import { useNotification } from '../hooks/useNotification';

const AwardsPage: React.FC = () => {
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-8">Premiaciones</h2>
            {awards.length === 0 ? (
                <p className="text-gray-400">No hay premiaciones disponibles en este momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {awards.map((award) => (
                        <Link to={`/voting/${award.id}`} key={award.id}>
                            <AwardCard award={award} />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AwardsPage;
