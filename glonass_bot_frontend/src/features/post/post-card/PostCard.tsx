import React from 'react';
import { PostDTO } from '../../../entities/post/types/post.types';
import { Button } from '../../../shared/ui/Button/Button';
import { getPostTypeLabel, getPostTypeIcon } from '../../../shared/utils/post.utils';

interface PostCardProps {
    post: PostDTO;
    onEdit: (post: PostDTO) => void;
    onDelete: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete }) => {
    const typeLabel = getPostTypeLabel(post.type);
    const typeIcon = getPostTypeIcon(post.type);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex gap-2 items-center mb-2 flex-wrap">
            <span className="inline-block px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">
              {typeIcon} {typeLabel}
            </span>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            post.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
              {post.active ? '✅ Активен' : '❌ Неактивен'}
            </span>
                    </div>
                    <p className="text-gray-700 line-clamp-3 mb-2">{post.text}</p>
                </div>
            </div>

            {post.media && post.media.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                    {post.media.slice(0, 4).map((url, index) => (
                        <div key={index} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded overflow-hidden border border-gray-200">
                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <video src={url} className="w-full h-full object-cover" />
                            )}
                        </div>
                    ))}
                    {post.media.length > 4 && (
                        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm font-medium">
                            +{post.media.length - 4}
                        </div>
                    )}
                </div>
            )}

            <div className="text-xs text-gray-500 mb-3 space-y-1 bg-gray-50 p-2 rounded">
                <p>🗓️ Начало рассылки: {post.startDate || 'сразу'}</p>
                <p>📅 Окончание рассылки: {post.date}</p>
                <p>⏱️ Интервал: {post.interval}</p>
                {post.postToWall && <p className="text-blue-600">📌 Публикация на стене</p>}
                {post.postToMessage && <p className="text-green-600">💬 Отправка в сообщениях</p>}
            </div>

            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(post)}
                    className="flex-1"
                >
                    ✏️ Редактировать
                </Button>
                <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                        if (confirm(`Вы уверены, что хотите удалить этот пост?`)) {
                            onDelete(post.id);
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
