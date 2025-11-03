import React from 'react';

const Spinner: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-8">
            <div className="w-12 h-12 border-4 border-t-4 border-gray-600 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );
};

export default Spinner;
