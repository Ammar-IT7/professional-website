import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { calculateDashboardStats, filterDataByStatus, getDuplicateClientsWithDetails, exportFilteredData } from '../utils/excelParser';
import { ProcessedClient, DashboardStats, FilterOptions } from '../types';
import StatsCard from './dashboard/StatsCard';
import DataTable from './dashboard/DataTable';
import FilterPanel from './dashboard/FilterPanel';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalClients: 0,
        totalDevices: 0,
        expiringLicenses: 0,
        activeLicenses: 0,
        expiredLicenses: 0,
        duplicateClients: 0,
        highValueClients: 0,
        lowActivityClients: 0
    });
    const [clientData, setClientData] = useState<ProcessedClient[]>([]);
    const [filteredData, setFilteredData] = useState<ProcessedClient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'expiryDate' | 'clientName' | 'product'>('expiryDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filters, setFilters] = useState<FilterOptions>({
        showActive: true,
        showExpired: true,
        showExpiringSoon: true,
        showDuplicateClients: true,
        showHighValueClients: true,
        showLowActivityClients: true,
        dateRange: { start: null, end: null },
        selectedProducts: [],
        minActivations: 0,
        maxActivations: 999999,
        minDevices: 0,
        maxDevices: 999999,
        expiringInDays: null,
        clientNamePattern: '',
        licenseKeyPattern: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const history = useHistory();

    // Load data on component mount
    useEffect(() => {
        const loadData = () => {
            try {
                const storedData = localStorage.getItem('clientData');
                if (storedData) {
                    const data: ProcessedClient[] = JSON.parse(storedData);
                    setClientData(data);
                    const calculatedStats = calculateDashboardStats(data);
                    setStats(calculatedStats);
                }
            } catch (error) {
                console.error('Error parsing stored data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Get available products for filtering
    const availableProducts = useMemo(() => {
        const products = new Set<string>();
        clientData.forEach(client => {
            if (client.product) {
                products.add(client.product);
            }
        });
        return Array.from(products).sort();
    }, [clientData]);

    // Calculate additional stats for better decision making
    const additionalStats = useMemo(() => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringInWeek = filteredData.filter(client => {
            const expiryDate = new Date(client.expiryDate);
            return expiryDate <= weekFromNow && expiryDate >= now;
        }).length;

        const expiringInTwoWeeks = filteredData.filter(client => {
            const expiryDate = new Date(client.expiryDate);
            return expiryDate <= twoWeeksFromNow && expiryDate > weekFromNow;
        }).length;

        const expiringInMonth = filteredData.filter(client => {
            const expiryDate = new Date(client.expiryDate);
            return expiryDate <= monthFromNow && expiryDate > twoWeeksFromNow;
        }).length;

        // Calculate high value clients (more than 5 activations or 3 devices)
        const highValueClients = filteredData.filter(client => 
            (client.activations || 0) > 5 || (client.hardwareIds?.length || 0) > 3
        ).length;

        // Calculate low activity clients (0-1 activations)
        const lowActivityClients = filteredData.filter(client => 
            (client.activations || 0) <= 1
        ).length;

        // Calculate duplicate clients
        const clientNames = filteredData.map(client => client.clientName);
        const duplicateClients = clientNames.filter((name, index) => 
            clientNames.indexOf(name) !== index
        ).length;

        return { 
            expiringInWeek, 
            expiringInTwoWeeks, 
            expiringInMonth,
            highValueClients,
            lowActivityClients,
            duplicateClients
        };
    }, [filteredData]);

    // Filter and sort data when dependencies change
    useEffect(() => {
        let filtered = clientData;

        // Apply status filters first
        filtered = filterDataByStatus(filtered, filters);

        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(client => 
                (client.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.licenseName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.product?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.licenseKey?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        // Apply product filters
        if (filters.selectedProducts.length > 0) {
            filtered = filtered.filter(client => 
                client.product && filters.selectedProducts.includes(client.product)
            );
        }

        // Apply date range filters
        if (filters.dateRange.start) {
            filtered = filtered.filter(client => 
                new Date(client.expiryDate) >= filters.dateRange.start!
            );
        }
        if (filters.dateRange.end) {
            filtered = filtered.filter(client => 
                new Date(client.expiryDate) <= filters.dateRange.end!
            );
        }

        // Apply activation range filters
        filtered = filtered.filter(client => 
            (client.activations || 0) >= filters.minActivations &&
            (client.activations || 0) <= filters.maxActivations
        );

        // Apply device count range filters
        filtered = filtered.filter(client => 
            (client.hardwareIds?.length || 0) >= filters.minDevices &&
            (client.hardwareIds?.length || 0) <= filters.maxDevices
        );

        // Apply expiry urgency filter
        if (filters.expiringInDays !== null) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + filters.expiringInDays);
            filtered = filtered.filter(client => 
                new Date(client.expiryDate) <= targetDate && 
                new Date(client.expiryDate) >= new Date()
            );
        }

        // Apply pattern matching filters
        if (filters.clientNamePattern) {
            const pattern = filters.clientNamePattern.toLowerCase();
            filtered = filtered.filter(client => 
                client.clientName?.toLowerCase().includes(pattern.replace('*', ''))
            );
        }

        if (filters.licenseKeyPattern) {
            const pattern = filters.licenseKeyPattern.toLowerCase();
            filtered = filtered.filter(client => 
                client.licenseKey?.toLowerCase().includes(pattern.replace('*', ''))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'expiryDate':
                    comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                    break;
                case 'clientName':
                    comparison = (a.clientName || '').localeCompare(b.clientName || '');
                    break;
                case 'product':
                    comparison = (a.product || '').localeCompare(b.product || '');
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        setFilteredData(filtered);
    }, [clientData, searchTerm, sortBy, sortOrder, filters]);

    const handleUploadNew = useCallback(() => {
        history.push('/');
    }, [history]);

    const handleExportToExcel = useCallback(async () => {
        if (filteredData.length === 0) {
            alert('لا توجد بيانات للتصدير');
            return;
        }

        setIsExporting(true);
        try {
            const result = exportFilteredData(
                clientData,
                filters,
                searchTerm,
                sortBy,
                sortOrder
            );

            if (result.success) {
                alert(`تم تصدير البيانات بنجاح!\nاسم الملف: ${result.filename}`);
            } else {
                alert(`خطأ في تصدير البيانات: ${result.error}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('حدث خطأ أثناء تصدير البيانات');
        } finally {
            setIsExporting(false);
        }
    }, [filteredData.length, clientData, filters, searchTerm, sortBy, sortOrder]);

    const handleSort = useCallback((field: 'expiryDate' | 'clientName' | 'product') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    }, [sortBy, sortOrder]);

    if (isLoading) {
        return <LoadingSpinner message="جاري تحميل البيانات..." />;
    }

    if (clientData.length === 0) {
        return (
            <EmptyState
                title="لا توجد بيانات متاحة"
                description="يرجى رفع ملف Excel لعرض لوحة التحكم"
                actionText="رفع ملف Excel"
                onAction={handleUploadNew}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">لوحة إدارة التراخيص</h1>
                    <p className="text-gray-600 mt-1">
                        عرض وإدارة بيانات التراخيص والعملاء
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleUploadNew}
                        className="btn btn-primary"
                    >
                        رفع ملف جديد
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        disabled={isExporting || filteredData.length === 0}
                        className="btn btn-outline"
                    >
                        {isExporting ? (
                            <>
                                <div className="spinner"></div>
                                جاري التصدير...
                            </>
                        ) : (
                            'تصدير البيانات'
                        )}
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">📊</span>
                        <h3 className="text-lg font-semibold text-gray-900">إحصائيات سريعة</h3>
                        <span className="status-badge bg-green-100 text-green-700">
                            8 إحصائيات
                        </span>
                    </div>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatsCard
                                title="إجمالي العملاء"
                                value={stats.totalClients}
                                icon="👥"
                                color="blue"
                                subtitle="جميع العملاء المسجلين"
                                percentage={Math.round((stats.totalClients / Math.max(clientData.length, 1)) * 100)}
                            />
                            <StatsCard
                                title="إجمالي الأجهزة"
                                value={stats.totalDevices}
                                icon="💻"
                                color="green"
                                subtitle="الأجهزة المرخصة"
                            />
                            <StatsCard
                                title="التراخيص النشطة"
                                value={stats.activeLicenses}
                                icon="✅"
                                color="green"
                                subtitle="تراخيص صالحة"
                                percentage={Math.round((stats.activeLicenses / Math.max(clientData.length, 1)) * 100)}
                            />
                            <StatsCard
                                title="التراخيص المنتهية"
                                value={stats.expiredLicenses}
                                icon="❌"
                                color="red"
                                subtitle="تراخيص منتهية الصلاحية"
                                percentage={Math.round((stats.expiredLicenses / Math.max(clientData.length, 1)) * 100)}
                            />
                            <StatsCard
                                title="تنتهي خلال أسبوع"
                                value={additionalStats.expiringInWeek}
                                icon="🚨"
                                color="red"
                                subtitle="تحتاج تجديد عاجل"
                            />
                            <StatsCard
                                title="تنتهي خلال أسبوعين"
                                value={additionalStats.expiringInTwoWeeks}
                                icon="⚠️"
                                color="orange"
                                subtitle="تحتاج متابعة"
                            />
                            <StatsCard
                                title="عملاء عالي القيمة"
                                value={additionalStats.highValueClients}
                                icon="💎"
                                color="purple"
                                subtitle="أكثر من 5 تفعيلات"
                                percentage={Math.round((additionalStats.highValueClients / Math.max(clientData.length, 1)) * 100)}
                            />
                            <StatsCard
                                title="عملاء منخفض النشاط"
                                value={additionalStats.lowActivityClients}
                                icon="📉"
                                color="yellow"
                                subtitle="0-1 تفعيل"
                                percentage={Math.round((additionalStats.lowActivityClients / Math.max(clientData.length, 1)) * 100)}
                            />
                        </div>
                    </div>
            </div>

            {/* Filters and Search */}
            <FilterPanel
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filters}
                onFiltersChange={setFilters}
                totalResults={filteredData.length}
                availableProducts={availableProducts}
            />

            {/* Data Table */}
            <DataTable
                data={filteredData}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
            />
        </div>
    );
};

export default Dashboard;