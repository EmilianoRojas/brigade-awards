import { API_BASE_URL } from '../constants';
import { Award, AwardResult, User, UserNomination } from '../types';

const apiFetch = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) { // No Content
        return null as T;
    }

    return response.json();
};

export const getAwards = async (token: string): Promise<Award[]> => {
    const awards = await apiFetch<Award[]>('/get-awards', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return awards || [];
};

// This function will get all eligible users during the nomination phase, 
// and the actual finalists during the final voting phase.
export const getAwardCandidates = async (awardId: string, token: string): Promise<User[]> => {
    const candidates = await apiFetch<User[]>(`/get-award-candidates?award_id=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return candidates || [];
};


export const getUserVotes = async (token: string): Promise<UserNomination[]> => {
    const userNominations = await apiFetch<UserNomination[]>('/get-user-nominations', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return userNominations || [];
};
export const getUserFinalVotes = async (token: string): Promise<UserNomination[]> => {
    const userFinalVotes = await apiFetch<UserNomination[]>('/get-user-final-votes', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return userFinalVotes || [];
};

export const submitNominations = (awardId: string, nomineeIds: string[], token: string): Promise<void> => {
    return apiFetch('/submit-nominations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ award_id: awardId, nominee_ids: nomineeIds }),
    });
};

export const submitFinalVote = (awardId: string, nomineeUserId: string, token: string): Promise<void> => {
    return apiFetch('/submit-final-vote', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ award_id: awardId, nominee_user_id: nomineeUserId }),
    });
};


export const getAwardResults = async (awardId: string, token: string): Promise<AwardResult[]> => {
    const results = await apiFetch<AwardResult[]>(`/get-award-results?award_id=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return results || [];
};

export const toggleAwardActive = (awardId: string, active: boolean, token: string): Promise<Award> => {
    return apiFetch('/toggle-award-active', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: awardId, active }),
    });
};

export const resetAwards = (token: string): Promise<{ message: string }> => {
    return apiFetch('/reset-awards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
};

export const getAllAwards = async (token: string): Promise<Award[]> => {
    const awards = await apiFetch<Award[]>('/get-all-awards', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return awards || [];
};

export const bulkActivateAwards = (token: string): Promise<{ message: string }> => {
    return apiFetch('/bulk-activate-awards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
};

export const bulkDeactivateAwards = (token: string): Promise<{ message: string }> => {
    return apiFetch('/bulk-deactivate-awards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
};
