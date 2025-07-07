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

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setNotification({
            message,
            type,
            isVisible: true
        });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, isVisible: false }));
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Clear cached data when new file is selected
            localStorage.removeItem('clientData');
            setFile(selectedFile);
        }
    }, []);

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
            // Clear cached data when new file is dropped
            localStorage.removeItem('clientData');
            setFile(e.dataTransfer.files[0]);
        }
    }, []);

    const removeFile = useCallback(() => {
        setFile(null);
        // Clear cached data when file is removed
        localStorage.removeItem('clientData');
    }, []);

    const handleUpload = useCallback(async () => {
        if (!file) {
            showNotification('يرجى اختيار ملف أولاً', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const processedData = await parseExcelFile(file);
            
            if (processedData && processedData.length > 0) {
                // Check for duplicate clients
                const duplicateClients = checkForDuplicateClients(processedData);
                if (duplicateClients.length > 0) {
                    showNotification(`تحذير: تم العثور على ${duplicateClients.length} عميل مكرر`, 'warning');
                }

                // Store in localStorage
                localStorage.setItem('clientData', JSON.stringify(processedData));
                
                showNotification('تم رفع ومعالجة الملف بنجاح', 'success');
                
                // Navigate to dashboard
                setTimeout(() => {
                    history.push('/dashboard');
                }, 1000);
            } else {
                showNotification('الملف لا يحتوي على بيانات صحيحة', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('حدث خطأ أثناء معالجة الملف', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [file, history, showNotification]);

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
                                        className="btn btn-secondary"
                                    >
                                        إزالة الملف
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Required Columns Info */}
                    <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            الأعمدة المطلوبة في ملف Excel:
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium text-gray-800 mb-2">الأعمدة الأساسية:</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• اسم العميل (Client Name)</li>
                                    <li>• المنتج (Product)</li>
                                    <li>• تاريخ انتهاء الصلاحية (Expiry Date)</li>
                                    <li>• عدد التفعيلات (Activations)</li>
                                    <li>• مفتاح الترخيص (License Key)</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800 mb-2">الأعمدة الاختيارية:</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• عدد الأجهزة (Devices)</li>
                                    <li>• ملاحظات (Notes)</li>
                                    <li>• حالة الترخيص (Status)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExcelUpload;