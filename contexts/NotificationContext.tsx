import React, { createContext, useState, useCallback, ReactNode } from 'react';

type NotificationType = 'success' | 'error';

interface NotificationState {
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    notification: NotificationState | null;
    showNotification: (message: string, type: NotificationType) => void;
    hideNotification: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notification, setNotification] = useState<NotificationState | null>(null);

    const showNotification = useCallback((message: string, type: NotificationType) => {
        setNotification({ message, type });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    const value = {
        notification,
        showNotification,
        hideNotification,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
