import React, { useRef, useState } from 'react';
import axios from 'axios';
import { userApi } from '../../../entities/user/api/userApi';
import { Button } from '../../../shared/ui/Button/Button';
import { EMAIL_TYPE_MAPPING, UserTypeEmail } from '../../../shared/types/common.types';

interface UploadExcelProps {
    onSuccess?: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (!axios.isAxiosError(error)) {
        return fallback;
    }

    const data = error.response?.data as { message?: string | string[] } | undefined;
    const message = data?.message;

    return Array.isArray(message) ? message.join(', ') : message || fallback;
};

export const UploadExcel: React.FC<UploadExcelProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typeEmail, setTypeEmail] = useState<UserTypeEmail>(UserTypeEmail.MAIL);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isExcel =
            file.name.toLowerCase().endsWith('.xlsx') ||
            file.name.toLowerCase().endsWith('.xls');

        if (!isExcel) {
            setError('Пожалуйста, выберите Excel файл .xlsx или .xls');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await userApi.uploadExcel(file, typeEmail);
            alert(`Пользователи успешно импортированы: ${result.count}`);
            onSuccess?.();

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Ошибка при импорте пользователей'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        setError(null);

        try {
            const blob = await userApi.exportExcel();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = `users_${new Date().toISOString().slice(0, 10)}.xlsx`;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Ошибка при экспорте пользователей'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center flex-wrap">
                <select
                    value={typeEmail}
                    onChange={(e) => setTypeEmail(e.target.value as UserTypeEmail)}
                    disabled={loading}
                    className="border rounded px-3 py-2"
                >
                    {Object.entries(EMAIL_TYPE_MAPPING).map(([type, email]) => (
                        <option key={type} value={type}>
                            {type.toUpperCase()} - {email}
                        </option>
                    ))}
                </select>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                />

                <Button
                    variant="secondary"
                    loading={loading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    📤 Импорт из Excel
                </Button>

                <Button
                    variant="secondary"
                    onClick={handleExport}
                    loading={loading}
                >
                    📥 Экспорт в Excel
                </Button>
            </div>

            <p className="text-xs text-gray-500">
                Excel должен содержать колонки: <b>name</b> и <b>email</b>.
                Также поддерживаются: <b>Имя</b>, <b>ФИО</b>, <b>Почта</b>, <b>Email</b>.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
};
