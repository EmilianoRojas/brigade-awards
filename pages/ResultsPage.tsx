import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Award, AwardResult } from '../types';
import { getAwardResults, getAwards } from '../services/api';
import Spinner from '../components/Spinner';
import { useNotification } from '../contexts/NotificationContext';
import ResultsChart from '../components/ResultsChart';

const ResultsPage: React.FC = () => {
    const { awardId } = useParams<{ awardId: string }>();
    const [results, setResults] = useState<AwardResult[]>([]);
    const [awardTitle, setAwardTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchResults = async () => {
            if (!awardId) {
                addNotification('Award ID is missing.', 'error');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                if (!token) {
                    throw new Error("Authentication token not found.");
                }
                const resultsData = await getAwardResults(awardId, token);
                setResults(resultsData || []);

                const awardsData = await getAwards(token);
                const currentAward = awardsData.find(award => award.id === awardId);
                if (currentAward) {
                    setAwardTitle(currentAward.name);
                }
            } catch (error: any) {
                console.error('Error fetching award results:', error);
                addNotification(error.message || 'Failed to fetch award results', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [awardId, addNotification]);

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Resultados de la Votación: {awardTitle}</h1>
            {results.length > 0 ? (
                <ResultsChart data={results} />
            ) : (
                <p>No se encontraron resultados para esta premiación.</p>
            )}
        </div>
    );
};

export default ResultsPage;