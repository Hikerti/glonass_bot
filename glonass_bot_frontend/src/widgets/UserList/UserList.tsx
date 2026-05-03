import React, { useState, useEffect, useCallback } from 'react';
import { userApi } from '../../entities/user/api/userApi';
import { UserDTO } from '../../entities/user/types/user.types';
import { UserRole, UserTypeEmail } from '../../shared/types/common.types';
import { UserCard } from '../../features/user/user-card/UserCard';
import { Loader } from '../../shared/ui/Loader/Loader';
import { useInfiniteScroll } from '../../shared/hooks/useInfiniteScroll';

interface UserListProps {
    role?: UserRole;
    typeEmail?: UserTypeEmail;
    onEdit: (user: UserDTO) => void;
    refreshTrigger?: number;
}

export const UserList: React.FC<UserListProps> = ({
                                                      role,
                                                      typeEmail,
                                                      onEdit,
                                                      refreshTrigger
                                                  }) => {
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadUsers = useCallback(async (pageNum: number, reset = false) => {
        if (loading) return;

        setLoading(true);
        try {
            const data = await userApi.getList({
                page: pageNum,
                limit: 10,
                role,
                typeEmail
            });
            setUsers(prev => reset ? data.items : [...prev, ...data.items]);
            setHasMore(!data.isLast);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }, [role, typeEmail, loading]);

    useEffect(() => {
        setUsers([]);
        setPage(1);
        setHasMore(true);
        loadUsers(1, true);
    }, [role, typeEmail, refreshTrigger]);

    const handleLoadMore = useCallback(() => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadUsers(nextPage);
    }, [page, loadUsers]);

    const handleDelete = async (id: string) => {
        try {
            await userApi.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Ошибка при удалении пользователя');
        }
    };

    const { loadMoreRef } = useInfiniteScroll({
        loading,
        hasMore,
        onLoadMore: handleLoadMore,
    });

    if (users.length === 0 && loading) {
        return <Loader />;
    }

    if (users.length === 0 && !loading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Пользователи не найдены</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                    <UserCard
                        key={user.id}
                        user={user}
                        onEdit={onEdit}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            <div ref={loadMoreRef} className="h-10">
                {loading && <Loader />}
            </div>

            {!hasMore && users.length > 0 && (
                <p className="text-center text-gray-500 py-4">Все пользователи загружены</p>
            )}
        </div>
    );
};