import React, { useState } from 'react';
import { postApi } from '../../entities/post/api/postApi';
import { PostCreateDTO, PostDTO, PostUpdateDTO } from '../../entities/post/types/post.types';
import { DISABLED_POST_TYPES, PostType, POST_TYPE_MAPPING } from '../../shared/types/common.types';
import { PostList } from '../../widgets/PostList/PostList';
import { PostForm } from '../../widgets/PostForm/PostForm';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Button } from '../../shared/ui/Button/Button';
import { Select } from '../../shared/ui/Select/Select';

export const PostsPage: React.FC = () => {
    const [selectedPost, setSelectedPost] = useState<PostDTO | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState<PostType | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleCreateOrUpdate = async (data: PostCreateDTO | PostUpdateDTO) => {
        try {
            if (selectedPost) {
                await postApi.update(selectedPost.id, data as PostUpdateDTO);
            } else {
                await postApi.create(data as PostCreateDTO);
            }
            setIsModalOpen(false);
            setSelectedPost(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving post:', error);
            alert('Ошибка при сохранении поста');
        }
    };

    const handleEdit = (post: PostDTO) => {
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedPost(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPost(null);
    };

    const handleResetFilters = () => {
        setTypeFilter(undefined);
    };

    // Опции для выбора типа поста
    const postTypeOptions = [
        { value: '', label: 'Все типы постов' },
        ...Object.entries(POST_TYPE_MAPPING)
            .filter(([key]) => !DISABLED_POST_TYPES.includes(key as PostType))
            .map(([key, label]) => ({
                value: key,
                label: label,
            })),
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-6">Управление постами</h1>

                <div className="flex flex-col gap-4 mb-6">
                    {/* Кнопки действий */}
                    <div className="flex flex-wrap gap-4 items-center">
                        <Button onClick={handleCreate}>
                            ➕ Создать пост
                        </Button>
                    </div>

                    {/* Фильтры */}
                    <div className="flex flex-wrap gap-4 items-start bg-gray-50 p-4 rounded-lg">
                        <div className="flex-1 min-w-[300px]">
                            <Select
                                label="Тип поста / Канал рассылки"
                                value={typeFilter || ''}
                                onChange={(e) => setTypeFilter(e.target.value as PostType || undefined)}
                                options={postTypeOptions}
                            />
                        </div>

                        {typeFilter && (
                            <div className="flex items-end">
                                <Button variant="secondary" onClick={handleResetFilters}>
                                    ✖️ Сбросить
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Информация о фильтре */}
                    {typeFilter && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-blue-900 mb-1">Активный фильтр:</p>
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {POST_TYPE_MAPPING[typeFilter]}
              </span>
                        </div>
                    )}
                </div>
            </div>

            <PostList
                key={`${typeFilter || 'all'}-${refreshTrigger}`}
                type={typeFilter}
                onEdit={handleEdit}
                refreshTrigger={refreshTrigger}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedPost ? 'Редактировать пост' : 'Создать пост'}
                size="lg"
            >
                <PostForm
                    key={selectedPost?.id || 'new'}
                    post={selectedPost}
                    onSubmit={handleCreateOrUpdate}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
};
