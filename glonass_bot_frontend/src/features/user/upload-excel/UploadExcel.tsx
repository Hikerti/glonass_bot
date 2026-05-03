import React, { useRef, useState } from 'react';
import { userApi } from '../../../entities/user/api/userApi';
import { Button } from '../../../shared/ui/Button/Button';

interface UploadExcelProps {
    onSuccess?: () => void;
}

export const UploadExcel: React.FC<UploadExcelProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setError('Пожалуйста, выберите Excel файл');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await userApi.uploadExcel(file);
            alert('Пользователи успешно импортированы');
            if (onSuccess) onSuccess();
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            setError('Ошибка при импорте пользователей');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const blob = await userApi.exportExcel();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_${new Date().toISOString()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Ошибка при экспорте пользователей');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2 items-start">
            <div className="flex-1">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                    id="excel-upload"
                />
                <label htmlFor="excel-upload">
                    <Button
                        variant="secondary"
                        loading={loading}
                        className="cursor-pointer inline-block"
                    >
                        📤 Импорт из Excel
                    </Button>
                </label>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <Button
                variant="secondary"
                onClick={handleExport}
                loading={loading}
            >
                📥 Экспорт в Excel
            </Button>
        </div>
    );
};
