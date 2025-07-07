import * as XLSX from 'xlsx';
import { ExcelRecord, ProcessedClient, DashboardStats } from '../types';

// Helper function to parse client name and license name from client field
const parseClientAndLicense = (clientField: string): { clientName: string; licenseName: string } => {
    if (!clientField) {
        return { clientName: 'N/A', licenseName: 'N/A' };
    }

    // Split by the first dash that separates client name from license
    const dashIndex = clientField.indexOf('-');
    
    if (dashIndex === -1) {
        // No dash found, treat entire string as client name
        return { clientName: clientField.trim(), licenseName: 'N/A' };
    }

    const clientName = clientField.substring(0, dashIndex).trim();
    const licenseName = clientField.substring(dashIndex).trim(); // Include the dash

    return {
        clientName: clientName || 'N/A',
        licenseName: licenseName || 'N/A'
    };
};

// Helper function to parse dates safely
const parseDate = (dateValue: any): Date => {
    if (!dateValue) {
        return new Date();
    }
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
        return dateValue;
    }
    
    // Handle Excel date numbers (days since 1900-01-01)
    if (typeof dateValue === 'number') {
        // Excel dates are number of days since 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
        const trimmedValue = dateValue.trim();
        
        // Try different date formats
        const formats = [
            'YYYY-MM-DD',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'MM-DD-YYYY',
            'DD-MM-YYYY'
        ];
        
        for (const format of formats) {
            let parsed: Date | null = null;
            
            if (format === 'YYYY-MM-DD') {
                parsed = new Date(trimmedValue);
            } else if (format === 'MM/DD/YYYY') {
                const parts = trimmedValue.split('/');
                if (parts.length === 3) {
                    const month = parseInt(parts[0]) - 1;
                    const day = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900) {
                        parsed = new Date(year, month, day);
                    }
                }
            } else if (format === 'DD/MM/YYYY') {
                const parts = trimmedValue.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900) {
                        parsed = new Date(year, month, day);
                    }
                }
            } else if (format === 'MM-DD-YYYY') {
                const parts = trimmedValue.split('-');
                if (parts.length === 3) {
                    const month = parseInt(parts[0]) - 1;
                    const day = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900) {
                        parsed = new Date(year, month, day);
                    }
                }
            } else if (format === 'DD-MM-YYYY') {
                const parts = trimmedValue.split('-');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const year = parseInt(parts[2]);
                    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900) {
                        parsed = new Date(year, month, day);
                    }
                }
            }
            
            if (parsed && !isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }
    
    // Try standard Date parsing as fallback
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    
    // If all parsing attempts fail, log warning and return current date
    console.warn(`Could not parse date value: ${dateValue}, using current date`);
    return new Date();
};

export const parseExcelFile = (file: File): Promise<ProcessedClient[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    cellDates: true, // Parse dates automatically
                    cellNF: false,
                    cellText: false
                });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: ExcelRecord[] = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false, // Get formatted values
                    dateNF: 'yyyy-mm-dd' // Date format
                });

                console.log('Raw Excel data:', jsonData); // Debug log
                const processedData = processClientData(jsonData);
                console.log('Processed data:', processedData); // Debug log
                resolve(processedData);
            } catch (error) {
                console.error('Error parsing Excel file:', error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
};

const processClientData = (data: ExcelRecord[]): ProcessedClient[] => {
    const clientMap: { [key: string]: ProcessedClient } = {};

    // Sort data by activation date to ensure we get the latest activation
    const sortedData = [...data].sort((a, b) => {
        const dateA = parseDate(a['Activation Date']);
        const dateB = parseDate(b['Activation Date']);
        return dateB.getTime() - dateA.getTime(); // Latest first
    });

    sortedData.forEach((record) => {
        const clientName = record.Client;
        const licenseKey = record['License Key'];

        // Create a unique key for each client-license combination
        const uniqueKey = `${clientName}-${licenseKey}`;

        if (!clientMap[uniqueKey]) {
            // First occurrence (latest activation) - take the activation date as is
            const activationDate = parseDate(record['Activation Date']);
            const expiryDate = parseDate(record['Expiry Date']);
            const { clientName: extractedClientName, licenseName } = parseClientAndLicense(clientName);
            
            // Calculate status based on expiry date
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            let status: 'active' | 'expired' | 'expiring_soon';
            
            if (expiryDate <= now) {
                status = 'expired';
            } else if (expiryDate <= thirtyDaysFromNow) {
                status = 'expiring_soon';
            } else {
                status = 'active';
            }

            clientMap[uniqueKey] = {
                id: record.ID,
                client: clientName,
                clientName: extractedClientName,
                licenseName: licenseName,
                product: record.Product,
                activationDate: activationDate,
                expiryDate: expiryDate,
                licenseKey: licenseKey,
                activations: record.Activations || 0,
                hardwareIds: record['Hardware IDs'] ? record['Hardware IDs'].split(',').map(id => id.trim()) : [],
                license: record.License,
                status: status
            };
        } else {
            // Subsequent occurrence - check if this record has a newer activation date
            const currentActivation = parseDate(record['Activation Date']);
            const existingActivation = clientMap[uniqueKey].activationDate;
            
            if (currentActivation > existingActivation) {
                // This record has a newer activation date, replace the existing record
                const { clientName: extractedClientName, licenseName } = parseClientAndLicense(clientName);
                
                // Calculate status based on expiry date
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const newExpiryDate = parseDate(record['Expiry Date']);
                let status: 'active' | 'expired' | 'expiring_soon';
                
                if (newExpiryDate <= now) {
                    status = 'expired';
                } else if (newExpiryDate <= thirtyDaysFromNow) {
                    status = 'expiring_soon';
                } else {
                    status = 'active';
                }

                clientMap[uniqueKey] = {
                    id: record.ID,
                    client: clientName,
                    clientName: extractedClientName,
                    licenseName: licenseName,
                    product: record.Product,
                    activationDate: currentActivation,
                    expiryDate: newExpiryDate,
                    licenseKey: licenseKey,
                    activations: record.Activations || 0,
                    hardwareIds: record['Hardware IDs'] ? record['Hardware IDs'].split(',').map(id => id.trim()) : [],
                    license: record.License,
                    status: status
                };
            } else {
                // Keep existing record but update expiry date if this one is later
                const currentExpiry = parseDate(record['Expiry Date']);
                const existingExpiry = clientMap[uniqueKey].expiryDate;
                
                if (currentExpiry > existingExpiry) {
                    clientMap[uniqueKey].expiryDate = currentExpiry;
                }
                
                // Update activations to the maximum value
                clientMap[uniqueKey].activations = Math.max(clientMap[uniqueKey].activations, record.Activations || 0);
                
                // Merge hardware IDs
                const newHardwareIds = record['Hardware IDs'] ? record['Hardware IDs'].split(',').map(id => id.trim()) : [];
                const existingIds = clientMap[uniqueKey].hardwareIds;
                const mergedIds = [...new Set([...existingIds, ...newHardwareIds])];
                clientMap[uniqueKey].hardwareIds = mergedIds;
            }
        }
    });

    return Object.values(clientMap);
};

export const checkForDuplicateClients = (data: ProcessedClient[]): string[] => {
    const clientNames = new Set<string>();
    const duplicates = new Set<string>();
    
    data.forEach(record => {
        if (clientNames.has(record.clientName)) {
            duplicates.add(record.clientName);
        } else {
            clientNames.add(record.clientName);
        }
    });
    
    return Array.from(duplicates);
};

export const getDuplicateClientRecords = (data: ProcessedClient[]): ProcessedClient[] => {
    const clientNameCounts = new Map<string, number>();
    
    // Count occurrences of each client name
    data.forEach(record => {
        const count = clientNameCounts.get(record.clientName) || 0;
        clientNameCounts.set(record.clientName, count + 1);
    });
    
    // Return records that have duplicate client names
    return data.filter(record => (clientNameCounts.get(record.clientName) || 0) > 1);
};

// New function to get duplicate clients with their activation dates for comparison
export const getDuplicateClientsWithDetails = (data: ProcessedClient[]): Array<{
    clientName: string;
    records: ProcessedClient[];
    latestActivation: Date;
    oldestActivation: Date;
}> => {
    const clientGroups = new Map<string, ProcessedClient[]>();
    
    // Group records by client name
    data.forEach(record => {
        if (!clientGroups.has(record.clientName)) {
            clientGroups.set(record.clientName, []);
        }
        clientGroups.get(record.clientName)!.push(record);
    });
    
    // Filter only clients with multiple records and add details
    const duplicates = Array.from(clientGroups.entries())
        .filter(([_, records]) => records.length > 1)
        .map(([clientName, records]) => {
            const activationDates = records.map(r => new Date(r.activationDate));
            const latestActivation = new Date(Math.max(...activationDates.map(d => d.getTime())));
            const oldestActivation = new Date(Math.min(...activationDates.map(d => d.getTime())));
            
            return {
                clientName,
                records,
                latestActivation,
                oldestActivation
            };
        });
    
    return duplicates;
};

export const calculateDashboardStats = (data: ProcessedClient[]): DashboardStats => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const totalClients = data.length;
    const totalDevices = data.reduce((sum, client) => sum + (client.hardwareIds?.length || 0), 0);
    
    const activeLicenses = data.filter(client => {
        const expiryDate = new Date(client.expiryDate);
        return expiryDate > now;
    }).length;
    
    const expiredLicenses = data.filter(client => {
        const expiryDate = new Date(client.expiryDate);
        return expiryDate <= now;
    }).length;
    
    const expiringLicenses = data.filter(client => {
        const expiryDate = new Date(client.expiryDate);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
    }).length;

    // Calculate duplicate clients
    const clientNames = data.map(client => client.clientName);
    const duplicateClients = clientNames.filter((name, index) => 
        clientNames.indexOf(name) !== index
    ).length;

    // Calculate licenses expiring in a week
    const expiringInWeek = data.filter(client => {
        const expiryDate = new Date(client.expiryDate);
        return expiryDate > now && expiryDate <= weekFromNow;
    }).length;

    // Calculate licenses expiring in a month
    const expiringInMonth = data.filter(client => {
        const expiryDate = new Date(client.expiryDate);
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    }).length;

    return {
        totalClients,
        totalDevices,
        expiringLicenses,
        activeLicenses,
        expiredLicenses,
        duplicateClients,
        expiringInWeek,
        expiringInMonth
    };
};

export const filterDataByStatus = (data: ProcessedClient[], filters: {
    showActive: boolean;
    showExpired: boolean;
    showExpiringSoon: boolean;
    showDuplicateClients: boolean;
    showHighValueClients: boolean;
    showLowActivityClients: boolean;
}): ProcessedClient[] => {
    let filtered = data;

    // Filter by license status
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    filtered = filtered.filter(record => {
        const expiryDate = new Date(record.expiryDate);
        const isExpired = expiryDate < now;
        const isExpiringSoon = expiryDate <= thirtyDaysFromNow && expiryDate >= now;
        const isActive = expiryDate >= now;
        
        // Check if we should show this record based on status filters
        if (isExpired && !filters.showExpired) return false;
        if (isActive && !isExpiringSoon && !filters.showActive) return false;
        if (isExpiringSoon && !filters.showExpiringSoon) return false;
        
        return true;
    });

    // Filter by client type
    if (!filters.showDuplicateClients) {
        // Show only unique clients (latest activation)
        filtered = getLatestActivationForEachClient(filtered);
    }

    if (!filters.showHighValueClients) {
        // Filter out high value clients (more than 5 activations or 3 devices)
        filtered = filtered.filter(client => 
            !((client.activations || 0) > 5 || (client.hardwareIds?.length || 0) > 3)
        );
    }

    if (!filters.showLowActivityClients) {
        // Filter out low activity clients (0-1 activations)
        filtered = filtered.filter(client => 
            (client.activations || 0) > 1
        );
    }

    return filtered;
};

// Function to export data to Excel
export const exportToExcel = (data: ProcessedClient[], filename: string = 'نظام_إدارة_التراخيص') => {
    try {
        // Prepare data for export
        const exportData = data.map(client => ({
            'ID': client.id,
            'اسم العميل': client.clientName,
            'اسم الترخيص': client.licenseName,
            'المنتج': client.product,
            'تاريخ التفعيل': client.activationDate instanceof Date 
                ? client.activationDate.toISOString().split('T')[0]
                : new Date(client.activationDate).toISOString().split('T')[0],
            'تاريخ الانتهاء': client.expiryDate instanceof Date 
                ? client.expiryDate.toISOString().split('T')[0]
                : new Date(client.expiryDate).toISOString().split('T')[0],
            'مفتاح الترخيص': client.licenseKey,
            'عدد التفعيلات': client.activations,
            'الأجهزة': client.hardwareIds?.join(', ') || '',
            'الترخيص': client.license,
            'حالة الترخيص': new Date(client.expiryDate) < new Date() ? 'منتهي' : 'نشط',
            'الأيام المتبقية': Math.ceil((new Date(client.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        const columnWidths = [
            { wch: 8 },   // ID
            { wch: 25 },  // اسم العميل
            { wch: 30 },  // اسم الترخيص
            { wch: 20 },  // المنتج
            { wch: 15 },  // تاريخ التفعيل
            { wch: 15 },  // تاريخ الانتهاء
            { wch: 35 },  // مفتاح الترخيص
            { wch: 12 },  // عدد التفعيلات
            { wch: 40 },  // الأجهزة
            { wch: 20 },  // الترخيص
            { wch: 12 },  // حالة الترخيص
            { wch: 15 }   // الأيام المتبقية
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'تراخيص العملاء');

        // Generate filename with current date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const fullFilename = `${filename}_${dateStr}_${timeStr}.xlsx`;

        // Save file
        XLSX.writeFile(workbook, fullFilename);

        return { success: true, filename: fullFilename };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

// Function to export filtered data with current filters applied
export const exportFilteredData = (
    data: ProcessedClient[], 
    filters: { 
        showActive: boolean; 
        showExpired: boolean; 
        showExpiringSoon: boolean;
        showDuplicateClients: boolean;
        showHighValueClients: boolean;
        showLowActivityClients: boolean;
    },
    searchTerm: string = '',
    sortBy: string = '',
    sortOrder: string = ''
) => {
    try {
        // Apply the same filters as in the dashboard
        let filtered = filterDataByStatus(data, filters);

        // Apply search filter
        if (searchTerm.trim()) {
            filtered = filtered.filter(client => 
                (client.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.licenseName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.product?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (client.licenseKey?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        if (sortBy) {
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
        }

        // Create filename with filter info
        let filename = 'نظام_إدارة_التراخيص';
        if (!filters.showActive || !filters.showExpired || !filters.showExpiringSoon) {
            const statusParts = [];
            if (filters.showActive) statusParts.push('نشط');
            if (filters.showExpired) statusParts.push('منتهي');
            if (filters.showExpiringSoon) statusParts.push('قريب_الانتهاء');
            filename += '_' + statusParts.join('_');
        }
        if (!filters.showDuplicateClients) {
            filename += '_بدون_مكرر';
        }
        if (!filters.showHighValueClients) {
            filename += '_بدون_عالي_القيمة';
        }
        if (!filters.showLowActivityClients) {
            filename += '_بدون_منخفض_النشاط';
        }
        if (searchTerm) {
            filename += '_' + searchTerm.substring(0, 10);
        }

        return exportToExcel(filtered, filename);
    } catch (error) {
        console.error('Error exporting filtered data:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

// New function to get only the latest activation for each client
export const getLatestActivationForEachClient = (data: ProcessedClient[]): ProcessedClient[] => {
    const clientMap = new Map<string, ProcessedClient>();
    
    // Sort data by activation date (latest first)
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.activationDate);
        const dateB = new Date(b.activationDate);
        return dateB.getTime() - dateA.getTime();
    });
    
    // Keep only the first occurrence (latest activation) for each client name
    sortedData.forEach(record => {
        if (!clientMap.has(record.clientName)) {
            clientMap.set(record.clientName, record);
        }
    });
    
    return Array.from(clientMap.values());
};