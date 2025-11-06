import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AwardsPage from './pages/AwardsPage';
import VotingPage from './pages/VotingPage';
import AdminPage from './pages/AdminPage';
import ResultsPage from './pages/ResultsPage';
import Header from './components/Header';
import Spinner from './components/Spinner';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return <Spinner />;
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    if (isLoading) {
        return <Spinner />;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return isAdmin ? children : <div className="text-center text-xl mt-10">No tienes permiso para ver esta pagina</div>;
};

const RedirectAuthenticatedUser: React.FC = () => {
    const { isAdmin } = useAuth();
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
};

const AppRouter: React.FC = () => {
    const { isAuthenticated, isAdmin } = useAuth();

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
            {isAuthenticated && <Header isAdmin={isAdmin} />}
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <Routes>
                    <Route path="/login" element={isAuthenticated ? <RedirectAuthenticatedUser /> : <LoginPage />} />
                    <Route path="/" element={<PrivateRoute><AwardsPage /></PrivateRoute>} />
                    <Route path="/voting/:awardId" element={<PrivateRoute><VotingPage /></PrivateRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                    <Route path="/results/:awardId" element={<AdminRoute><ResultsPage /></AdminRoute>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
};

export default AppRouter;