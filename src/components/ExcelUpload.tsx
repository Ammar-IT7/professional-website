import React, { useState, useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { parseExcelFile, checkForDuplicateClients } from '../utils/excelParser';
import { ProcessedClient, NotificationData } from '../types';
import Notification from './Notification';

const ExcelUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [notification, setNotification] = useState<NotificationData>({
        message: '',
        type: 'info',
        isVisible: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const history = useHistory();

    const showNotification = useCallback((message: string, type: 'error' | 'warning' | 'success' | 'info') => {
        setNotification({
            message,
            type,
            isVisible: true
        });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, isVisible: false }));
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                selectedFile.type === 'application/vnd.ms-excel') {
                localStorage.removeItem('clientData'); // Reset cached data
                setFile(selectedFile);
                showNotification('تم اختيار الملف بنجاح', 'success');
            } else {
                showNotification('يرجى اختيار ملف Excel صحيح (.xlsx أو .xls)', 'error');
            }
        }
    }, [showNotification]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                droppedFile.type === 'application/vnd.ms-excel') {
                localStorage.removeItem('clientData'); // Reset cached data
                setFile(droppedFile);
                showNotification('تم رفع الملف بنجاح', 'success');
            } else {
                showNotification('يرجى رفع ملف Excel صحيح (.xlsx أو .xls)', 'error');
            }
        }
    }, [showNotification]);

    const handleUpload = async () => {
        if (!file) {
            showNotification('يرجى اختيار ملف للرفع', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const data: ProcessedClient[] = await parseExcelFile(file);
            
            if (data.length === 0) {
                showNotification('الملف لا يحتوي على بيانات صحيحة', 'error');
                // Still allow to proceed to dashboard with empty data
                localStorage.setItem('clientData', JSON.stringify([]));
                setTimeout(() => {
                    history.push('/dashboard');
                }, 2000);
                setIsLoading(false);
                return;
            }

            // 1. Check for missing required columns
            const requiredColumns = ['ID', 'Client', 'Product', 'Activation Date', 'Expiry Date', 'License Key', 'Activations', 'Hardware IDs', 'License'];
            const firstRow = data[0] as any;
            const missingColumns = requiredColumns.filter(col => !(col in firstRow || col.replace(/ /g, '').toLowerCase() in firstRow));
            if (missingColumns.length > 0) {
                showNotification(`الأعمدة التالية مفقودة في الملف: ${missingColumns.join(', ')}`, 'warning');
                // Do not return; just warn and continue
            }

            // 2. Annotate each row with problems
            const idCount: Record<string, number> = {};
            const licenseKeyCount: Record<string, number> = {};
            data.forEach(row => {
                idCount[row.id] = (idCount[row.id] || 0) + 1;
                licenseKeyCount[row.licenseKey] = (licenseKeyCount[row.licenseKey] || 0) + 1;
            });
            const now = new Date();
            data.forEach(row => {
                const problems: string[] = [];
                if (!row.id) problems.push('معرف مفقود');
                if (!row.clientName) problems.push('اسم العميل مفقود');
                if (!row.product) problems.push('المنتج مفقود');
                if (!row.licenseKey) problems.push('مفتاح الترخيص مفقود');
                if (!row.activationDate) problems.push('تاريخ التفعيل مفقود');
                if (!row.expiryDate) problems.push('تاريخ الانتهاء مفقود');
                if (!row.license) problems.push('نوع الترخيص مفقود');
                if (idCount[row.id] > 1) problems.push('معرف مكرر');
                if (licenseKeyCount[row.licenseKey] > 1) problems.push('مفتاح ترخيص مكرر');
                if (new Date(row.expiryDate) < now) problems.push('ترخيص منتهي الصلاحية');
                (row as any).problems = problems;
            });

            // 3. Show notifications as before (unchanged)
            const invalidRows = data.filter(row => (row as any).problems && (row as any).problems.length > 0);
            if (invalidRows.length > 0) {
                showNotification(`هناك ${invalidRows.length} صفوف تحتوي على مشاكل في البيانات.`, 'warning');
            }

            // 4. Warn if any expiry date is in the past
            const expiredRows = data.filter(row => new Date(row.expiryDate) < new Date());
            if (expiredRows.length > 0) {
                showNotification(`هناك ${expiredRows.length} ترخيص منتهي الصلاحية في الملف.`, 'warning');
            }

            // Check for duplicate client names (existing logic)
            const duplicateClients = checkForDuplicateClients(data);
            
            if (duplicateClients.length > 0) {
                showNotification(
                    `تم العثور على أسماء عملاء مكررة: ${duplicateClients.join(', ')}`,
                    'warning'
                );
            } else {
                showNotification('تم رفع الملف بنجاح!', 'success');
            }

            // Store data in localStorage for dashboard access
            localStorage.setItem('clientData', JSON.stringify(data));
            
            // Navigate to dashboard after a short delay
            setTimeout(() => {
                history.push('/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('خطأ في رفع الملف. يرجى التحقق من تنسيق الملف والمحاولة مرة أخرى.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        showNotification('تم إزالة الملف', 'info');
    };

    // Auto-load default.xlsx from public folder if no file is selected
    // useEffect(() => {
    //     if (!file) {
    //         fetch('/LICE.xlsx')
    //             .then(res => {
    //                 if (!res.ok) throw new Error('No default.xlsx found');
    //                 return res.blob();
    //             })
    //             .then(blob => {
    //                 const defaultFile = new File([blob], 'LICE.xlsx', { type: blob.type });
    //                 setFile(defaultFile);
    //                 showNotification('تم تحميل ملف LICE.xlsx تلقائيًا', 'info');
    //             })
    //             .catch(() => {
    //                 // No default file found, do nothing
    //             });
    //     }
    // }, [file, showNotification]);

    return (
        <div className="container" style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div className="card fade-in">
                <div className="card-header">
                    <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                        رفع ملف Excel
                    </h1>
                    <p className="text-center text-gray-600">
                        قم برفع ملف Excel يحتوي على بيانات التراخيص للمعالجة والعرض
                    </p>
                </div>

                <div className="card-body">
                    <Notification notification={notification} onClose={closeNotification} />

                    {/* File Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            dragActive 
                                ? 'border-blue-400 bg-blue-50' 
                                : 'border-gray-300 hover-bg-gray-100'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {!file ? (
                            <div>
                                <div className="mb-4">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="file-input" className="btn btn-primary cursor-pointer">
                                        اختيار ملف Excel
                                    </label>
                                    <input
                                        id="file-input"
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-gray-500">
                                    أو اسحب وأفلت الملف هنا
                                </p>
                                <p className="text-sm text-gray-400 mt-2">
                                    الصيغ المدعومة: .xlsx, .xls
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4">
                                    <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-lg font-semibold text-gray-900 mb-2">
                                    {file.name}
                                </p>
                                <p className="text-sm text-gray-500 mb-4">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={handleUpload}
                                        disabled={isLoading}
                                        className="btn btn-success"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="spinner"></div>
                                                جاري المعالجة...
                                            </>
                                        ) : (
                                            'رفع ومعالجة'
                                        )}
                                    </button>
                                    <button
                                        onClick={removeFile}
                                        className="btn btn-outline"
                                    >
                                        إزالة الملف
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Required Columns Info */}
                    <div className="mt-8 bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            الأعمدة المطلوبة في ملف Excel:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">المعلومات الأساسية:</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li>• ID - المعرف</li>
                                    <li>• Client - العميل</li>
                                    <li>• Product - المنتج</li>
                                    <li>• License - الترخيص</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">التواريخ والمفاتيح:</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li>• Activation Date - تاريخ التفعيل</li>
                                    <li>• Expiry Date - تاريخ الانتهاء</li>
                                    <li>• License Key - مفتاح الترخيص</li>
                                    <li>• Activations - التفعيلات</li>
                                    <li>• Hardware IDs - معرفات الأجهزة</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">تعليمات مهمة:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• تأكد من أن الملف يحتوي على جميع الأعمدة المطلوبة</li>
                            <li>• يجب أن تكون التواريخ بتنسيق صحيح (YYYY-MM-DD)</li>
                            <li>• معرفات الأجهزة يجب أن تكون مفصولة بفواصل</li>
                            <li>• سيتم معالجة البيانات تلقائياً وإزالة التكرارات</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExcelUpload;