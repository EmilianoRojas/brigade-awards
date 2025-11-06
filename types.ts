export type Phase = 'NOMINATION' | 'FINAL_VOTING' | 'RESULTS' | 'CLOSED';

export interface User {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    partner_id?: string | null;
    user_group?: string;
}

export interface Award {
    id: string;
    name: string;
    description: string;
    phase: Phase;
    max_nominations: number;
    nomination_criteria?: {
        is_duo?: boolean;
    };
    created_at: string;
    active: boolean;
}

export interface AuthUser {
    id: string;
    email: string;
    partner_id?: string | null;
    user_group?: string;
    gender?: 'hombre' | 'mujer';
    is_partnered?: boolean;
}

export interface UserNomination {
    award_id: string;
    nominations: string[]; // array of user_ids
    final_vote: string | null; // user_id
    nominee_user_id: string;
}

export interface AwardResult {
    nominee_id: string;
    full_name: string;
    avatar_url: string;
    vote_count: number;
}