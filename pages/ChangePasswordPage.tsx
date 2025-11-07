import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateUserPassword } from '../services/api';
import Button from '../components/Button';
import { useNotification } from '../hooks/useNotification';

const ChangePasswordPage: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            addNotification('Passwords do not match', 'error');
            return;
        }
        if (!token) {
            addNotification('You are not logged in', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await updateUserPassword(password, token);
            addNotification('Password updated successfully', 'success');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            addNotification((error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">Change Password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">New Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
                        required
                    />
                </div>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
            </form>
        </div>
    );
};

export default ChangePasswordPage;