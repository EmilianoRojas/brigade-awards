import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Award } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { useNotification } from '../contexts/NotificationContext';
import { toggleAwardActive, getAllAwards, bulkActivateAwards, bulkDeactivateAwards, resetAwards } from '../services/api';

const AdminPage: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [awards, setAwards] = useState<Award[]>([]);
    const [loading, setLoading] = useState(true);
    const [buttonLoading, setButtonLoading] = useState<{ [key: string]: boolean }>({});
    const [bulkActionLoading, setBulkActionLoading] = useState<{ [key: string]: boolean }>({});
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchAwards = async () => {
            if (!isAdmin) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const token = (await supabase.auth.getSession()).data.session?.access_token;
                if (!token) {
                    throw new Error("Authentication token not found.");
                }
                const data = await getAllAwards(token);
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
        const actionName = `${fromPhase}_${toPhase}`;
        setBulkActionLoading(prev => ({ ...prev, [actionName]: true }));
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
                    award.phase === fromPhase ? { ...award, phase: toPhase as Award['phase'] } : award
                )
            );
            addNotification(`All awards in ${fromPhase} have been moved to ${toPhase}.`, 'success');
        } catch (error: any) {
            console.error('Error updating award phases:', error);
            addNotification(error.message || 'Failed to update award phases', 'error');
        } finally {
            setBulkActionLoading(prev => ({ ...prev, [actionName]: false }));
        }
    };

    const handleToggleActive = async (awardId: string, currentStatus: boolean) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const updatedAward = await toggleAwardActive(awardId, !currentStatus, token);

            setAwards(prevAwards =>
                prevAwards.map(award =>
                    award.id === awardId ? updatedAward : award
                )
            );
            addNotification(`Award status updated successfully.`, 'success');
        } catch (error: any) {
            console.error('Error toggling award status:', error);
            addNotification(error.message || 'Failed to update award status', 'error');
        }
    };

    const handleBulkStatusChange = async (activate: boolean) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            if (activate) {
                await bulkActivateAwards(token);
            } else {
                await bulkDeactivateAwards(token);
            }

            setAwards(prevAwards =>
                prevAwards.map(award => ({ ...award, active: activate }))
            );
            addNotification(`All awards have been ${activate ? 'activated' : 'deactivated'}.`, 'success');
        } catch (error: any) {
            console.error('Error changing bulk award status:', error);
            addNotification(error.message || 'Failed to change bulk award status', 'error');
        }
    };

    const handleEndNomination = async (awardId: string) => {
        setButtonLoading(prev => ({ ...prev, [awardId]: true }));
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const { error } = await supabase.functions.invoke('end-nomination-phase', {
                body: { award_id: awardId },
            });

            if (error) throw error;

            setAwards(prevAwards =>
                prevAwards.map(award =>
                    award.id === awardId ? { ...award, phase: 'FINAL_VOTING' } : award
                )
            );
            addNotification(`Nomination phase ended for the award.`, 'success');
        } catch (error: any) {
            console.error('Error ending nomination phase:', error);
            addNotification(error.message || 'Failed to end nomination phase', 'error');
        } finally {
            setButtonLoading(prev => ({ ...prev, [awardId]: false }));
        }
    };

    const handleEndVoting = async (awardId: string) => {
        setButtonLoading(prev => ({ ...prev, [awardId]: true }));
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const { error } = await supabase.functions.invoke('end-voting-phase', {
                body: { award_id: awardId },
            });

            if (error) throw error;

            setAwards(prevAwards =>
                prevAwards.map(award =>
                    award.id === awardId ? { ...award, phase: 'RESULTS' } : award
                )
            );
            addNotification(`Voting phase ended for the award.`, 'success');
        } catch (error: any) {
            console.error('Error ending voting phase:', error);
            addNotification(error.message || 'Failed to end voting phase', 'error');
        } finally {
            setButtonLoading(prev => ({ ...prev, [awardId]: false }));
        }
    };

    const handleResetAwards = async () => {
        setBulkActionLoading(prev => ({ ...prev, ['reset_awards']: true }));
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            await resetAwards(token);

            // Refetch awards to update the UI
            const data = await getAllAwards(token);
            setAwards(data || []);
            addNotification('Todas las premiaciones han sido reiniciadas.', 'success');
        } catch (error: any) {
            console.error('Error resetting awards:', error);
            addNotification(error.message || 'Failed to reset awards', 'error');
        } finally {
            setBulkActionLoading(prev => ({ ...prev, ['reset_awards']: false }));
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
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Gestión de Fases en Lote</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Button
                            onClick={() => handleBulkPhaseChange('NOMINATION', 'FINAL_VOTING')}
                            className="w-full text-sm px-4 py-2"
                            isLoading={bulkActionLoading['NOMINATION_FINAL_VOTING']}
                        >
                            Finalizar Nominación
                        </Button>
                        <Button
                            onClick={() => handleBulkPhaseChange('FINAL_VOTING', 'RESULTS')}
                            className="w-full text-sm px-4 py-2"
                            isLoading={bulkActionLoading['FINAL_VOTING_RESULTS']}
                        >
                            Finalizar Votación
                        </Button>
                        <Button
                            onClick={() => handleBulkPhaseChange('RESULTS', 'CLOSED')}
                            className="w-full text-sm px-4 py-2"
                        >
                            Cerrar Premiaciones
                        </Button>
                    </div>
                </div>

                <div className="mb-8 p-4 border rounded-lg shadow-sm">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Gestión de Estado en Lote</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            onClick={() => handleBulkStatusChange(true)}
                            className="w-full text-sm px-4 py-2"
                        >
                            Activar Todas
                        </Button>
                        <Button
                            onClick={() => handleBulkStatusChange(false)}
                            className="w-full text-sm px-4 py-2"
                        >
                            Desactivar Todas
                        </Button>
                    </div>
                </div>

                <div className="mb-8 p-4 border rounded-lg shadow-sm bg-red-50">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4 text-red-800">Zona de Peligro</h2>
                    <p className="text-red-700 mb-4">
                        Esta acción reiniciará todas las premiaciones a su estado inicial (Nominación) y borrará todos los votos y nominaciones. Esta acción no se puede deshacer.
                    </p>
                    <Button
                        onClick={() => {
                            if (window.confirm('¿Estás seguro de que quieres reiniciar todas las premiaciones? Esta acción es irreversible.')) {
                                handleResetAwards();
                            }
                        }}
                        className="w-full text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                        isLoading={bulkActionLoading['reset_awards']}
                    >
                        Reiniciar Premiaciones
                    </Button>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2">Estado Individual de Premiaciones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {awards.map(award => (
                            <div key={award.id} className="p-4 border rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold">{award.name}</h3>
                                <p>Fase Actual: <span className="font-mono text-gray-600 bg-gray-200 px-2 py-1 rounded">{award.phase}</span></p>
                                <p>Estado: {award.active ? <span className="text-green-600 font-bold">Activo</span> : <span className="text-red-600 font-bold">Inactivo</span>}</p>
                                <Button
                                    onClick={() => handleToggleActive(award.id, award.active)}
                                    className="mt-4"
                                >
                                    {award.active ? 'Desactivar' : 'Activar'}
                                </Button>
                                {award.phase === 'NOMINATION' && (
                                    <Button
                                        onClick={() => handleEndNomination(award.id)}
                                        className="mt-4 ml-2"
                                        isLoading={buttonLoading[award.id]}
                                    >
                                        End Nomination
                                    </Button>
                                )}
                                {award.phase === 'FINAL_VOTING' && (
                                    <Button
                                        onClick={() => handleEndVoting(award.id)}
                                        className="mt-4 ml-2"
                                        isLoading={buttonLoading[award.id]}
                                    >
                                        End Voting
                                    </Button>
                                )}
                                {award.phase === 'RESULTS' && (
                                    <Link to={`/results/${award.id}`}>
                                        <Button className="mt-4 ml-2">
                                            Ver Resultados
                                        </Button>
                                    </Link>
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