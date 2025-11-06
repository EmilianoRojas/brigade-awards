import React from 'react';
import { User } from '../types';

interface UserSelectionCardProps {
    user: User;
    isSelected: boolean;
    isDisabled: boolean;
    onToggle: (userId: string) => void;
    selectionType: 'checkbox' | 'radio' | 'button';
    disabledReason?: string;
}

const UserSelectionCard: React.FC<UserSelectionCardProps> = ({ user, isSelected, isDisabled, onToggle, selectionType, disabledReason }) => {
    const baseCardClasses = 'border-2 rounded-lg p-4 flex items-center space-x-4 transition-all duration-200';

    let specificCardClasses = '';
    if (isDisabled) {
        specificCardClasses = 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed';
    } else if (isSelected && selectionType !== 'button') {
        specificCardClasses = 'bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500';
    } else if (selectionType === 'button') {
        specificCardClasses = 'bg-gray-800 border-gray-700';
    } else {
        specificCardClasses = 'bg-gray-800 border-gray-700 hover:border-indigo-600';
    }

    const cardClasses = `${baseCardClasses} ${specificCardClasses}`;

    const userInfo = (
        <>
            <img
                className="h-12 w-12 rounded-full object-cover"
                src={user.avatar_url || `https://picsum.photos/seed/${user.id}/200`}
                alt={user.full_name}
            />
            <div className="flex-grow">
                <span className="font-medium text-gray-200">{user.full_name}</span>
                {isDisabled && disabledReason && selectionType === 'button' && (
                    <p className="text-sm text-gray-400">{disabledReason}</p>
                )}
            </div>
        </>
    );

    if (selectionType === 'button') {
        return (
            <div className={cardClasses} title={isDisabled ? disabledReason : ''}>
                {userInfo}
                <button
                    onClick={() => onToggle(user.id)}
                    disabled={isDisabled}
                    className="ml-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {'Agregar'}
                </button>
            </div>
        );
    }

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
