import React, { useState, useMemo } from 'react';
import { FilterOptions } from '../../types';

interface FilterPanelProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    totalResults: number;
    availableProducts: string[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    searchTerm,
    onSearchChange,
    filters,
    onFiltersChange,
    totalResults,
    availableProducts
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'custom'>('basic');

    const updateFilter = (updates: Partial<FilterOptions>) => {
        onFiltersChange({ ...filters, ...updates });
    };

    const resetFilters = () => {
        onFiltersChange({
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
    };

    const hasActiveFilters = useMemo(() => {
        return (
            !filters.showActive || !filters.showExpired || !filters.showExpiringSoon ||
            !filters.showDuplicateClients || !filters.showHighValueClients || !filters.showLowActivityClients ||
            filters.dateRange.start || filters.dateRange.end ||
            filters.selectedProducts.length > 0 ||
            filters.minActivations > 0 || filters.maxActivations < 999999 ||
            filters.minDevices > 0 || filters.maxDevices < 999999 ||
            filters.expiringInDays !== null ||
            filters.clientNamePattern || filters.licenseKeyPattern
        );
    }, [filters]);

    return (
        <div className="card">
            <div 
                className="card-header cursor-pointer transition-colors hover-bg-gray-100" 
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">🔍</span>
                        <h3 className="text-lg font-semibold text-gray-900">البحث والتصفية المتقدمة</h3>
                        <span className="status-badge bg-blue-100 text-blue-700">
                            {totalResults} نتيجة
                        </span>
                        {hasActiveFilters && (
                            <span className="status-badge bg-orange-100 text-orange-700">
                                تصفية نشطة
                            </span>
                        )}
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
            {!isCollapsed && (
                <div className="card-body space-y-6">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                            {[
                                { id: 'basic', label: 'البحث الأساسي', icon: '🔍' },
                                { id: 'advanced', label: 'التصفية المتقدمة', icon: '⚙️' },
                                { id: 'custom', label: 'تصفية مخصصة', icon: '🎯' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover-text-gray-700 hover-border-gray-300'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Basic Search Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">🔍 البحث العام</label>
                                <input
                                    type="text"
                                    placeholder="البحث في اسم العميل، المنتج، أو مفتاح الترخيص..."
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div>
                                <label className="form-label">📊 حالة الترخيص</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showActive}
                                            onChange={(e) => updateFilter({ showActive: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">✅ التراخيص النشطة</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showExpired}
                                            onChange={(e) => updateFilter({ showExpired: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">❌ التراخيص المنتهية</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showExpiringSoon}
                                            onChange={(e) => updateFilter({ showExpiringSoon: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">⚠️ ستنتهي قريباً</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Filters Tab */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6">
                            {/* Product Filter */}
                            <div>
                                <label className="form-label">📦 المنتجات</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                    {availableProducts.map((product) => (
                                        <label key={product} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filters.selectedProducts.includes(product)}
                                                onChange={(e) => {
                                                    const newProducts = e.target.checked
                                                        ? [...filters.selectedProducts, product]
                                                        : filters.selectedProducts.filter(p => p !== product);
                                                    updateFilter({ selectedProducts: newProducts });
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{product}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">📅 تاريخ الانتهاء من</label>
                                    <input
                                        type="date"
                                        value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                                        onChange={(e) => updateFilter({
                                            dateRange: {
                                                ...filters.dateRange,
                                                start: e.target.value ? new Date(e.target.value) : null
                                            }
                                        })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📅 تاريخ الانتهاء إلى</label>
                                    <input
                                        type="date"
                                        value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                                        onChange={(e) => updateFilter({
                                            dateRange: {
                                                ...filters.dateRange,
                                                end: e.target.value ? new Date(e.target.value) : null
                                            }
                                        })}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Activation Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">🔄 الحد الأدنى للتفعيلات</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.minActivations}
                                        onChange={(e) => updateFilter({ minActivations: parseInt(e.target.value) || 0 })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">🔄 الحد الأقصى للتفعيلات</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.maxActivations}
                                        onChange={(e) => updateFilter({ maxActivations: parseInt(e.target.value) || 999999 })}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Device Count Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">💻 الحد الأدنى للأجهزة</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.minDevices}
                                        onChange={(e) => updateFilter({ minDevices: parseInt(e.target.value) || 0 })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">💻 الحد الأقصى للأجهزة</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={filters.maxDevices}
                                        onChange={(e) => updateFilter({ maxDevices: parseInt(e.target.value) || 999999 })}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Custom Filters Tab */}
                    {activeTab === 'custom' && (
                        <div className="space-y-6">
                            {/* Expiry Urgency */}
                            <div className="form-group">
                                <label className="form-label">⏰ تنتهي خلال (أيام)</label>
                                <select
                                    value={filters.expiringInDays || ''}
                                    onChange={(e) => updateFilter({ 
                                        expiringInDays: e.target.value ? parseInt(e.target.value) : null 
                                    })}
                                    className="form-input"
                                >
                                    <option value="">جميع التراخيص</option>
                                    <option value="7">خلال 7 أيام</option>
                                    <option value="14">خلال 14 يوم</option>
                                    <option value="30">خلال 30 يوم</option>
                                    <option value="60">خلال 60 يوم</option>
                                    <option value="90">خلال 90 يوم</option>
                                </select>
                            </div>

                            {/* Client Type Filters */}
                            <div>
                                <label className="form-label">👥 نوع العميل</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showDuplicateClients}
                                            onChange={(e) => updateFilter({ showDuplicateClients: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">🔄 العملاء المكررين</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showHighValueClients}
                                            onChange={(e) => updateFilter({ showHighValueClients: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">💎 العملاء عالي القيمة</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.showLowActivityClients}
                                            onChange={(e) => updateFilter({ showLowActivityClients: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus-ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">📉 العملاء منخفض النشاط</span>
                                    </label>
                                </div>
                            </div>

                            {/* Pattern Matching */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">🔤 نمط اسم العميل</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: شركة* أو *تقنية"
                                        value={filters.clientNamePattern}
                                        onChange={(e) => updateFilter({ clientNamePattern: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">🔑 نمط مفتاح الترخيص</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: PROD* أو *2024"
                                        value={filters.licenseKeyPattern}
                                        onChange={(e) => updateFilter({ licenseKeyPattern: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                عرض <span className="font-semibold">{totalResults}</span> نتيجة
                            </span>
                            {hasActiveFilters && (
                                <span className="text-sm text-orange-600">
                                    (مع التصفية المطبقة)
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="btn btn-outline btn-sm"
                                >
                                    إعادة تعيين
                                </button>
                            )}
                            {searchTerm && (
                                <button
                                    onClick={() => onSearchChange('')}
                                    className="btn btn-outline btn-sm"
                                >
                                    مسح البحث
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterPanel; 