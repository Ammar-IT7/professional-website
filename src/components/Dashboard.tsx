import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useHistory, Link, useLocation } from 'react-router-dom';
import { calculateDashboardStats, filterDataByStatus, getDuplicateClientsWithDetails, exportFilteredData } from '../utils/excelParser';
import { ProcessedClient, DashboardStats, FilterOptions } from '../types';
import StatsCard from './dashboard/StatsCard';
import DataTable from './dashboard/DataTable';
import FilterPanel from './dashboard/FilterPanel';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import Modal from './common/Modal';

// Add a hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 700);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// Add HamburgerMenu component inside this file for simplicity
const navLinks = [
  { label: 'لوحة التحكم', to: '/dashboard' },
  { label: 'رفع ملف', to: '/upload' },
  { label: 'تصدير البيانات', to: '/export' },
  { label: 'الإعدادات', to: '/settings' },
];

function HamburgerMenu() {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const history = useHistory();
  // Auto-close on route change
  React.useEffect(() => { setOpen(false); }, [location.pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  if (!isMobile) return null;
  return (
    <>
      <div aria-live="polite" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>{open ? 'القائمة مفتوحة' : 'القائمة مغلقة'}</div>
      <button
        aria-label="فتح القائمة"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 11000,
          width: 44,
          height: 44,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'background 0.15s',
        }}
        onTouchStart={e => e.currentTarget.style.background = '#f3f4f6'}
        onTouchEnd={e => e.currentTarget.style.background = 'white'}
        onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
        onBlur={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
      >
        <span style={{ display: 'block', width: 24, height: 24 }}>
          <svg width="24" height="24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
        </span>
      </button>
      {open && (
        <>
          <div
            role="presentation"
            tabIndex={-1}
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 10999,
            }}
          />
          <nav
            role="navigation"
            aria-label="القائمة الجانبية"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: 260,
              height: '100vh',
              background: 'white',
              boxShadow: '2px 0 16px rgba(0,0,0,0.08)',
              zIndex: 11001,
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem 1.5rem 1.5rem 1.5rem',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
              transform: open ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <button
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
              style={{
                alignSelf: 'flex-end',
                background: 'none',
                border: 'none',
                fontSize: 28,
                color: '#6b7280',
                cursor: 'pointer',
                marginBottom: 24,
                minWidth: 44,
                minHeight: 44,
                outline: 'none',
                transition: 'background 0.15s',
              }}
              onTouchStart={e => e.currentTarget.style.background = '#f3f4f6'}
              onTouchEnd={e => e.currentTarget.style.background = 'none'}
              onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
              onBlur={e => e.currentTarget.style.boxShadow = 'none'}
            >×</button>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
              {navLinks.map(link => (
                <li key={link.label} style={{ marginBottom: 20 }}>
                  <Link
                    to={link.to}
                    style={{
                      color: location.pathname === link.to ? '#2563eb' : '#374151',
                      textDecoration: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      display: 'block',
                      padding: '0.5rem 0',
                      borderRadius: 6,
                      background: location.pathname === link.to ? '#e0e7ff' : 'transparent',
                      transition: 'background 0.15s',
                      minHeight: 44,
                      minWidth: 44,
                      outline: 'none',
                    }}
                    onClick={() => setOpen(false)}
                    onTouchStart={e => e.currentTarget.style.background = '#f3f4f6'}
                    onTouchEnd={e => e.currentTarget.style.background = location.pathname === link.to ? '#e0e7ff' : 'transparent'}
                    onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
                    onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}

function FloatingActionButton() {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const history = useHistory();
  const location = useLocation();
  // Auto-close on route change
  React.useEffect(() => { setOpen(false); }, [location.pathname]);
  if (!isMobile) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 12000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div aria-live="polite" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>{open ? 'قائمة الإجراءات السريعة مفتوحة' : 'قائمة الإجراءات السريعة مغلقة'}</div>
      {open && (
        <div style={{
          marginBottom: 12,
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          padding: '0.5rem 0',
          minWidth: 160,
          pointerEvents: 'auto',
          transition: 'opacity 0.2s',
        }}>
          <button
            onClick={() => { setOpen(false); history.push('/upload'); }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '0.75rem 1.5rem',
              textAlign: 'right',
              fontSize: '1rem',
              color: '#2563eb',
              cursor: 'pointer',
              borderBottom: '1px solid #e5e7eb',
              minHeight: 44,
              minWidth: 44,
              outline: 'none',
              transition: 'background 0.15s',
            }}
            onTouchStart={e => e.currentTarget.style.background = '#f3f4f6'}
            onTouchEnd={e => e.currentTarget.style.background = 'none'}
            onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
          >📤 رفع ملف</button>
          <button
            onClick={() => { setOpen(false); history.push('/export'); }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '0.75rem 1.5rem',
              textAlign: 'right',
              fontSize: '1rem',
              color: '#059669',
              cursor: 'pointer',
              minHeight: 44,
              minWidth: 44,
              outline: 'none',
              transition: 'background 0.15s',
            }}
            onTouchStart={e => e.currentTarget.style.background = '#f3f4f6'}
            onTouchEnd={e => e.currentTarget.style.background = 'none'}
            onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
          >📦 تصدير البيانات</button>
        </div>
      )}
      <button
        aria-label={open ? 'إغلاق الإجراءات السريعة' : 'فتح الإجراءات السريعة'}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          fontSize: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'background 0.2s',
          minHeight: 56,
          minWidth: 56,
          outline: 'none',
        }}
        onTouchStart={e => e.currentTarget.style.background = '#1d4ed8'}
        onTouchEnd={e => e.currentTarget.style.background = '#2563eb'}
        onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
        onBlur={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {open ? '×' : '+'}
      </button>
    </div>
  );
}

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
    const isMobile = useIsMobile();

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
            {isMobile && <HamburgerMenu />}
            {isMobile && <FloatingActionButton />}
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
                    <div
                        className="stats-grid-enhanced"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1.5rem',
                            margin: '1.5rem 0',
                            width: '100%',
                            alignItems: 'stretch',
                            justifyItems: 'stretch',
                            padding: '0.5rem 0',
                        }}
                    >
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
                focusTrap={true}
                escToClose={true}
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
                            
                            {isMobile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {modalData.slice(0, 20).map((client, index) => (
                                        <div key={index} style={{
                                            background: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '0.75rem',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                            fontSize: '1rem',
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: '#374151', fontSize: '1.1rem' }}>{client.clientName || 'غير محدد'}</div>
                                            <div style={{ color: '#6b7280' }}>{client.product || 'غير محدد'}</div>
                                            <div>
                                                <div style={{ color: '#374151' }}>{client.expiryDate ? new Date(client.expiryDate).toLocaleDateString('ar-SA') : 'غير محدد'}</div>
                                                <div style={{ fontSize: '0.9em', color: '#6b7280', marginTop: '2px' }}>{client.expiryDate ? new Date(client.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                                            </div>
                                            <div style={{ color: '#059669', fontWeight: 'bold' }}>التفعيلات: {client.activations || 0}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="modal-table-wrapper">
                                    <table className="modal-table" style={{ 
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
                            )}
                            
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

<style>{`
  .stats-grid-enhanced {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin: 1.5rem 0;
    width: 100%;
    align-items: stretch;
    justify-items: stretch;
    padding: 0.5rem 0;
  }
  @media (max-width: 1200px) {
    .stats-grid-enhanced {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 700px) {
    .stats-grid-enhanced {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 0.25rem 0;
    }
    .card-body, .card-header {
      padding: 0.75rem !important;
    }
    .btn, button {
      min-height: 44px;
      min-width: 44px;
      font-size: 1rem;
    }
  }
  .stats-card:focus, .stats-card:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 1.5px 6px rgba(0,0,0,0.08);
    transform: scale(1.03);
    outline: 2px solid #2563eb;
    outline-offset: 2px;
    z-index: 2;
  }
  .stats-card:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  }
  .modal-fade-in {
    animation: modalFadeIn 0.3s cubic-bezier(.4,0,.2,1);
  }
  @keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.96) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-table thead th {
    position: sticky;
    top: 0;
    background: #f9fafb;
    z-index: 1;
  }
  .modal-table tbody tr:nth-child(even) {
    background: #f3f4f6;
  }
  .modal-table tbody tr:nth-child(odd) {
    background: #fff;
  }
  .modal-table-wrapper {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .modal-table {
    min-width: 500px;
  }
`}</style>