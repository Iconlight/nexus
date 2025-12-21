import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            console.log('AuthContext - Signing out...');
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('AuthContext - Sign out error:', error);
                alert(`Sign out failed: ${error.message}`);
            } else {
                console.log('AuthContext - Signed out successfully');
                // Force clear local state
                setSession(null);
                setUser(null);
                // Force reload to trigger redirect
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }
            }
        } catch (error: any) {
            console.error('AuthContext - Sign out exception:', error);
            alert(`Sign out failed: ${error.message}`);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
