import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser } from '../types';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    user: AuthUser | null;
    isLoading: boolean;
    isAdmin: boolean;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const handleSession = useCallback((session: Session | null) => {
        if (session?.user) {
            setToken(session.access_token);
            // Directly use the user object from the session
            const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                ...session.user.user_metadata,
            };
            setUser(authUser);
            setIsAdmin(authUser.user_group === 'admin');
        } else {
            setToken(null);
            setUser(null);
            setIsAdmin(false);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Fetch the initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                handleSession(session);
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [handleSession]);

    const logout = useCallback(async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        // The onAuthStateChange listener will handle setting user/token to null
        setIsLoading(false);
    }, []);

    const value = {
        isAuthenticated: !!token && !!user,
        token,
        user,
        isLoading,
        isAdmin,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
