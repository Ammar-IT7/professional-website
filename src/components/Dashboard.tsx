import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { calculateDashboardStats, filterDataByStatus, getDuplicateClientsWithDetails, exportFilteredData } from '../utils/excelParser';
import { ProcessedClient, DashboardStats, FilterOptions } from '../types';
import StatsCard from './dashboard/StatsCard';
import DataTable from './dashboard/DataTable';
import FilterPanel from './dashboard/FilterPanel';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import Modal from './common/Modal';

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
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState<ProcessedClient[]>([]);

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

    // Helper to filter data for each card
    const getCardData = (type: string) => {
        switch (type) {
            case 'totalClients':
                return clientData;
            case 'totalDevices':
                return clientData.filter(c => c.hardwareIds && c.hardwareIds.length > 0);
            case 'activeLicenses':
                return clientData.filter(c => {
                    const expiry = new Date(c.expiryDate);
                    return expiry > new Date();
                });
            case 'expiredLicenses':
                return clientData.filter(c => {
                    const expiry = new Date(c.expiryDate);
                    return expiry <= new Date();
                });
            case 'expiringInWeek':
                const week = new Date();
                week.setDate(week.getDate() + 7);
                return clientData.filter(c => {
                    const expiry = new Date(c.expiryDate);
                    return expiry > new Date() && expiry <= week;
                });
            case 'expiringInTwoWeeks':
                const week2 = new Date();
                week2.setDate(week2.getDate() + 14);
                const week1 = new Date();
                week1.setDate(week1.getDate() + 7);
                return clientData.filter(c => {
                    const expiry = new Date(c.expiryDate);
                    return expiry > week1 && expiry <= week2;
                });
            case 'highValueClients':
                return clientData.filter(c => (c.activations || 0) > 5 || (c.hardwareIds?.length || 0) > 3);
            case 'lowActivityClients':
                return clientData.filter(c => (c.activations || 0) <= 1);
            default:
                return [];
        }
    };

    const handleCardClick = (type: string, title: string) => {
        console.log('Card clicked:', type, title);
        setModalTitle(title);
        setModalData(getCardData(type));
        setModalOpen(true);
    };

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
                    <div className="stats-grid">
                            <StatsCard
                                title="إجمالي العملاء"
                                value={stats.totalClients}
                                icon="👥"
                                color="blue"
                                subtitle="جميع العملاء المسجلين"
                                percentage={Math.round((stats.totalClients / Math.max(clientData.length, 1)) * 100)}
                                onClick={() => handleCardClick('totalClients', 'جميع العملاء')}
                            />
                            <StatsCard
                                title="إجمالي الأجهزة"
                                value={stats.totalDevices}
                                icon="💻"
                                color="green"
                                subtitle="الأجهزة المرخصة"
                                onClick={() => handleCardClick('totalDevices', 'الأجهزة المرخصة')}
                            />
                            <StatsCard
                                title="التراخيص النشطة"
                                value={stats.activeLicenses}
                                icon="✅"
                                color="green"
                                subtitle="تراخيص صالحة"
                                percentage={Math.round((stats.activeLicenses / Math.max(clientData.length, 1)) * 100)}
                                onClick={() => handleCardClick('activeLicenses', 'التراخيص النشطة')}
                            />
                            <StatsCard
                                title="التراخيص المنتهية"
                                value={stats.expiredLicenses}
                                icon="❌"
                                color="red"
                                subtitle="تراخيص منتهية الصلاحية"
                                percentage={Math.round((stats.expiredLicenses / Math.max(clientData.length, 1)) * 100)}
                                onClick={() => handleCardClick('expiredLicenses', 'التراخيص المنتهية')}
                            />
                            <StatsCard
                                title="تنتهي خلال أسبوع"
                                value={additionalStats.expiringInWeek}
                                icon="🚨"
                                color="red"
                                subtitle="تحتاج تجديد عاجل"
                                onClick={() => handleCardClick('expiringInWeek', 'تنتهي خلال أسبوع')}
                            />
                            <StatsCard
                                title="تنتهي خلال أسبوعين"
                                value={additionalStats.expiringInTwoWeeks}
                                icon="⚠️"
                                color="orange"
                                subtitle="تحتاج متابعة"
                                onClick={() => handleCardClick('expiringInTwoWeeks', 'تنتهي خلال أسبوعين')}
                            />
                            <StatsCard
                                title="عملاء عالي القيمة"
                                value={additionalStats.highValueClients}
                                icon="💎"
                                color="purple"
                                subtitle="أكثر من 5 تفعيلات"
                                percentage={Math.round((additionalStats.highValueClients / Math.max(clientData.length, 1)) * 100)}
                                onClick={() => handleCardClick('highValueClients', 'عملاء عالي القيمة')}
                            />
                            <StatsCard
                                title="عملاء منخفض النشاط"
                                value={additionalStats.lowActivityClients}
                                icon="📉"
                                color="yellow"
                                subtitle="0-1 تفعيل"
                                percentage={Math.round((additionalStats.lowActivityClients / Math.max(clientData.length, 1)) * 100)}
                                onClick={() => handleCardClick('lowActivityClients', 'عملاء منخفض النشاط')}
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

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
            >
                <div style={{ minHeight: '200px' }}>
                    {modalData.length > 0 ? (
                        <div>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                gap: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '0.5rem' }}>
                                        إجمالي النتائج
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                                        {modalData.length}
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ 
                                maxHeight: '400px', 
                                overflow: 'auto',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem'
                            }}>
                                <table style={{ 
                                    width: '100%', 
                                    borderCollapse: 'collapse',
                                    fontSize: '0.875rem'
                                }}>
                                    <thead style={{ 
                                        backgroundColor: '#f9fafb',
                                        position: 'sticky',
                                        top: 0
                                    }}>
                                        <tr>
                                            <th style={{ 
                                                padding: '0.75rem', 
                                                textAlign: 'right', 
                                                borderBottom: '1px solid #e5e7eb',
                                                fontWeight: 'bold',
                                                color: '#374151'
                                            }}>
                                                اسم العميل
                                            </th>
                                            <th style={{ 
                                                padding: '0.75rem', 
                                                textAlign: 'right', 
                                                borderBottom: '1px solid #e5e7eb',
                                                fontWeight: 'bold',
                                                color: '#374151'
                                            }}>
                                                المنتج
                                            </th>
                                            <th style={{ 
                                                padding: '0.75rem', 
                                                textAlign: 'right', 
                                                borderBottom: '1px solid #e5e7eb',
                                                fontWeight: 'bold',
                                                color: '#374151'
                                            }}>
                                                تاريخ الانتهاء
                                            </th>
                                            <th style={{ 
                                                padding: '0.75rem', 
                                                textAlign: 'right', 
                                                borderBottom: '1px solid #e5e7eb',
                                                fontWeight: 'bold',
                                                color: '#374151'
                                            }}>
                                                التفعيلات
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalData.slice(0, 20).map((client, index) => (
                                            <tr key={index} style={{ 
                                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                                            }}>
                                                <td style={{ 
                                                    padding: '0.75rem', 
                                                    textAlign: 'right', 
                                                    borderBottom: '1px solid #f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {client.clientName || 'غير محدد'}
                                                </td>
                                                <td style={{ 
                                                    padding: '0.75rem', 
                                                    textAlign: 'right', 
                                                    borderBottom: '1px solid #f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {client.product || 'غير محدد'}
                                                </td>
                                                <td style={{ 
                                                    padding: '0.75rem', 
                                                    textAlign: 'right', 
                                                    borderBottom: '1px solid #f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {client.expiryDate ? (
                                                        <div>
                                                            <div>{new Date(client.expiryDate).toLocaleDateString('ar-SA')}</div>
                                                            <div style={{ fontSize: '0.8em', color: '#6b7280', marginTop: '2px' }}>
                                                                {new Date(client.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    ) : 'غير محدد'}
                                                </td>
                                                <td style={{ 
                                                    padding: '0.75rem', 
                                                    textAlign: 'right', 
                                                    borderBottom: '1px solid #f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {client.activations || 0}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {modalData.length > 20 && (
                                <div style={{ 
                                    marginTop: '1rem', 
                                    padding: '0.75rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '0.5rem',
                                    textAlign: 'center',
                                    color: '#92400e'
                                }}>
                                    عرض أول 20 نتيجة من أصل {modalData.length} نتيجة
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '2rem',
                            color: '#6b7280'
                        }}>
                            لا توجد بيانات متاحة
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;