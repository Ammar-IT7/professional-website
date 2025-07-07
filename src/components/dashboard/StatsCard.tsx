import React from 'react';

interface StatsCardProps {
    title: string;
    value: number;
    icon: string;
    color: 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'purple' | 'indigo';
    trend?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
    percentage?: number;
    onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend, 
    subtitle,
    percentage,
    onClick
}) => {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            text: 'text-blue-900',
            value: 'text-blue-700',
            trend: 'text-blue-600'
        },
        green: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            text: 'text-green-900',
            value: 'text-green-700',
            trend: 'text-green-600'
        },
        red: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            text: 'text-red-900',
            value: 'text-red-700',
            trend: 'text-red-600'
        },
        orange: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            text: 'text-orange-900',
            value: 'text-orange-700',
            trend: 'text-orange-600'
        },
        yellow: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            text: 'text-yellow-900',
            value: 'text-yellow-700',
            trend: 'text-yellow-600'
        },
        purple: {
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            text: 'text-purple-900',
            value: 'text-purple-700',
            trend: 'text-purple-600'
        },
        indigo: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            text: 'text-indigo-900',
            value: 'text-indigo-700',
            trend: 'text-indigo-600'
        }
    };

    const classes = colorClasses[color];

    return (
        <div
            className={`stats-card ${classes.bg} ${classes.border} border rounded-xl p-6 transition-all duration-200 hover-shadow-lg hover-scale-105${onClick ? ' cursor-pointer' : ''}`}
            onClick={onClick}
            tabIndex={onClick ? 0 : undefined}
            role={onClick ? 'button' : undefined}
            aria-pressed={onClick ? 'false' : undefined}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`stats-icon ${classes.iconBg} ${classes.iconColor} w-12 h-12 rounded-lg flex items-center justify-center text-xl`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${classes.trend}`}>
                        <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                            {trend.isPositive ? '↗' : '↘'}
                        </span>
                        <span>{trend.value}%</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                    <span className={`stats-value ${classes.value} text-3xl font-bold`}>
                        {value.toLocaleString()}
                    </span>
                    {percentage && (
                        <span className={`text-sm font-medium ${classes.value} opacity-75`}>
                            ({percentage}%)
                        </span>
                    )}
                </div>
                
                <h3 className={`stats-title ${classes.text} text-lg font-semibold leading-tight`}>
                    {title}
                </h3>
                
                {subtitle && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Decorative element */}
            <div className={`absolute top-0 right-0 w-20 h-20 opacity-10 ${classes.iconColor}`}>
                <div className="w-full h-full flex items-center justify-center text-4xl">
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default StatsCard; 