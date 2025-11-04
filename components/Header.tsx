import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
    onNavigate: (page: 'awards' | 'admin') => void;
    isAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, isAdmin }) => {
    console.log('Header.tsx: isAdmin prop received:', isAdmin);
    const { logout } = useAuth();

    return (
        <header className="bg-gray-800 shadow-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <button onClick={() => onNavigate('awards')} className="flex items-center focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3,2.05c0.86,0.23,1.66,0.67,2.37,1.29c1.6,1.33,2.33,3.53,1.95,5.66c-0.23,1.3-0.85,2.48-1.74,3.41c-0.9,0.94-2.07,1.59-3.38,1.86c-2.14,0.44-4.35-0.29-5.69-1.9c-1.33-1.61-1.63-3.8-0.78-5.74C5.03,4.72,6.96,2.83,9.22,2.15C9.88,1.96,10.59,1.94,11.3,2.05z M10,0c-0.09,0-0.18,0-0.27,0.01C4.38,0.53,0.54,4.96,0.01,10.32c-0.05,0.52-0.01,1.05,0.1,1.57c0.81,3.88,3.95,6.86,7.74,7.09c0.55,0.03,1.1-0.01,1.64-0.12c5.36-1.07,9.15-5.83,8.5-11.19C17.44,2.3,13.99,0,10,0z" clipRule="evenodd" />
                            </svg>
                            <h1 className="ml-3 text-2xl font-bold text-white tracking-tight">Premios Brigade</h1>
                        </button>
                    </div>
                    <div className="flex items-center">
                        {isAdmin && (
                            <button
                                onClick={() => onNavigate('admin')}
                                className="mr-4 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-indigo-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
                            >
                                Administración
                            </button>
                        )}
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-indigo-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
