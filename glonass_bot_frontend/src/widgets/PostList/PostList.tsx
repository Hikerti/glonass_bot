import React, { useState, useEffect, useCallback } from 'react';
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
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadPosts = useCallback(async (pageNum: number, reset = false) => {
        if (loading) return;

        setLoading(true);
        try {
            const params = {
                page: pageNum,
                limit: 10,
                type: type
            }
            const data = await postApi.getList(params);
            setPosts(prev => reset ? data.items : [...prev, ...data.items]);
            setHasMore(!data.isLast);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    }, [type, loading]);

    useEffect(() => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
        loadPosts(1, true);
    }, [type, refreshTrigger]);

    const handleLoadMore = useCallback(() => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadPosts(nextPage);
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

            {!hasMore && posts.length > 0 && (
                <p className="text-center text-gray-500 py-4">Все посты загружены</p>
            )}
        </div>
    );
};