import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import { useNotification } from '../hooks/useNotification';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const email = `${username}@example.com`

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            showNotification(signInError.message || 'Invalid login credentials.', 'error');
        }
        // On success, the AuthContext's onAuthStateChange listener will handle navigation

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-gray-800 p-10 rounded-xl shadow-2xl">
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-auto text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3,2.05c0.86,0.23,1.66,0.67,2.37,1.29c1.6,1.33,2.33,3.53,1.95,5.66c-0.23,1.3-0.85,2.48-1.74,3.41c-0.9,0.94-2.07,1.59-3.38,1.86c-2.14,0.44-4.35-0.29-5.69-1.9c-1.33-1.61-1.63-3.8-0.78-5.74C5.03,4.72,6.96,2.83,9.22,2.15C9.88,1.96,10.59,1.94,11.3,2.05z M10,0c-0.09,0-0.18,0-0.27,0.01C4.38,0.53,0.54,4.96,0.01,10.32c-0.05,0.52-0.01,1.05,0.1,1.57c0.81,3.88,3.95,6.86,7.74,7.09c0.55,0.03,1.1-0.01,1.64-0.12c5.36-1.07,9.15-5.83,8.5-11.19C17.44,2.3,13.99,0,10,0z" clipRule="evenodd" />
                    </svg>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Brigade Awards
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="username-input" className="sr-only">Usuario</label>
                            <input
                                id="username-input"
                                name="username"
                                type="text"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Iniciar Sesión
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
