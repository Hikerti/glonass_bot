import React from 'react';
import { UserDTO } from '../../../entities/user/types/user.types';
import { Button } from '../../../shared/ui/Button/Button';
import { getEmailByType, getShortEmailLabel } from '../../../shared/utils/email.utils';

interface UserCardProps {
    user: UserDTO;
    onEdit: (user: UserDTO) => void;
    onDelete: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
    const systemEmail = getEmailByType(user.typeEmail);
    const shortLabel = getShortEmailLabel(user.typeEmail);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{user.name}</h3>
                    <div className="flex flex-wrap gap-2">
            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {user.role === 'admin' ? '👑 Администратор' : '👤 Клиент'}
            </span>
                        <span
                            className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800"
                            title={systemEmail}
                        >
              📧 {shortLabel}
            </span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
                {/* Системная почта для рассылки */}
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-1">Системная почта для рассылки:</p>
                    <p className="font-mono text-xs break-all">{systemEmail}</p>
                </div>

                {/* Личная почта пользователя */}
                {user.email && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Личная почта:</p>
                        <p className="font-mono text-xs break-all">{user.email}</p>
                    </div>
                )}

                {user.tgId && (
                    <p className="flex items-center gap-2">
                        <span>📱</span>
                        <span className="truncate">Telegram: {user.tgId}</span>
                    </p>
                )}

                {user.vkId && (
                    <p className="flex items-center gap-2">
                        <span>🔗</span>
                        <span>VK ID: {user.vkId}</span>
                    </p>
                )}

                <p className="text-xs text-gray-400 pt-2">
                    Создан: {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
                </p>
            </div>

            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(user)}
                    className="flex-1"
                >
                    ✏️ Редактировать
                </Button>
                <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                        if (confirm(`Вы уверены, что хотите удалить пользователя "${user.name}"?`)) {
                            onDelete(user.id);
                        }
                    }}
                    className="flex-1"
                >
                    🗑️ Удалить
                </Button>
            </div>
        </div>
    );
};