import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Award, User, UserNomination, AwardResult } from '../types';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import UserSelectionCard from '../components/UserSelectionCard';
import ResultsChart from '../components/ResultsChart';
import { useNotification } from '../hooks/useNotification';

const VotingPage: React.FC = () => {
    const { awardId } = useParams<{ awardId: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [award, setAward] = useState<Award | null>(null);
    const [candidates, setCandidates] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userNominations, setUserNominations] = useState<UserNomination[]>([]);
    const [userFinalVotes, setUserFinalVotes] = useState<UserNomination[]>([]);

    // State for user selections
    const [selectedNominations, setSelectedNominations] = useState<string[]>([]);
    const [selectedFinalVote, setSelectedFinalVote] = useState<string | null>(null);
    const [selectedNominationPairs, setSelectedNominationPairs] = useState<string[][]>([]);

    // State for results
    const [results, setResults] = useState<AwardResult[]>([]);

    const fetchPageData = useCallback(async () => {
        if (!token || !user || !awardId) return;
        try {
            setIsLoading(true);

            const awards = await api.getAwards(token);
            const currentAward = awards.find(a => a.id === awardId);
            setAward(currentAward || null);

            if (currentAward) {
                const [fetchedCandidates, userNominations, userFinalVotes] = await Promise.all([
                    currentAward.phase !== 'RESULTS' ? api.getAwardCandidates(currentAward.id, token) : Promise.resolve([]),
                    api.getUserVotes(token),
                    api.getUserFinalVotes(token)
                ]);

                setCandidates(fetchedCandidates);
                setUserNominations(userNominations);
                setUserFinalVotes(userFinalVotes);

                const currentUserNomination = userNominations.find(v => v.award_id === currentAward.id);
                if (currentUserNomination) {
                    if (currentAward.nomination_criteria?.is_duo) {
                        // Reconstruct pairs from flat list based on nomination_group_id
                        const groups: { [key: string]: string[] } = {};
                        currentUserNomination.nominations.forEach((nom: any) => {
                            if (nom.nomination_group_id) {
                                if (!groups[nom.nomination_group_id]) {
                                    groups[nom.nomination_group_id] = [];
                                }
                                groups[nom.nomination_group_id].push(nom.nominee_user_id);
                            }
                        });
                        setSelectedNominationPairs(Object.values(groups));
                        setSelectedNominations(Object.values(groups).flat());
                    } else {
                        setSelectedNominations(currentUserNomination.nominations);
                    }
                } else {
                    setSelectedNominations([]);
                }

                const currentUserFinalVote = userFinalVotes.find(v => v.award_id === currentAward.id);
                if (currentUserFinalVote) {
                    setSelectedFinalVote(currentUserFinalVote.nominee_user_id);
                } else {
                    setSelectedFinalVote(null);
                }

                if (currentAward.phase === 'RESULTS') {
                    const fetchedResults = await api.getAwardResults(currentAward.id, token);
                    setResults(fetchedResults);
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load page data.';
            showNotification(message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [awardId, token, user, showNotification]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleNominationToggle = (userId: string) => {
        if (award?.nomination_criteria?.is_duo) {
            setSelectedNominationPairs(prevPairs => {
                const lastPair = prevPairs[prevPairs.length - 1];

                if (lastPair && lastPair.length === 1) {
                    if (lastPair[0] === userId) return prevPairs; // Avoid pairing with self

                    const updatedLastPair = [...lastPair, userId];
                    const sortedNewPair = [...updatedLastPair].sort();

                    const pairExists = prevPairs.slice(0, -1).some(p => {
                        if (p.length !== 2) return false;
                        const sortedExisting = [...p].sort();
                        return sortedExisting[0] === sortedNewPair[0] && sortedExisting[1] === sortedNewPair[1];
                    });

                    if (pairExists) {
                        showNotification('This exact pair has already been selected.', 'info');
                        return prevPairs;
                    }

                    return [...prevPairs.slice(0, -1), updatedLastPair];
                }

                if (prevPairs.length < award.max_nominations) {
                    return [...prevPairs, [userId]];
                }

                showNotification(`You have already selected ${award.max_nominations} pairs. To change a nomination, please remove a pair first.`, 'info');
                return prevPairs;
            });
        } else {
            setSelectedNominations(prev => {
                const isSelected = prev.includes(userId);
                if (isSelected) {
                    return prev.filter(id => id !== userId);
                }
                if (award && prev.length < award.max_nominations) {
                    return [...prev, userId];
                }
                if (award) {
                    showNotification(`You can only select up to ${award.max_nominations} nominees.`, 'info');
                }
                return prev;
            });
        }
    };

    const handleRemovePair = (pairIndex: number) => {
        setSelectedNominationPairs(prevPairs => prevPairs.filter((_, index) => index !== pairIndex));
    };

    useEffect(() => {
        if (award?.nomination_criteria?.is_duo) {
            setSelectedNominations(selectedNominationPairs.flat());
        }
    }, [selectedNominationPairs, award]);

    const handleFinalVoteSelect = (userId: string) => {
        setSelectedFinalVote(userId);
    };

    const handleSubmit = async () => {
        if (!token || !award) return;
        setIsSubmitting(true);

        try {
            if (award.phase === 'NOMINATION') {
                if (award.nomination_criteria?.is_duo) {
                    if (selectedNominationPairs.some(pair => pair.length !== 2)) {
                        showNotification('You must select nominees in pairs.', 'error');
                        return;
                    }
                    if (selectedNominationPairs.length !== award.max_nominations) {
                        showNotification(`You must select exactly ${award.max_nominations} pairs of nominees.`, 'error');
                        return;
                    }
                    await api.submitNominations(award.id, selectedNominationPairs, token);
                } else {
                    if (selectedNominations.length !== award.max_nominations) {
                        showNotification(`You must select exactly ${award.max_nominations} nominees.`, 'error');
                        return;
                    }
                    await api.submitNominations(award.id, selectedNominations, token);
                }
                showNotification('Your nominations have been submitted successfully!', 'success');
                navigate('/');
            } else if (award.phase === 'FINAL_VOTING' && selectedFinalVote) {
                await api.submitFinalVote(award.id, selectedFinalVote, token);
                showNotification('Your vote has been cast successfully!', 'success');
                navigate('/');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Submission failed.';
            showNotification(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderNominationView = () => {
        if (!award) return null;
        const currentUserNomination = userNominations.find(v => v.award_id === award.id);
        const hasVoted = !!currentUserNomination;

        if (award.nomination_criteria?.is_duo) {
            return (
                <div>
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-white">Pares Seleccionados ({selectedNominationPairs.length}/{award.max_nominations})</h3>
                        {selectedNominationPairs.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                {selectedNominationPairs.map((pair, index) => {
                                    const firstNominee = candidates.find(c => c.id === pair[0]);
                                    const secondNominee = pair.length > 1 ? candidates.find(c => c.id === pair[1]) : null;

                                    return (
                                        <div key={index} className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                                            <div className="flex items-center space-x-3">
                                                {firstNominee && (
                                                    <div className="flex items-center space-x-2">
                                                        {/* <img src={firstNominee.avatar_url || `https://picsum.photos/seed/${firstNominee.id}/40`} alt={firstNominee.full_name} className="h-10 w-10 rounded-full" /> */}
                                                        <span className="text-white font-medium">{firstNominee.full_name}</span>
                                                    </div>
                                                )}
                                                <span className="text-gray-400">+</span>
                                                {secondNominee ? (
                                                    <div className="flex items-center space-x-2">
                                                        {/* <img src={secondNominee.avatar_url || `https://picsum.photos/seed/${secondNominee.id}/40`} alt={secondNominee.full_name} className="h-10 w-10 rounded-full" /> */}
                                                        <span className="text-white font-medium">{secondNominee.full_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Selecciona otro nominado</span>
                                                )}
                                            </div>
                                            <button onClick={() => handleRemovePair(index)} className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400 mt-2">Selecciona dos nominados para formar un par.</p>
                        )}
                    </div>

                    <p className="text-gray-300 mb-2">Selecciona los nominados para el siguiente par.</p>
                    <div className="space-y-4 mt-6">
                        {candidates.map(candidate => {
                            const isSelf = candidate.id === user?.id;
                            const isPartner = candidate.id === user?.partner_id;
                            const lastPair = selectedNominationPairs[selectedNominationPairs.length - 1];
                            const isIncompletePairWithThisCandidate = lastPair && lastPair.length === 1 && lastPair[0] === candidate.id;
                            const maxPairsReached = selectedNominationPairs.length === award.max_nominations && (!lastPair || lastPair.length === 2);

                            const isDisabled = isSelf || isPartner || hasVoted || maxPairsReached || isIncompletePairWithThisCandidate;
                            let disabledReason = '';
                            if (isSelf) disabledReason = "No puedes votar por ti mismo.";
                            else if (isPartner) disabledReason = "No puedes votar por tu pareja.";
                            else if (hasVoted) disabledReason = "Ya has enviado tus nominaciones.";
                            else if (maxPairsReached) disabledReason = `Ya has seleccionado el máximo de ${award.max_nominations} pares.`;
                            else if (isIncompletePairWithThisCandidate) disabledReason = "Selecciona un nominado diferente para completar el par.";

                            return (
                                <UserSelectionCard
                                    key={candidate.id}
                                    user={candidate}
                                    isSelected={selectedNominations.includes(candidate.id)}
                                    isDisabled={isDisabled}
                                    onToggle={handleNominationToggle}
                                    selectionType="button"
                                    disabledReason={disabledReason}
                                />
                            );
                        })}
                    </div>
                    {!hasVoted && (
                        <Button
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                            disabled={
                                award.nomination_criteria?.is_duo
                                    ? selectedNominationPairs.length !== award.max_nominations || selectedNominationPairs.some(p => p.length !== 2)
                                    : selectedNominations.length !== award.max_nominations
                            }
                            className="mt-8 w-full sm:w-auto"
                        >
                            Enviar Nominaciones
                        </Button>
                    )}
                </div>
            );
        }

        // Fallback for non-duo awards
        return (
            <div>
                <p className="text-gray-300 mb-2">Selecciona hasta {award.max_nominations} nominados.</p>
                <p className="text-gray-400 text-sm mb-6">Has seleccionado {selectedNominations.length} / {award.max_nominations}.</p>
                <div className="space-y-4">
                    {candidates.map(candidate => {
                        const isSelf = candidate.id === user?.id;
                        const isPartner = candidate.id === user?.partner_id;
                        const isDisabled = isSelf || isPartner || (award && selectedNominations.length >= award.max_nominations && !selectedNominations.includes(candidate.id)) || hasVoted;
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
                        disabled={selectedNominations.length !== award.max_nominations}
                        className="mt-8 w-full sm:w-auto"
                    >
                        Enviar Nominaciones
                    </Button>
                )}
            </div>
        );
    };

    const renderFinalVotingView = () => {
        const currentUserFinalVote = userFinalVotes.find(v => v.award_id === award?.id);
        const hasVoted = !!currentUserFinalVote;
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
        if (isLoading || !award) return <Spinner />;

        const currentUserNomination = userNominations.find(v => v.award_id === award.id);
        const currentUserFinalVote = userFinalVotes.find(v => v.award_id === award.id);
        const hasVoted = (award.phase === 'NOMINATION' && !!currentUserNomination) || (award.phase === 'FINAL_VOTING' && !!currentUserFinalVote);

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

    if (isLoading) {
        return <Spinner />;
    }

    if (!award) {
        return <p className="text-red-500">Award not found.</p>;
    }

    return (
        <div>
            <Link to="/" className="flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Volver a Premiaciones
            </Link>
            <div className="bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold text-white mb-2">{award.name}</h2>
                <p className="text-gray-400 mb-8">{award.description}</p>
                {renderContent()}
            </div>
        </div>
    );
};

export default VotingPage;
