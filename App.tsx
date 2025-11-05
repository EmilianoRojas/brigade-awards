import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AwardsPage from './pages/AwardsPage';
import VotingPage from './pages/VotingPage';
import AdminPage from './pages/AdminPage';
import { Award } from './types';
import Header from './components/Header';
import { NotificationProvider } from './contexts/NotificationContext';
import Snackbar from './components/Snackbar';
import { useNotification } from './hooks/useNotification';

const AppContent: React.FC = () => {
    const { isAuthenticated, user, isLoading, isAdmin } = useAuth();
    const [selectedAward, setSelectedAward] = useState<Award | null>(null);
    const [currentPage, setCurrentPage] = useState<'awards' | 'voting' | 'admin'>('awards');
    const { notification, hideNotification } = useNotification();

    const handleSelectAward = (award: Award) => {
        setSelectedAward(award);
        setCurrentPage('voting');
    };

    const handleBackToAwards = () => {
        setSelectedAward(null);
        setCurrentPage('awards');
    };

    const navigateTo = (page: 'awards' | 'admin') => {
        setSelectedAward(null);
        setCurrentPage(page);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
            {isAuthenticated && user && <Header onNavigate={navigateTo} isAdmin={isAdmin} />}
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {!isAuthenticated || !user ? (
                    <LoginPage />
                ) : currentPage === 'voting' && selectedAward ? (
                    <VotingPage award={selectedAward} onBack={handleBackToAwards} />
                ) : currentPage === 'admin' ? (
                    <AdminPage />
                ) : (
                    <AwardsPage onSelectAward={handleSelectAward} />
                )}
            </main>
            {notification && (
                <Snackbar
                    message={notification.message}
                    type={notification.type}
                    onClose={hideNotification}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <NotificationProvider>
                <AppContent />
            </NotificationProvider>
        </AuthProvider>
    );
};

export default App;
