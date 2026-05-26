import React, { useState, useEffect, useCallback, useRef } from 'react';
import { postApi } from '../../entities/post/api/postApi';
import { PostDTO } from '../../entities/post/types/post.types';
import { PostType } from '../../shared/types/common.types';
import { PostCard } from '../../features/post/post-card/PostCard';
import { Loader } from '../../shared/ui/Loader/Loader';
import { useInfiniteScroll } from '../../shared/hooks/useInfiniteScroll';

interface PostListProps {
    type?: PostType;
    onEdit: (post: PostDTO) => void;
    refreshTrigger?: number;
}

export const PostList: React.FC<PostListProps> = ({ type, onEdit, refreshTrigger }) => {
    const [posts, setPosts] = useState<PostDTO[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadingRef = useRef(false);
    const requestIdRef = useRef(0);

    const loadPosts = useCallback(async (pageNum: number): Promise<boolean> => {
        if (loadingRef.current) return false;

        const requestId = ++requestIdRef.current;
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: pageNum,
                limit: 10,
                type: type
            }
            const data = await postApi.getList(params);

            if (requestId !== requestIdRef.current) return false;

            setPosts(prev => [...prev, ...data.items]);
            setHasMore(!data.isLast);
            return true;
        } catch (error) {
            if (requestId !== requestIdRef.current) return false;

            console.error('Error loading posts:', error);
            setError('Не удалось загрузить посты');
            setHasMore(false);
            return false;
        } finally {
            if (requestId === requestIdRef.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    }, [type]);

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        loadingRef.current = true;

        const loadFirstPage = async () => {
            try {
                const data = await postApi.getList({ page: 1, limit: 10, type });

                if (requestId !== requestIdRef.current) return;

                setPosts(data.items);
                setPage(1);
                setHasMore(!data.isLast);
                setError(null);
            } catch (error) {
                if (requestId !== requestIdRef.current) return;

                console.error('Error loading posts:', error);
                setPosts([]);
                setHasMore(false);
                setError('Не удалось загрузить посты');
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
    }, [type, refreshTrigger]);

    const handleLoadMore = useCallback(() => {
        const nextPage = page + 1;
        void loadPosts(nextPage).then((success) => {
            if (success) setPage(nextPage);
        });
    }, [page, loadPosts]);

    const handleDelete = async (id: string) => {
        try {
            await postApi.delete(id);
            setPosts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Ошибка при удалении поста');
        }
    };

    const { loadMoreRef } = useInfiniteScroll({
        loading,
        hasMore,
        onLoadMore: handleLoadMore,
    });

    if (posts.length === 0 && loading) {
        return <Loader />;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
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

            {!hasMore && posts.length > 0 && (
                <p className="text-center text-gray-500 py-4">Все посты загружены</p>
            )}
        </div>
    );
};
