import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
    title, 
    description, 
    actionText, 
    onAction 
}) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-400 text-center">
            <div className="text-gray-400 text-6xl mb-6">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-gray-600 mb-8 max-w-md">{description}</p>
            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className="btn btn-primary"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
};

export default EmptyState; 