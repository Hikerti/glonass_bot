import React, { useState, useEffect } from 'react';
import { UserDTO, UserCreateDTO, UserUpdateDTO } from '../../entities/user/types/user.types';
import { UserRole, UserTypeEmail, EMAIL_TYPE_MAPPING } from '../../shared/types/common.types';
import { Input } from '../../shared/ui/Input/Input';
import { Select } from '../../shared/ui/Select/Select';
import { Button } from '../../shared/ui/Button/Button';

interface UserFormProps {
    user?: UserDTO | null;
    onSubmit: (data: UserCreateDTO | UserUpdateDTO) => Promise<void>;
    onCancel: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<UserCreateDTO>({
        name: '',
        email: null,
        tgId: null,
        vkId: null,
        role: UserRole.CLIENT,
        typeEmail: UserTypeEmail.MAIL,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email || null,
                tgId: user.tgId || null,
                vkId: user.vkId || null,
                role: user.role,
                typeEmail: user.typeEmail || UserTypeEmail.MAIL,
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    const emailTypeOptions = Object.entries(EMAIL_TYPE_MAPPING).map(([key, email]) => ({
        value: key,
        label: `${key.toUpperCase()} - ${email}`,
    }));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Имя *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Введите имя"
            />

            <Input
                label="Личная почта пользователя"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                placeholder="example@mail.ru"
            />

            <Input
                label="Telegram ID"
                value={formData.tgId || ''}
                onChange={(e) => setFormData({ ...formData, tgId: e.target.value || null })}
                placeholder="@username или числовой ID"
            />

            <Input
                label="VK ID"
                type="number"
                value={formData.vkId || ''}
                onChange={(e) => setFormData({ ...formData, vkId: e.target.value ? Number(e.target.value) : null })}
                placeholder="Числовой ID ВКонтакте"
            />

            <Select
                label="Роль *"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                options={[
                    { value: UserRole.CLIENT, label: '👤 Клиент' },
                    { value: UserRole.ADMIN, label: '👑 Администратор' },
                ]}
                required
            />

            <div>
                <Select
                    label="Системная почта для рассылки *"
                    value={formData.typeEmail || ''}
                    onChange={(e) => setFormData({ ...formData, typeEmail: e.target.value as UserTypeEmail })}
                    options={emailTypeOptions}
                    required
                />
                <p className="mt-1 text-xs text-gray-500">
                    С этого адреса будут отправляться письма пользователю
                </p>
            </div>

            {/* Превью выбранной почты */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs font-medium text-purple-900 mb-1">
                    Выбранная системная почта:
                </p>
                <p className="font-mono text-sm text-purple-700">
                    {formData.typeEmail ? EMAIL_TYPE_MAPPING[formData.typeEmail] : 'Не выбрана'}
                </p>
            </div>

            <div className="flex gap-3 pt-4">
                <Button type="submit" loading={loading} className="flex-1">
                    {user ? '💾 Обновить' : '➕ Создать'}
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                    ✖️ Отмена
                </Button>
            </div>
        </form>
    );
};
