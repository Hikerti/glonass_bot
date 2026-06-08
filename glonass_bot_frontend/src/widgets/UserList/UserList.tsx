import React, { useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '../../entities/user/api/userApi';
import { UserDTO } from '../../entities/user/types/user.types';
import { UserRole, UserTypeEmail } from '../../shared/types/common.types';
import { UserCard } from '../../features/user/user-card/UserCard';
import { Loader } from '../../shared/ui/Loader/Loader';
import { useInfiniteScroll } from '../../shared/hooks/useInfiniteScroll';

interface UserListProps {
    role?: UserRole;
    typeEmail?: UserTypeEmail;
    search?: string;
    onEdit: (user: UserDTO) => void;
    refreshTrigger?: number;
}

export const UserList: React.FC<UserListProps> = ({
                                                      role,
                                                      typeEmail,
                                                      search,
                                                      onEdit,
                                                      refreshTrigger
                                                  }) => {
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadingRef = useRef(false);
    const requestIdRef = useRef(0);

    const loadUsers = useCallback(async (pageNum: number): Promise<boolean> => {
        if (loadingRef.current) return false;

        const requestId = ++requestIdRef.current;
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const data = await userApi.getList({
                page: pageNum,
                limit: 10,
                role,
                typeEmail,
                search,
            });

            if (requestId !== requestIdRef.current) return false;

            setUsers(prev => [...prev, ...data.items]);
            setHasMore(!data.isLast);
            return true;
        } catch (error) {
            if (requestId !== requestIdRef.current) return false;

            console.error('Error loading users:', error);
            setError('Не удалось загрузить пользователей');
            setHasMore(false);
            return false;
        } finally {
            if (requestId === requestIdRef.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    }, [role, typeEmail, search]);

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        loadingRef.current = true;

        const loadFirstPage = async () => {
            try {
                const data = await userApi.getList({
                    page: 1,
                    limit: 10,
                    role,
                    typeEmail,
                    search,
                });

                if (requestId !== requestIdRef.current) return;

                setUsers(data.items);
                setPage(1);
                setHasMore(!data.isLast);
                setError(null);
            } catch (error) {
                if (requestId !== requestIdRef.current) return;

                console.error('Error loading users:', error);
                setUsers([]);
                setHasMore(false);
                setError('Не удалось загрузить пользователей');
            } finally {
                if (requestId === requestIdRef.current) {
                    loadingRef.current = false;
                    setLoading(false);
                }
            }
        };

        void loadFirstPage();

        return () => {
            requestIdRef.current += 1;
            loadingRef.current = false;
        };
    }, [role, typeEmail, search, refreshTrigger]);

    const handleLoadMore = useCallback(() => {
        const nextPage = page + 1;
        void loadUsers(nextPage).then((success) => {
            if (success) setPage(nextPage);
        });
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

    if (users.length === 0 && !loading && !error) {
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

            {error && (
                <p className="text-center text-red-600 py-4">{error}</p>
            )}

            {!hasMore && users.length > 0 && (
                <p className="text-center text-gray-500 py-4">Все пользователи загружены</p>
            )}
        </div>
    );
};
