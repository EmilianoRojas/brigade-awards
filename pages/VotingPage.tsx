import React, { useState, useEffect, useCallback } from 'react';
import { Award, User, UserNomination, AwardResult } from '../types';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import UserSelectionCard from '../components/UserSelectionCard';
import ResultsChart from '../components/ResultsChart';
import { useNotification } from '../hooks/useNotification';

interface VotingPageProps {
    award: Award;
    onBack: () => void;
}

const VotingPage: React.FC<VotingPageProps> = ({ award, onBack }) => {
    const { user, token } = useAuth();
    const { showNotification } = useNotification();
    const [candidates, setCandidates] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userVote, setUserVote] = useState<UserNomination | null>(null);

    // State for user selections
    const [selectedNominations, setSelectedNominations] = useState<string[]>([]);
    const [selectedFinalVote, setSelectedFinalVote] = useState<string | null>(null);

    // State for results
    const [results, setResults] = useState<AwardResult[]>([]);

    const fetchPageData = useCallback(async () => {
        if (!token || !user) return;
        try {
            setIsLoading(true);

            const [fetchedCandidates, userVotes] = await Promise.all([
                award.phase !== 'RESULTS' ? api.getAwardCandidates(award.id, token) : Promise.resolve([]),
                api.getUserVotes(token)
            ]);

            setCandidates(fetchedCandidates);
            const currentUserVote = userVotes.find(v => v.award_id === award.id) || null;
            setUserVote(currentUserVote);

            if (currentUserVote) {
                if (award.phase === 'NOMINATION') {
                    setSelectedNominations(currentUserVote.nominations);
                } else if (award.phase === 'FINAL_VOTING') {
                    setSelectedFinalVote(currentUserVote.final_vote);
                }
            } else {
                setSelectedNominations([]);
                setSelectedFinalVote(null);
            }

            if (award.phase === 'RESULTS') {
                const fetchedResults = await api.getAwardResults(award.id, token);
                setResults(fetchedResults);
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load page data.';
            showNotification(message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [award.id, award.phase, token, user, showNotification]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleNominationToggle = (userId: string) => {
        setSelectedNominations(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            }
            if (prev.length < award.max_nominations) {
                return [...prev, userId];
            }
            return prev;
        });
    };

    const handleFinalVoteSelect = (userId: string) => {
        setSelectedFinalVote(userId);
    };

    const handleSubmit = async () => {
        if (!token) return;
        setIsSubmitting(true);

        try {
            if (award.phase === 'NOMINATION') {
                await api.submitNominations(award.id, selectedNominations, token);
                showNotification('Your nominations have been submitted successfully!', 'success');
            } else if (award.phase === 'FINAL_VOTING' && selectedFinalVote) {
                await api.submitFinalVote(award.id, selectedFinalVote, token);
                showNotification('Your vote has been cast successfully!', 'success');
            }
            await fetchPageData(); // Refresh data to show submission
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Submission failed.';
            showNotification(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderNominationView = () => {
        const hasVoted = userVote && userVote.nominations.length > 0;
        return (
            <div>
                <p className="text-gray-300 mb-2">Selecciona hasta {award.max_nominations} nominados.</p>
                <p className="text-gray-400 text-sm mb-6">Has seleccionado {selectedNominations.length} / {award.max_nominations}.</p>
                <div className="space-y-4">
                    {candidates.map(candidate => {
                        const isSelf = candidate.id === user?.id;
                        const isPartner = candidate.id === user?.partner_id;
                        const isDisabled = isSelf || isPartner || (selectedNominations.length >= award.max_nominations && !selectedNominations.includes(candidate.id)) || hasVoted;
                        let disabledReason = '';
                        if (isSelf) disabledReason = "No puedes votar por ti mismo.";
                        else if (isPartner) disabledReason = "No puedes votar por tu pareja.";
                        else if (hasVoted) disabledReason = "Ya has enviado tus nominaciones.";

                        return (
                            <UserSelectionCard
                                key={candidate.id}
                                user={candidate}
                                isSelected={selectedNominations.includes(candidate.id)}
                                isDisabled={isDisabled}
                                onToggle={handleNominationToggle}
                                selectionType="checkbox"
                                disabledReason={disabledReason}
                            />
                        );
                    })}
                </div>
                {!hasVoted && (
                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={selectedNominations.length === 0}
                        className="mt-8 w-full sm:w-auto"
                    >
                        Enviar Nominaciones
                    </Button>
                )}
            </div>
        );
    };

    const renderFinalVotingView = () => {
        const hasVoted = !!userVote?.final_vote;
        return (
            <div>
                <p className="text-gray-300 mb-6">Selecciona un nominado para emitir tu voto final.</p>
                <div className="space-y-4">
                    {candidates.map(candidate => {
                        const isSelf = candidate.id === user?.id;
                        const isPartner = candidate.id === user?.partner_id;
                        const isDisabled = isSelf || isPartner || hasVoted;
                        let disabledReason = '';
                        if (isSelf) disabledReason = "No puedes votar por ti mismo.";
                        else if (isPartner) disabledReason = "No puedes votar por tu pareja.";
                        else if (hasVoted) disabledReason = "Ya has emitido tu voto final.";

                        return (
                            <UserSelectionCard
                                key={candidate.id}
                                user={candidate}
                                isSelected={selectedFinalVote === candidate.id}
                                isDisabled={isDisabled}
                                onToggle={handleFinalVoteSelect}
                                selectionType="radio"
                                disabledReason={disabledReason}
                            />
                        )
                    })}
                </div>
                {!hasVoted && (
                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={!selectedFinalVote}
                        className="mt-8 w-full sm:w-auto"
                    >
                        Enviar Voto Final
                    </Button>
                )}
            </div>
        );
    };

    const renderResultsView = () => {
        if (results.length === 0) {
            return <p className="text-gray-400">Los resultados aún no están disponibles.</p>;
        }
        const winner = results[0];
        return (
            <div>
                <div className="bg-gray-800 p-6 rounded-lg mb-8 text-center">
                    <h3 className="text-lg font-medium text-indigo-400">Ganador</h3>
                    <div className="mt-4 flex flex-col items-center">
                        <img
                            className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-500"
                            src={winner.avatar_url || `https://picsum.photos/seed/${winner.nominee_id}/200`}
                            alt={winner.full_name}
                        />
                        <p className="mt-4 text-2xl font-bold text-white">{winner.full_name}</p>
                        <p className="text-gray-300">{winner.vote_count} Votos</p>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Resultados Completos</h3>
                <ResultsChart data={results} />
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) return <Spinner />;

        const hasVoted = (award.phase === 'NOMINATION' && userVote && userVote.nominations.length > 0) || (award.phase === 'FINAL_VOTING' && !!userVote?.final_vote);

        return (
            <>
                {hasVoted && <div className="bg-blue-900/50 text-blue-300 p-4 rounded-lg mb-6">¡Gracias por participar! Tu voto para esta premiación ha sido registrado.</div>}

                {award.phase === 'NOMINATION' && renderNominationView()}
                {award.phase === 'FINAL_VOTING' && renderFinalVotingView()}
                {award.phase === 'RESULTS' && renderResultsView()}
                {award.phase === 'CLOSED' && <p className="text-gray-400">Esta premiación está actualmente cerrada.</p>}
            </>
        )
    };

    return (
        <div>
            <button onClick={onBack} className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Volver a Premiaciones
            </button>
            <div className="bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold text-white mb-2">{award.name}</h2>
                <p className="text-gray-400 mb-8">{award.description}</p>
                {renderContent()}
            </div>
        </div>
    );
};

export default VotingPage;
