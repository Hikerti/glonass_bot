import React, { useState, useEffect } from 'react';
import { PostDTO, PostCreateDTO, PostUpdateDTO } from '../../entities/post/types/post.types';
import { DISABLED_POST_TYPES, PostType, POST_TYPE_MAPPING } from '../../shared/types/common.types';
import { Input } from '../../shared/ui/Input/Input';
import { Select } from '../../shared/ui/Select/Select';
import { Button } from '../../shared/ui/Button/Button';
import { MediaUpload } from '../../features/post/media-upload/MediaUpload';

interface PostFormProps {
    post?: PostDTO | null;
    onSubmit: (data: PostCreateDTO | PostUpdateDTO) => Promise<void>;
    onCancel: () => void;
}

export const PostForm: React.FC<PostFormProps> = ({ post, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<PostCreateDTO>({
        type: PostType.MAIL,
        text: '',
        interval: '',
        date: new Date().toISOString().split('T')[0],
        media: [],
        active: true,
        postToWall: false,
        postToMessage: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (post) {
            setFormData({
                type: post.type,
                text: post.text,
                interval: post.interval,
                date: post.date,
                media: post.media || [],
                active: post.active,
                postToWall: post.postToWall,
                postToMessage: post.postToMessage,
            });
        }
    }, [post]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Ошибка при сохранении поста');
        } finally {
            setLoading(false);
        }
    };

    const handleMediaUpload = (url: string) => {
        setFormData(prev => ({
            ...prev,
            media: [...prev.media, url],
        }));
    };

    const handleMediaRemove = (url: string) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.filter(m => m !== url),
        }));
    };

    const postTypeOptions = Object.entries(POST_TYPE_MAPPING)
        .filter(([key]) => !DISABLED_POST_TYPES.includes(key as PostType))
        .map(([key, label]) => ({
            value: key,
            label: label,
        }));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Select
                    label="Канал рассылки *"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PostType })}
                    options={postTypeOptions}
                    required
                />
                <p className="mt-1 text-xs text-gray-500">
                    Выберите канал, через который будет отправлен пост
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текст поста *
                </label>
                <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    required
                    rows={6}
                    placeholder="Введите текст вашего поста..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                    {formData.text.length} символов
                </p>
            </div>

            <Input
                label="Интервал отправки *"
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                placeholder="Например: 3d, 5m, daily, weekly"
                required
            />

            <Input
                label="Дата начала *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
            />

            <MediaUpload
                onUpload={handleMediaUpload}
                onRemove={handleMediaRemove}
                currentMedia={formData.media}
            />

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Настройки публикации:</p>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        ✅ Пост активен
                    </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.postToWall || false}
                        onChange={(e) => setFormData({ ...formData, postToWall: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        📌 Публикация на стене (для VK)
                    </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.postToMessage || false}
                        onChange={(e) => setFormData({ ...formData, postToMessage: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        💬 Отправка в сообщениях
                    </span>
                </label>
            </div>

            <div className="flex gap-3 pt-4">
                <Button type="submit" loading={loading} className="flex-1">
                    {post ? '💾 Обновить' : '➕ Создать'}
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                    ✖️ Отмена
                </Button>
            </div>
        </form>
    );
};
