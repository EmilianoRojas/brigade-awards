import React from 'react';
import { User } from '../types';

interface UserSelectionCardProps {
    user: User;
    isSelected: boolean;
    isDisabled: boolean;
    onToggle: (userId: string) => void;
    selectionType: 'checkbox' | 'radio';
    disabledReason?: string;
}

const UserSelectionCard: React.FC<UserSelectionCardProps> = ({ user, isSelected, isDisabled, onToggle, selectionType, disabledReason }) => {
    const cardClasses = `
        border-2 rounded-lg p-4 flex items-center space-x-4 transition-all duration-200
        ${isDisabled 
            ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed' 
            : isSelected 
                ? 'bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500' 
                : 'bg-gray-800 border-gray-700 hover:border-indigo-600'
        }
    `;

    const inputClasses = `
        h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500
        ${selectionType === 'radio' ? 'rounded-full' : 'rounded'}
    `;

    return (
        <label htmlFor={`user-${user.id}`} className={cardClasses} title={isDisabled ? disabledReason : ''}>
            <input
                id={`user-${user.id}`}
                name="nominee"
                type={selectionType}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => onToggle(user.id)}
                className={inputClasses}
            />
            <img 
                className="h-12 w-12 rounded-full object-cover" 
                src={user.avatar_url || `https://picsum.photos/seed/${user.id}/200`} 
                alt={user.full_name} 
            />
            <span className="font-medium text-gray-200">{user.full_name}</span>
        </label>
    );
};

export default UserSelectionCard;
