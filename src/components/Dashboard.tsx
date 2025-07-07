import React, { useEffect, useState, useCallback, useMemo, ReactNode, ButtonHTMLAttributes } from 'react';
import { useHistory } from 'react-router-dom';
import { calculateDashboardStats, filterDataByStatus, getDuplicateClientsWithDetails, exportFilteredData } from '../utils/excelParser';
import { ProcessedClient, DashboardStats, FilterOptions } from '../types';
import Modal from './common/Modal';
import Spinner from './common/Spinner';
import Notification from './common/Notification';
import FilterPanel from './dashboard/FilterPanel';

interface CardProps {
  children: ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}
const Card: React.FC<CardProps> = ({ children, style = {}, ...props }) => (
  <div style={{
    background: 'white',
    borderRadius: 18,
    boxShadow: '0 4px 16px 0 rgba(0,0,0,0.08), 0 1.5px 6px 0 rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    ...style
  }} {...props}>{children}</div>
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  color?: string;
  style?: React.CSSProperties;
}
const Button: React.FC<ButtonProps> = ({ children, color = '#2563eb', onClick, style = {}, ...props }) => (
  <button
    onClick={onClick}
    style={{
      background: color,
      color: 'white',
      border: 'none',
      borderRadius: 12,
      fontFamily: 'Cairo, sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      padding: '0.75rem 1.5rem',
      boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)',
      cursor: 'pointer',
      minWidth: 120,
      transition: 'background 0.15s',
      ...style
    }}
    {...props}
  >{children}</button>
);

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  onClick?: () => void;
}
const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, onClick }) => {
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;
  
  return (
    <div
      tabIndex={0}
      role="button"
      aria-pressed="false"
      onClick={onClick}
      style={{
        background: '#f8fafc',
        border: `2px solid ${color}`,
        borderRadius: isSmallMobile ? 12 : 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        padding: isSmallMobile ? '1rem' : isMobile ? '1.25rem' : '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: isSmallMobile ? '0.25rem' : '0.5rem',
        cursor: 'pointer',
        outline: 'none',
        transition: 'box-shadow 0.15s, border 0.15s, transform 0.15s',
        fontFamily: 'Cairo, sans-serif',
        marginBottom: '0.5rem',
        minHeight: isSmallMobile ? 80 : isMobile ? 100 : 120,
        // Better touch targets for mobile
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #2563eb'}
      onBlur={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
      onMouseEnter={e => {
        if (!isSmallMobile) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (!isSmallMobile) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
        }
      }}
    >
      <span style={{ 
        fontSize: isSmallMobile ? 24 : isMobile ? 28 : 32, 
        color,
        lineHeight: 1
      }}>{icon}</span>
      <span style={{ 
        fontWeight: 700, 
        fontSize: isSmallMobile ? 20 : isMobile ? 24 : 28, 
        color: '#1e293b',
        lineHeight: 1
      }}>{value}</span>
      <span style={{ 
        fontWeight: 600, 
        fontSize: isSmallMobile ? 14 : isMobile ? 16 : 18, 
        color: '#374151',
        lineHeight: 1.2,
        textAlign: 'center',
        width: '100%'
      }}>{title}</span>
    </div>
  );
};

interface StatsGridProps {
  children: ReactNode;
}
const StatsGrid: React.FC<StatsGridProps> = ({ children }) => {
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isSmallMobile ? '1fr' : isMobile ? 'repeat(auto-fit, minmax(250px, 1fr))' : 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: isSmallMobile ? '0.5rem' : isMobile ? '0.75rem' : '1rem',
      margin: isSmallMobile ? '0.5rem 0' : isMobile ? '0.75rem 0' : '1rem 0',
      width: '100%',
      alignItems: 'stretch',
      justifyItems: 'stretch',
      padding: '0.5rem 0',
    }}>{children}</div>
  );
};

// Main Dashboard
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalDevices: 0,
    expiringLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    duplicateClients: 0,
    expiringInWeek: 0,
    expiringInMonth: 0
  });
  const [clientData, setClientData] = useState<ProcessedClient[]>([]);
  const [filteredData, setFilteredData] = useState<ProcessedClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft'>('expiryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<FilterOptions>({
    showActive: true,
    showExpired: false,
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
  const [modalSortBy, setModalSortBy] = useState<'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft'>('expiryDate');
  const [modalSortOrder, setModalSortOrder] = useState<'asc' | 'desc'>('asc');
  // Fix NotificationData type for notification state
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' | 'warning'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

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
        setNotification({ message: 'خطأ في تحميل البيانات', type: 'error', isVisible: true });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter and sort data when dependencies change
  useEffect(() => {
    let filtered = clientData;
    filtered = filterDataByStatus(filtered, filters);
    if (searchTerm.trim()) {
      filtered = filtered.filter(client =>
        (client.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.licenseName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.product?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (client.licenseKey?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'clientName':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'product':
          comparison = (a.product || '').localeCompare(b.product || '');
          break;
        case 'licenseKey':
          comparison = (a.licenseKey || '').localeCompare(b.licenseKey || '');
          break;
        case 'expiryDate':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case 'activations':
          comparison = (a.activations || 0) - (b.activations || 0);
          break;
        case 'status':
          const statusA = getClientStatus(a.expiryDate);
          const statusB = getClientStatus(b.expiryDate);
          comparison = statusA.status.localeCompare(statusB.status);
          break;
        case 'daysLeft':
          const daysA = getClientStatus(a.expiryDate).daysLeft;
          const daysB = getClientStatus(b.expiryDate).daysLeft;
          comparison = (daysA ?? 0) - (daysB ?? 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredData(filtered);
  }, [clientData, searchTerm, filters, sortBy, sortOrder]);

  // Card click handler
  const getCardData = (type: string) => {
    switch (type) {
      case 'totalClients': return clientData;
      case 'totalDevices': return clientData.filter(c => c.hardwareIds && c.hardwareIds.length > 0);
      case 'activeLicenses': return clientData.filter(c => new Date(c.expiryDate) > new Date());
      case 'expiredLicenses': return clientData.filter(c => new Date(c.expiryDate) <= new Date());
      case 'expiringInWeek': return clientData.filter(c => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiryDate = new Date(c.expiryDate);
        return expiryDate > now && expiryDate <= weekFromNow;
      });
      case 'expiringInMonth': return clientData.filter(c => {
        const now = new Date();
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiryDate = new Date(c.expiryDate);
        return expiryDate > now && expiryDate <= monthFromNow;
      });
      default: return [];
    }
  };
  const handleCardClick = (type: string, title: string) => {
    setModalTitle(title);
    setModalData(getCardData(type));
    setModalOpen(true);
  };

  // Export
  const handleExportToExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      setNotification({ message: 'لا توجد بيانات للتصدير', type: 'error', isVisible: true });
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
        setNotification({ message: `تم تصدير البيانات بنجاح! اسم الملف: ${result.filename}`, type: 'success', isVisible: true });
      } else {
        setNotification({ message: `خطأ في تصدير البيانات: ${result.error}`, type: 'error', isVisible: true });
      }
    } catch (error) {
      setNotification({ message: 'حدث خطأ أثناء تصدير البيانات', type: 'error', isVisible: true });
    } finally {
      setIsExporting(false);
    }
  }, [filteredData.length, clientData, filters, searchTerm, sortBy, sortOrder]);

  // Get available products for filter
  const availableProducts = useMemo(() => {
    const products = new Set<string>();
    clientData.forEach(client => {
      if (client.product) {
        products.add(client.product);
      }
    });
    return Array.from(products).sort();
  }, [clientData]);

  // Calculate status and days left for a client
  const getClientStatus = (expiryDate: Date | string | undefined) => {
    if (!expiryDate) {
      return {
        status: 'غير محدد',
        color: '#6b7280',
        daysLeft: null,
        daysLeftText: 'غير محدد'
      };
    }
    const now = new Date();
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
      return {
        status: 'غير محدد',
        color: '#6b7280',
        daysLeft: null,
        daysLeftText: 'غير محدد'
      };
    }
    let daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let absDays = Math.abs(daysLeft);
    let years = Math.floor(absDays / 365);
    let months = Math.floor((absDays % 365) / 30);
    let days = absDays % 30;
    let parts = [];
    if (years > 0) parts.push(`${years} سنة${years > 1 ? '' : ''}`);
    if (months > 0) parts.push(`${months} شهر${months > 1 ? '' : ''}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} يوم`);
    let daysLeftText = parts.join('، ');
    if (daysLeft < 0) {
      daysLeftText = `منتهي منذ ${daysLeftText}`;
    } else {
      daysLeftText = `متبقي ${daysLeftText}`;
    }
    let status = 'نشط';
    let color = '#059669';
    if (daysLeft < 0) {
      status = 'منتهي';
      color = '#dc2626';
    } else if (daysLeft <= 30) {
      status = 'قريب من الانتهاء';
      color = '#d97706';
    }
    return { status, color, daysLeft, daysLeftText };
  };

  const handleSort = (column: 'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: 'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft') => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Sort modal data
  const sortedModalData = useMemo(() => {
    const sorted = [...modalData];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (modalSortBy) {
        case 'clientName':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'product':
          comparison = (a.product || '').localeCompare(b.product || '');
          break;
        case 'licenseKey':
          comparison = (a.licenseKey || '').localeCompare(b.licenseKey || '');
          break;
        case 'expiryDate':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case 'activations':
          comparison = (a.activations || 0) - (b.activations || 0);
          break;
        case 'status':
          const statusA = getClientStatus(a.expiryDate);
          const statusB = getClientStatus(b.expiryDate);
          comparison = statusA.status.localeCompare(statusB.status);
          break;
        case 'daysLeft':
          const daysA = getClientStatus(a.expiryDate).daysLeft;
          const daysB = getClientStatus(b.expiryDate).daysLeft;
          comparison = (daysA ?? 0) - (daysB ?? 0);
          break;
        default:
          comparison = 0;
      }
 
      return modalSortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [modalData, modalSortBy, modalSortOrder]);

  const handleModalSort = (column: 'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft') => {
    if (modalSortBy === column) {
      setModalSortOrder(modalSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setModalSortBy(column);
      setModalSortOrder('asc');
    }
  };

  const getModalSortIcon = (column: 'expiryDate' | 'clientName' | 'product' | 'licenseKey' | 'activations' | 'status' | 'daysLeft') => {
    if (modalSortBy !== column) return '↕️';
    return modalSortOrder === 'asc' ? '↑' : '↓';
  };

  // UI
  if (isLoading) return <Spinner message="جاري تحميل البيانات..." />;
  if (clientData.length === 0) return <Card><h2>لا توجد بيانات متاحة</h2></Card>;

  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '0.5rem' : '1rem',
      maxWidth: '100%',
      margin: '0 auto',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl'
    }}>
      <Notification notification={notification} onClose={() => setNotification({ ...notification, isVisible: false })} />
      <div style={{ 
        display: 'flex', 
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: window.innerWidth <= 768 ? '1rem' : '0'
      }}>
        <div>
          <h1 style={{ 
            fontSize: window.innerWidth <= 480 ? '1.5rem' : window.innerWidth <= 768 ? '1.75rem' : '2rem',
            fontWeight: 700, 
            color: '#1e293b',
            margin: 0,
            marginBottom: window.innerWidth <= 768 ? '0.5rem' : '0.25rem'
          }}>
            لوحة التحكم
          </h1>
          <p style={{ 
            color: '#6b7280', 
            margin: 0,
            fontSize: window.innerWidth <= 480 ? '0.875rem' : '1rem'
          }}>
            إدارة تراخيص العملاء والمنتجات
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap',
          justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-end'
        }}>
          <Button
            onClick={() => history.push('/upload')}
            color="#059669"
            style={{ 
              minWidth: window.innerWidth <= 480 ? '100%' : 'auto',
              fontSize: window.innerWidth <= 480 ? '0.875rem' : '1rem',
              padding: window.innerWidth <= 480 ? '0.75rem 1rem' : '0.75rem 1.5rem'
            }}
          >
            📁 رفع ملف جديد
          </Button>
          <Button
            onClick={handleExportToExcel}
            disabled={isExporting}
            color="#7c3aed"
            style={{ 
              minWidth: window.innerWidth <= 480 ? '100%' : 'auto',
              fontSize: window.innerWidth <= 480 ? '0.875rem' : '1rem',
              padding: window.innerWidth <= 480 ? '0.75rem 1rem' : '0.75rem 1.5rem'
            }}
          >
            {isExporting ? (
              <>
                <div className="spinner"></div>
                جاري التصدير...
              </>
            ) : (
              '📊 تصدير البيانات'
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {/*
      <FilterPanel
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        totalResults={filteredData.length}
        availableProducts={availableProducts}
      />
      */}

      {/* Stats Cards */}
      <StatsGrid>
        <StatsCard
          title="إجمالي العملاء"
          value={stats.totalClients}
          icon="👥"
          color="#3b82f6"
          onClick={() => handleCardClick('totalClients', 'جميع العملاء')}
        />
        <StatsCard
          title="التراخيص النشطة"
          value={stats.activeLicenses}
          icon="✅"
          color="#059669"
          onClick={() => handleCardClick('activeLicenses', 'التراخيص النشطة')}
        />
        <StatsCard
          title="التراخيص المنتهية"
          value={stats.expiredLicenses}
          icon="❌"
          color="#dc2626"
          onClick={() => handleCardClick('expiredLicenses', 'التراخيص المنتهية')}
        />
        <StatsCard
          title="تنتهي في أسبوع"
          value={stats.expiringInWeek}
          icon="⚠️"
          color="#d97706"
          onClick={() => handleCardClick('expiringInWeek', 'التراخيص التي تنتهي خلال أسبوع')}
        />
        <StatsCard
          title="تنتهي في شهر"
          value={stats.expiringInMonth}
          icon="⏰"
          color="#7c3aed"
          onClick={() => handleCardClick('expiringInMonth', 'التراخيص التي تنتهي خلال شهر')}
        />
        <StatsCard
          title="العملاء المكررون"
          value={stats.duplicateClients}
          icon="🔄"
          color="#0891b2"
          onClick={() => handleCardClick('duplicateClients', 'العملاء المكررون')}
        />
      </StatsGrid>

      {/* Data Table */}
      <Card>
        {/* Table Search and Controls */}
        <div style={{ 
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
          gap: '1rem',
          alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
          justifyContent: 'space-between'
        }}>
          {/* Table Search */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              🔍 البحث في الجدول
            </label>
            <input
              type="text"
              placeholder="البحث في اسم العميل، المنتج، مفتاح الترخيص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl',
                minHeight: 44
              }}
            />
          </div>
          
          {/* Sort Controls */}
          <div style={{ 
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'row' : 'column',
            gap: '0.5rem',
            alignItems: window.innerWidth <= 768 ? 'center' : 'stretch'
          }}>
            <label style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#374151',
              whiteSpace: 'nowrap'
            }}>
              ترتيب حسب:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl',
                minHeight: 44,
                minWidth: window.innerWidth <= 768 ? '120px' : '150px'
              }}
            >
              <option value="clientName">اسم العميل</option>
              <option value="product">المنتج</option>
              <option value="licenseKey">مفتاح الترخيص</option>
              <option value="expiryDate">تاريخ الانتهاء</option>
              <option value="status">الحالة</option>
              <option value="daysLeft">الأيام المتبقية</option>
              <option value="activations">التفعيلات</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#f9fafb',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontFamily: 'Cairo, sans-serif',
                minHeight: 44,
                minWidth: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={sortOrder === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div style={{ 
          marginBottom: '1rem',
          padding: '0.5rem 0.75rem',
          background: '#f8fafc',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#374151',
          fontFamily: 'Cairo, sans-serif'
        }}>
          عرض {filteredData.length} من {clientData.length} نتيجة
        </div>

        {/* Data Table (desktop/tablet) */}
        <div style={{ overflowX: 'auto', display: window.innerWidth < 768 ? 'none' : 'block' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Cairo, sans-serif', fontSize: 15 }}>
            <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
              <tr>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('clientName')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب اسم العميل"
                >
                  اسم العميل {getSortIcon('clientName')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('product')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب المنتج"
                >
                  المنتج {getSortIcon('product')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('licenseKey')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب مفتاح الترخيص"
                >
                  مفتاح الترخيص {getSortIcon('licenseKey')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('expiryDate')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب تاريخ الانتهاء"
                >
                  تاريخ الانتهاء {getSortIcon('expiryDate')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('status')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب حالة الترخيص"
                >
                  الحالة {getSortIcon('status')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('daysLeft')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب الأيام المتبقية"
                >
                  الأيام المتبقية {getSortIcon('daysLeft')}
                </th>
                <th 
                  style={{ 
                    padding: 12, 
                    borderBottom: '2px solid #e5e7eb', 
                    color: '#374151', 
                    fontWeight: 700,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleSort('activations')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  title="انقر للترتيب حسب عدد التفعيلات"
                >
                  التفعيلات {getSortIcon('activations')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((client, idx) => {
                const statusInfo = getClientStatus(client.expiryDate);
                return (
                  <tr key={idx} style={{ background: (client as any).problems && (client as any).problems.length > 0 ? '#fff7ed' : idx % 2 === 0 ? '#fff' : '#f8fafc', position: 'relative' }}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151', position: 'relative', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
                      {client.client || 'غير محدد'}
                      {(client as any).problems && (client as any).problems.length > 0 && (
                        <span
                          title={(client as any).problems.join('، ')}
                          style={{ marginRight: 8, color: '#d97706', cursor: 'pointer', fontSize: 18 }}
                          aria-label="مشاكل في البيانات"
                        >⚠️</span>
                      )}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{client.product || 'غير محدد'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151', fontFamily: 'monospace', direction: 'ltr' }}>{client.licenseKey || 'غير محدد'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                      {client.expiryDate ? (
                        <div>
                          <div>{new Date(client.expiryDate).toLocaleDateString('ar-SA')}</div>
                          <div style={{ fontSize: '0.8em', color: '#6b7280', marginTop: 2 }}>{new Date(client.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                      ) : 'غير محدد'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                      <span style={{
                        background: statusInfo.color,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.85em',
                        fontWeight: 600,
                        display: 'inline-block',
                        minWidth: '80px',
                        textAlign: 'center'
                      }}>
                        {statusInfo.status}
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 600 }}>
                      <span style={{ color: statusInfo.color }}>
                        {statusInfo.daysLeftText}
                      </span>
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{client.activations || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile Card View */}
        <div style={{ display: window.innerWidth < 768 ? 'block' : 'none' }}>
          {filteredData.map((client, idx) => {
            const statusInfo = getClientStatus(client.expiryDate);
            const isSmallMobile = window.innerWidth <= 480;
            
            return (
              <div key={idx} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: isSmallMobile ? 8 : 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: isSmallMobile ? '0.75rem' : '1rem',
                marginBottom: isSmallMobile ? 8 : 12,
                fontFamily: 'Cairo, sans-serif',
                // Better touch targets
                minHeight: isSmallMobile ? 120 : 140,
                touchAction: 'manipulation',
              }}>
                {/* Client Name Row */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: isSmallMobile ? 6 : 8
                }}>
                  <div style={{ 
                    fontWeight: 700, 
                    color: '#374151', 
                    fontSize: isSmallMobile ? 16 : 18, 
                    fontFamily: 'Cairo, sans-serif', 
                    direction: 'rtl',
                    flex: 1
                  }}>
                    {client.client || 'غير محدد'}
                  </div>
                  {(client as any).problems && (client as any).problems.length > 0 && (
                    <span
                      title={(client as any).problems.join('، ')}
                      style={{ 
                        color: '#d97706', 
                        fontSize: isSmallMobile ? 16 : 18,
                        marginLeft: 8
                      }}
                      aria-label="مشاكل في البيانات"
                    >⚠️</span>
                  )}
                </div>
                
                {/* Product Row */}
                <div style={{ 
                  color: '#6b7280', 
                  marginBottom: isSmallMobile ? 4 : 6,
                  fontSize: isSmallMobile ? 14 : 15
                }}>
                  {client.product || 'غير محدد'}
                </div>
                
                {/* License Key Row */}
                <div style={{ 
                  color: '#374151', 
                  fontFamily: 'monospace', 
                  direction: 'ltr', 
                  marginBottom: isSmallMobile ? 4 : 6,
                  fontSize: isSmallMobile ? 12 : 13,
                  wordBreak: 'break-all'
                }}>
                  مفتاح الترخيص: {client.licenseKey || 'غير محدد'}
                </div>
                
                {/* Expiry Date Row */}
                <div style={{ marginBottom: isSmallMobile ? 4 : 6 }}>
                  <div style={{ 
                    color: '#374151',
                    fontSize: isSmallMobile ? 14 : 15
                  }}>
                    {client.expiryDate ? new Date(client.expiryDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </div>
                  {client.expiryDate && (
                    <div style={{ 
                      fontSize: isSmallMobile ? 11 : 12, 
                      color: '#6b7280', 
                      marginTop: 2 
                    }}>
                      {new Date(client.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
                
                {/* Status and Activations Row */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: isSmallMobile ? 4 : 6
                }}>
                  <div style={{ 
                    color: '#059669', 
                    fontWeight: 700,
                    fontSize: isSmallMobile ? 13 : 14
                  }}>
                    التفعيلات: {client.activations || 0}
                  </div>
                  <span style={{
                    background: statusInfo.color,
                    color: 'white',
                    padding: isSmallMobile ? '3px 6px' : '4px 8px',
                    borderRadius: '8px',
                    fontSize: isSmallMobile ? 11 : 12,
                    fontWeight: 600,
                    display: 'inline-block',
                    minWidth: isSmallMobile ? '60px' : '70px',
                    textAlign: 'center'
                  }}>
                    {statusInfo.status}
                  </span>
                </div>
                
                {/* Days Left Row */}
                <div style={{ 
                  color: statusInfo.color, 
                  fontWeight: 600,
                  fontSize: isSmallMobile ? 13 : 14
                }}>
                  الأيام المتبقية: {statusInfo.daysLeftText}
                </div>
                
                {/* Problems Row */}
                {(client as any).problems && (client as any).problems.length > 0 && (
                  <div style={{ 
                    color: '#d97706', 
                    fontWeight: 600, 
                    marginTop: isSmallMobile ? 4 : 6, 
                    fontSize: isSmallMobile ? 12 : 13,
                    padding: isSmallMobile ? '4px 8px' : '6px 10px',
                    background: '#fff7ed',
                    borderRadius: 6,
                    border: '1px solid #fed7aa'
                  }}>
                    ⚠️ مشاكل: {(client as any).problems.join('، ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Floating Action Button for Mobile */}
      {window.innerWidth <= 768 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => history.push('/upload')}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#059669',
              color: 'white',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              transition: 'transform 0.2s, box-shadow 0.2s',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            title="رفع ملف جديد"
          >
            📁
          </button>
          <button
            onClick={handleExportToExcel}
            disabled={isExporting}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: isExporting ? '#9ca3af' : '#7c3aed',
              color: 'white',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              transition: 'transform 0.2s, box-shadow 0.2s',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              if (!isExporting) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isExporting) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }
            }}
            title={isExporting ? 'جاري التصدير...' : 'تصدير البيانات'}
          >
            {isExporting ? '⏳' : '📊'}
          </button>
        </div>
      )}

      {/* Modal for stats card details */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} focusTrap escToClose>
        <div style={{ minHeight: 200 }}>
          {modalData.length > 0 ? (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'Cairo, sans-serif',
                }}>
                  <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: '0.5rem' }}>إجمالي النتائج</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{modalData.length}</div>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', fontFamily: 'Cairo, sans-serif' }}>
                  <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('clientName')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب اسم العميل"
                      >
                        اسم العميل {getModalSortIcon('clientName')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('product')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب المنتج"
                      >
                        المنتج {getModalSortIcon('product')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('licenseKey')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب مفتاح الترخيص"
                      >
                        مفتاح الترخيص {getModalSortIcon('licenseKey')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('expiryDate')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب تاريخ الانتهاء"
                      >
                        تاريخ الانتهاء {getModalSortIcon('expiryDate')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('status')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب حالة الترخيص"
                      >
                        الحالة {getModalSortIcon('status')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('daysLeft')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب الأيام المتبقية"
                      >
                        الأيام المتبقية {getModalSortIcon('daysLeft')}
                      </th>
                      <th 
                        style={{ 
                          padding: 12, 
                          textAlign: 'right', 
                          borderBottom: '1px solid #e5e7eb', 
                          fontWeight: 'bold', 
                          color: '#374151',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => handleModalSort('activations')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        title="انقر للترتيب حسب عدد التفعيلات"
                      >
                        التفعيلات {getModalSortIcon('activations')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModalData.map((client, index) => {
                      const statusInfo = getClientStatus(client.expiryDate);
                      return (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>{client.client || 'غير محدد'}</td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{client.product || 'غير محدد'}</td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151', fontFamily: 'monospace', direction: 'ltr' }}>{client.licenseKey || 'غير محدد'}</td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                            {client.expiryDate ? (
                              <div>
                                <div>{new Date(client.expiryDate).toLocaleDateString('ar-SA')}</div>
                                <div style={{ fontSize: '0.8em', color: '#6b7280', marginTop: 2 }}>{new Date(client.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                              </div>
                            ) : 'غير محدد'}
                          </td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                            <span style={{
                              background: statusInfo.color,
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.85em',
                              fontWeight: 600,
                              display: 'inline-block',
                              minWidth: '80px',
                              textAlign: 'center'
                            }}>
                              {statusInfo.status}
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 600 }}>
                            <span style={{ color: statusInfo.color }}>
                              {statusInfo.daysLeftText}
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{client.activations || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontFamily: 'Cairo, sans-serif' }}>
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;