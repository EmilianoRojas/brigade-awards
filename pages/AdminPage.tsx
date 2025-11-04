import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Award } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { useNotification } from '../contexts/NotificationContext';

const AdminPage: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [awards, setAwards] = useState<Award[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchAwards = async () => {
            if (!isAdmin) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const { data, error } = await supabase.from('awards').select('*').order('name', { ascending: true });
                if (error) throw error;
                setAwards(data || []);
            } catch (error: any) {
                console.error('Error fetching awards:', error);
                addNotification(error.message || 'Failed to fetch awards', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchAwards();
    }, [isAdmin, addNotification]);

    const getNextPhase = (currentPhase: string): string | null => {
        switch (currentPhase) {
            case 'NOMINATION':
                return 'FINAL_VOTING';
            case 'FINAL_VOTING':
                return 'RESULTS';
            case 'RESULTS':
                return 'CLOSED';
            default:
                return null;
        }
    };

    const handleBulkPhaseChange = async (fromPhase: string, toPhase: string) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const { error } = await supabase.functions.invoke('update-award-phase', {
                body: { from_phase: fromPhase, to_phase: toPhase },
            });

            if (error) throw error;

            // Update the local state to reflect the change
            setAwards(prevAwards =>
                prevAwards.map(award =>
                    award.phase === fromPhase ? { ...award, phase: toPhase } : award
                )
            );
            addNotification(`All awards in ${fromPhase} have been moved to ${toPhase}.`, 'success');
        } catch (error: any) {
            console.error('Error updating award phases:', error);
            addNotification(error.message || 'Failed to update award phases', 'error');
        }
    };

    if (loading) {
        return <Spinner />;
    }

    if (!user) {
        return (
            <>
                <div className="container mx-auto p-4 text-center">
                    <p>Debes iniciar sesión para ver esta página.</p>
                </div>
            </>
        );
    }

    if (!isAdmin) {
        return (
            <>
                <div className="container mx-auto p-4 text-center">
                    <p>No tienes permiso para acceder a esta página.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>

                <div className="mb-8 p-4 border rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-2">Gestión de Fases en Lote</h2>
                    <div className="flex space-x-4">
                        <Button onClick={() => handleBulkPhaseChange('NOMINATION', 'FINAL_VOTING')}>
                            Finalizar Fase de Nominación para Todos
                        </Button>
                        <Button onClick={() => handleBulkPhaseChange('FINAL_VOTING', 'RESULTS')}>
                            Finalizar Fase de Votación para Todos
                        </Button>
                        <Button onClick={() => handleBulkPhaseChange('RESULTS', 'CLOSED')}>
                            Cerrar Todas las Premiaciones
                        </Button>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Estado Individual de Premiaciones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {awards.map(award => (
                            <div key={award.id} className="p-4 border rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold">{award.name}</h3>
                                <p>Fase Actual: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{award.phase}</span></p>
                                {award.phase === 'RESULTS' && (
                                    <Button
                                        onClick={() => alert('Show results logic to be implemented')}
                                        className="mt-4"
                                    >
                                        Ver Resultados
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminPage;