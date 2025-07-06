import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "جاري التحميل..." }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-400">
            <div className="spinner mb-4"></div>
            <p className="text-gray-600 text-lg">{message}</p>
        </div>
    );
};

export default LoadingSpinner; 