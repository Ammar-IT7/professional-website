export interface ExcelRecord {
    ID: string | number;
    Client: string;
    Product: string;
    'Activation Date': string | Date;
    'Expiry Date': string | Date;
    'License Key': string;
    Activations: number;
    'Hardware IDs': string;
    License: string;
}

export interface ProcessedClient {
    id: string | number;
    client: string;
    clientName: string;
    licenseName: string;
    product: string;
    licenseKey: string;
    activationDate: Date;
    expiryDate: Date;
    activations: number;
    hardwareIds: string[];
    license: string;
    status: 'active' | 'expired' | 'expiring_soon';
}

export interface DashboardStats {
    totalClients: number;
    totalDevices: number;
    expiringLicenses: number;
    activeLicenses: number;
    expiredLicenses: number;
    duplicateClients: number;
    highValueClients: number;
    lowActivityClients: number;
}

export interface NotificationData {
    message: string;
    type: 'error' | 'warning' | 'success' | 'info';
    isVisible: boolean;
}

export interface FilterOptions {
    // Status filters
    showActive: boolean;
    showExpired: boolean;
    showExpiringSoon: boolean;
    
    // Client filters
    showDuplicateClients: boolean;
    showHighValueClients: boolean;
    showLowActivityClients: boolean;
    
    // Date range filters
    dateRange: {
        start: Date | null;
        end: Date | null;
    };
    
    // Product filters
    selectedProducts: string[];
    
    // Activation filters
    minActivations: number;
    maxActivations: number;
    
    // Device count filters
    minDevices: number;
    maxDevices: number;
    
    // Expiry urgency filters
    expiringInDays: number | null; // null means no filter
    
    // Client name filters
    clientNamePattern: string;
    
    // License key filters
    licenseKeyPattern: string;
}