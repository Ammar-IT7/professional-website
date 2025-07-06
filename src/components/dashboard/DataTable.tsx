import React, { useMemo, useState } from 'react';
import { ProcessedClient } from '../../types';
import { formatDate, formatDateWithHijri } from '../../utils/dateUtils';

interface DataTableProps {
    data: ProcessedClient[];
    sortBy: 'expiryDate' | 'clientName' | 'product';
    sortOrder: 'asc' | 'desc';
    onSort: (field: 'expiryDate' | 'clientName' | 'product') => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, sortBy, sortOrder, onSort }) => {
    const [expiringSectionCollapsed, setExpiringSectionCollapsed] = useState(false);
    const [mainTableCollapsed, setMainTableCollapsed] = useState(false);

    const expiringSoon = useMemo(() => {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return data.filter(client => {
            const expiryDate = new Date(client.expiryDate);
            return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
        });
    }, [data]);

    const getSortIcon = (field: 'expiryDate' | 'clientName' | 'product') => {
        if (sortBy !== field) return null;
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getDaysRemaining = (expiryDate: Date) => {
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getStatusColor = (expiryDate: Date) => {
        const daysRemaining = getDaysRemaining(expiryDate);
        if (daysRemaining <= 7) return 'status-red';
        if (daysRemaining <= 14) return 'status-orange';
        if (daysRemaining <= 30) return 'status-yellow';
        return 'status-green';
    };

    const CollapsibleHeader = ({ 
        title, 
        isCollapsed, 
        onToggle, 
        count, 
        icon, 
        bgColor = 'bg-orange-100', 
        textColor = 'text-orange-800',
        borderColor = 'border-orange-200'
    }: {
        title: string;
        isCollapsed: boolean;
        onToggle: () => void;
        count: number;
        icon: string;
        bgColor?: string;
        textColor?: string;
        borderColor?: string;
    }) => (
        <div className={`card-header ${bgColor} ${borderColor} cursor-pointer transition-colors hover-bg-gray-100`} onClick={onToggle}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <h3 className={`text-lg font-semibold ${textColor}`}>
                        {title}
                    </h3>
                    <span className={`status-badge ${textColor.replace('text-', 'bg-').replace('-800', '-100')} ${textColor}`}>
                        {count} سجل
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        {isCollapsed ? 'انقر للتوسيع' : 'انقر للطي'}
                    </span>
                    <svg 
                        className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );

    if (data.length === 0) {
        return (
            <div className="card">
                <div className="card-body text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
                    <p className="text-gray-500">جرب تغيير معايير البحث أو التصفية</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Expiring Soon Section */}
            {expiringSoon.length > 0 && (
                <div className="card border-orange-200 bg-orange-50">
                    <CollapsibleHeader
                        title="التراخيص التي ستنتهي قريباً (خلال 30 يوم)"
                        isCollapsed={expiringSectionCollapsed}
                        onToggle={() => setExpiringSectionCollapsed(!expiringSectionCollapsed)}
                        count={expiringSoon.length}
                        icon="⚠️"
                        bgColor="bg-orange-100"
                        textColor="text-orange-800"
                        borderColor="border-orange-200"
                    />
                    {!expiringSectionCollapsed && (
                        <div className="card-body p-0">
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead className="bg-orange-100">
                                        <tr>
                                            <th className="text-orange-800 font-medium">اسم العميل</th>
                                            <th className="text-orange-800 font-medium">المنتج</th>
                                            <th className="text-orange-800 font-medium">تاريخ الانتهاء</th>
                                            <th className="text-orange-800 font-medium">الأيام المتبقية</th>
                                            <th className="text-orange-800 font-medium">الأجهزة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expiringSoon.map((client, index) => {
                                            const daysRemaining = getDaysRemaining(new Date(client.expiryDate));
                                            return (
                                                <tr key={`expiring-${index}`} className="border-b border-orange-200">
                                                    <td className="font-medium">{client.clientName || 'N/A'}</td>
                                                    <td>{client.product || 'N/A'}</td>
                                                    <td>
                                                        <div className="text-sm font-medium">
                                                            {formatDate(client.expiryDate)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${getStatusColor(new Date(client.expiryDate))}`}>
                                                            {daysRemaining} يوم
                                                            {daysRemaining <= 7 && ' 🚨'}
                                                            {daysRemaining > 7 && daysRemaining <= 14 && ' ⚠️'}
                                                        </span>
                                                    </td>
                                                    <td>{client.hardwareIds?.length || 0}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Data Table */}
            <div className="card">
                <CollapsibleHeader
                    title="تفاصيل تراخيص العملاء"
                    isCollapsed={mainTableCollapsed}
                    onToggle={() => setMainTableCollapsed(!mainTableCollapsed)}
                    count={data.length}
                    icon="📋"
                    bgColor="bg-gray-50"
                    textColor="text-gray-900"
                    borderColor="border-gray-200"
                />
                {!mainTableCollapsed && (
                    <div className="card-body p-0">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th 
                                            className="cursor-pointer hover-bg-gray-100"
                                            onClick={() => onSort('clientName')}
                                        >
                                            اسم العميل {getSortIcon('clientName')}
                                        </th>
                                        <th>اسم الترخيص</th>
                                        <th 
                                            className="cursor-pointer hover-bg-gray-100"
                                            onClick={() => onSort('product')}
                                        >
                                            المنتج {getSortIcon('product')}
                                        </th>
                                        <th>تاريخ التفعيل</th>
                                        <th 
                                            className="cursor-pointer hover-bg-gray-100"
                                            onClick={() => onSort('expiryDate')}
                                        >
                                            تاريخ الانتهاء {getSortIcon('expiryDate')}
                                        </th>
                                        <th>التفعيلات</th>
                                        <th>الأجهزة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((client, index) => {
                                        const isExpiringSoon = new Date(client.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                                                              new Date(client.expiryDate) >= new Date();
                                        
                                        return (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="font-medium">{client.clientName || 'N/A'}</td>
                                                <td>{client.licenseName || 'N/A'}</td>
                                                <td>{client.product || 'N/A'}</td>
                                                <td>
                                                    <div className="text-sm">
                                                        {formatDate(client.activationDate)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={`text-sm ${isExpiringSoon ? 'font-medium text-red-600' : ''}`}>
                                                        {formatDate(client.expiryDate)}
                                                        {isExpiringSoon && <span className="ml-1">⚠️</span>}
                                                    </div>
                                                </td>
                                                <td>{client.activations || 0}</td>
                                                <td>{client.hardwareIds?.length || 0}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataTable; 