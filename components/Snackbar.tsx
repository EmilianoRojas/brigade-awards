import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface SnackbarProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        setIsVisible(true);

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Allow time for exit animation before unmounting
            setTimeout(onClose, 300); 
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [message, type, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    }

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-600' : 'bg-red-600';
    const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

    return (
        <div 
            role="alert"
            className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
        >
            <Icon className="h-6 w-6 mr-3" />
            <div className="flex-1 text-sm font-medium">{message}</div>
            <button onClick={handleClose} className="ml-4 -mr-1 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                <span className="sr-only">Close</span>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

export default Snackbar;
