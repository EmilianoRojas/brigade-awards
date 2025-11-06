import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppRouter from './Router';
import Snackbar from './components/Snackbar';
import { useNotification } from './hooks/useNotification';

const AppContent: React.FC = () => {
    const { notification, hideNotification } = useNotification();

    return (
        <>
            <AppRouter />
            {notification && (
                <Snackbar
                    message={notification.message}
                    type={notification.type}
                    onClose={hideNotification}
                />
            )}
        </>
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
