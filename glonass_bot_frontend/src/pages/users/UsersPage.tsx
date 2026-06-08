import React, { useState } from 'react';
import { userApi } from '../../entities/user/api/userApi';
import { UserCreateDTO, UserDTO, UserUpdateDTO } from '../../entities/user/types/user.types';
import { UserRole, UserTypeEmail, EMAIL_TYPE_MAPPING } from '../../shared/types/common.types';
import { UserList } from '../../widgets/UserList/UserList';
import { UserForm } from '../../widgets/UserForm/UserForm';
import { UploadExcel } from '../../features/user/upload-excel/UploadExcel';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Button } from '../../shared/ui/Button/Button';
import { Select } from '../../shared/ui/Select/Select';
import { Input } from '../../shared/ui/Input/Input';
import { useDebounce } from '../../shared/hooks/useDebounce';

export const UsersPage: React.FC = () => {
    const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
    const [typeEmailFilter, setTypeEmailFilter] = useState<UserTypeEmail | undefined>(undefined);
    const [search, setSearch] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const debouncedSearch = useDebounce(search, 400);

    const handleCreateOrUpdate = async (data: UserCreateDTO | UserUpdateDTO) => {
        try {
            if (selectedUser) {
                await userApi.update(selectedUser.id, data as UserUpdateDTO);
            } else {
                await userApi.create(data as UserCreateDTO);
            }
            setIsModalOpen(false);
            setSelectedUser(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Ошибка при сохранении пользователя');
        }
    };

    const handleEdit = (user: UserDTO) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleResetFilters = () => {
        setRoleFilter(undefined);
        setTypeEmailFilter(undefined);
        setSearch('');
    };

    // Опции для выбора типа email с реальными адресами
    const emailTypeOptions = [
        { value: '', label: 'Все типы email' },
        ...Object.entries(EMAIL_TYPE_MAPPING).map(([key, email]) => ({
            value: key,
            label: `${key.toUpperCase()} - ${email}`,
        })),
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-6">Управление пользователями</h1>

                <div className="flex flex-col gap-4 mb-6">
                    {/* Кнопки действий */}
                    <div className="flex flex-wrap gap-4 items-center">
                        <Button onClick={handleCreate}>
                            ➕ Создать пользователя
                        </Button>
                        <UploadExcel onSuccess={() => setRefreshTrigger(prev => prev + 1)} />
                    </div>

                    {/* Фильтры */}
                    <div className="flex flex-wrap gap-4 items-start bg-gray-50 p-4 rounded-lg">
                        <div className="flex-1 min-w-[260px]">
                            <Input
                                label="Поиск"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Имя, email, телефон или описание"
                            />
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <Select
                                label="Роль"
                                value={roleFilter || ''}
                                onChange={(e) => setRoleFilter(e.target.value as UserRole || undefined)}
                                options={[
                                    { value: '', label: 'Все роли' },
                                    { value: UserRole.CLIENT, label: '👤 Клиенты' },
                                    { value: UserRole.ADMIN, label: '👑 Администраторы' },
                                ]}
                            />
                        </div>

                        <div className="flex-1 min-w-[300px]">
                            <Select
                                label="Системная почта для рассылки"
                                value={typeEmailFilter || ''}
                                onChange={(e) => setTypeEmailFilter(e.target.value as UserTypeEmail || undefined)}
                                options={emailTypeOptions}
                            />
                        </div>

                        {(roleFilter || typeEmailFilter || search) && (
                            <div className="flex items-end">
                                <Button variant="secondary" onClick={handleResetFilters}>
                                    ✖️ Сбросить
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Информация о фильтрах */}
                    {(roleFilter || typeEmailFilter || debouncedSearch) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-blue-900 mb-1">Активные фильтры:</p>
                            <div className="flex flex-wrap gap-2">
                                {roleFilter && (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Роль: {roleFilter === UserRole.ADMIN ? 'Администратор' : 'Клиент'}
                  </span>
                                )}
                                {typeEmailFilter && (
                                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded">
                    Email: {EMAIL_TYPE_MAPPING[typeEmailFilter]}
                  </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UserList
                key={`${roleFilter || 'all'}-${typeEmailFilter || 'all'}-${debouncedSearch || 'search'}-${refreshTrigger}`}
                role={roleFilter}
                typeEmail={typeEmailFilter}
                search={debouncedSearch}
                onEdit={handleEdit}
                refreshTrigger={refreshTrigger}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedUser ? 'Редактировать пользователя' : 'Создать пользователя'}
            >
                <UserForm
                    key={selectedUser?.id || 'new'}
                    user={selectedUser}
                    onSubmit={handleCreateOrUpdate}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
};
