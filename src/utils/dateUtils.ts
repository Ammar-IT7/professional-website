export const formatDate = (date: Date | string | null | undefined): string => {
    try {
        if (!date) {
            return 'N/A';
        }
        
        let dateObj: Date;
        
        if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (date instanceof Date) {
            dateObj = date;
        } else {
            return 'Invalid Date';
        }
        
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }
        
        // Format date in Arabic locale for better display
        return dateObj.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

export const formatDateWithHijri = (date: Date | string | null | undefined) => {
    try {
        if (!date) {
            return { gregorian: 'N/A', hijri: 'N/A' };
        }
        
        let dateObj: Date;
        
        if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (date instanceof Date) {
            dateObj = date;
        } else {
            return { gregorian: 'Invalid Date', hijri: 'Invalid Date' };
        }
        
        if (isNaN(dateObj.getTime())) {
            return { gregorian: 'Invalid Date', hijri: 'Invalid Date' };
        }
        
        // التاريخ الميلادي - تنسيق YYYY-MM-DD
        const gregorian = dateObj.toISOString().split('T')[0];
        
        // التاريخ الهجري - تنسيق عربي بدون "هـ"
        const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(dateObj).replace(' هـ', '').replace(' ه', '');
        
        return { gregorian, hijri: hijriDate };
    } catch (error) {
        console.error('Error formatting date with Hijri:', error);
        // في حالة الخطأ، نعرض التاريخ الميلادي فقط
        try {
            if (!date) return { gregorian: 'N/A', hijri: 'غير متوفر' };
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return { gregorian: 'Invalid Date', hijri: 'غير متوفر' };
            const gregorian = dateObj.toISOString().split('T')[0];
            return { gregorian, hijri: 'غير متوفر' };
        } catch {
            return { gregorian: 'Invalid Date', hijri: 'غير متوفر' };
        }
    }
};

export const getDaysRemaining = (expiryDate: Date): number => {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isExpiringSoon = (expiryDate: Date, daysThreshold: number = 30): boolean => {
    const daysRemaining = getDaysRemaining(expiryDate);
    return daysRemaining <= daysThreshold && daysRemaining >= 0;
}; 