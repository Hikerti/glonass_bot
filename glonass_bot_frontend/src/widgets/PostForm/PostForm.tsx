import React, { useEffect, useState } from 'react';
import { PostDTO, PostCreateDTO, PostUpdateDTO } from '../../entities/post/types/post.types';
import { DISABLED_POST_TYPES, PostType, POST_TYPE_MAPPING, UserRole, UserTypeEmail } from '../../shared/types/common.types';
import { Input } from '../../shared/ui/Input/Input';
import { Select } from '../../shared/ui/Select/Select';
import { Button } from '../../shared/ui/Button/Button';
import { MediaUpload } from '../../features/post/media-upload/MediaUpload';
import { postApi } from '../../entities/post/api/postApi';
import { userApi } from '../../entities/user/api/userApi';
import { UserDTO } from '../../entities/user/types/user.types';
import { useDebounce } from '../../shared/hooks/useDebounce';

interface PostFormProps {
    post?: PostDTO | null;
    onSubmit: (data: PostCreateDTO | PostUpdateDTO) => Promise<void>;
    onCancel: () => void;
}

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const toDateInputValue = (date: string) => {
    const legacyDateMatch = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (legacyDateMatch) {
        const [, day, month, year] = legacyDateMatch;
        return `${year}-${month}-${day}`;
    }

    return date;
};

const MAIL_POST_TYPES = [PostType.MAIL, PostType.MAIL2, PostType.MAIL3, PostType.MAIL4] as const;

const isMailPostType = (type: PostType): type is (typeof MAIL_POST_TYPES)[number] => {
    return MAIL_POST_TYPES.includes(type as (typeof MAIL_POST_TYPES)[number]);
};

const getInitialFormData = (post?: PostDTO | null): PostCreateDTO => {
    if (post) {
        return {
            type: post.type,
            text: post.text,
            interval: post.interval,
            startDate: post.startDate ? toDateInputValue(post.startDate) : getLocalDateInputValue(),
            date: toDateInputValue(post.date),
            media: post.media || [],
            attachments: post.attachments || [],
            targetUserIds: post.targetUserIds || [],
            active: post.active,
            postToWall: post.postToWall,
            postToMessage: post.postToMessage,
        };
    }

    return {
        type: PostType.MAIL,
        text: '',
        interval: '',
        startDate: getLocalDateInputValue(),
        date: getLocalDateInputValue(),
        media: [],
        attachments: [],
        targetUserIds: [],
        active: true,
        postToWall: false,
        postToMessage: false,
    };
};

export const PostForm: React.FC<PostFormProps> = ({ post, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<PostCreateDTO>(() => getInitialFormData(post));
    const [loading, setLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [targetedMode, setTargetedMode] = useState(() => Boolean(post?.targetUserIds?.length));
    const [recipientSearch, setRecipientSearch] = useState('');
    const [recipientOptions, setRecipientOptions] = useState<UserDTO[]>([]);
    const [recipientLoading, setRecipientLoading] = useState(false);
    const [recipientError, setRecipientError] = useState<string | null>(null);
    const [knownRecipients, setKnownRecipients] = useState<Record<string, UserDTO>>({});
    const debouncedRecipientSearch = useDebounce(recipientSearch, 400);
    const today = getLocalDateInputValue();
    const isMailPost = isMailPostType(formData.type);

    useEffect(() => {
        if (!targetedMode || !isMailPost) {
            return;
        }

        let cancelled = false;

        Promise.resolve().then(() => {
            if (cancelled) return null;

            setRecipientLoading(true);
            setRecipientError(null);

            return userApi.getList({
                page: 1,
                limit: 50,
                role: UserRole.CLIENT,
                typeEmail: formData.type as unknown as UserTypeEmail,
                search: debouncedRecipientSearch,
            });
        }).then((data) => {
            if (!data) return;
            if (cancelled) return;

            setRecipientOptions(data.items);
            setKnownRecipients((prev) => {
                const next = { ...prev };
                data.items.forEach((user) => {
                    next[user.id] = user;
                });
                return next;
            });
        }).catch((error) => {
            if (cancelled) return;

            console.error('Error loading recipients:', error);
            setRecipientError('Не удалось загрузить получателей');
            setRecipientOptions([]);
        }).finally(() => {
            if (!cancelled) setRecipientLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [targetedMode, isMailPost, formData.type, debouncedRecipientSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.startDate && formData.date && formData.startDate > formData.date) {
            alert('Дата начала не может быть позже даты окончания рассылки');
            return;
        }

        if (targetedMode && isMailPost && !(formData.targetUserIds || []).length) {
            alert('Выберите хотя бы одного получателя для точечной рассылки');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                targetUserIds: targetedMode && isMailPost ? formData.targetUserIds || [] : [],
            });
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

    const handleAttachmentUpload = (url: string) => {
        setFormData(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), url],
        }));
    };

    const handleAttachmentRemove = (url: string) => {
        setFormData(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter(m => m !== url),
        }));
    };

    const handlePostTypeChange = (type: PostType) => {
        setFormData(prev => ({
            ...prev,
            type,
            targetUserIds: [],
        }));
        setTargetedMode(false);
        setRecipientSearch('');
    };

    const handleTargetedModeChange = (enabled: boolean) => {
        setTargetedMode(enabled);
        if (!enabled) {
            setFormData(prev => ({ ...prev, targetUserIds: [] }));
        }
    };

    const handleRecipientToggle = (user: UserDTO, checked: boolean) => {
        setKnownRecipients(prev => ({ ...prev, [user.id]: user }));
        setFormData(prev => {
            const currentIds = prev.targetUserIds || [];
            return {
                ...prev,
                targetUserIds: checked
                    ? Array.from(new Set([...currentIds, user.id]))
                    : currentIds.filter(id => id !== user.id),
            };
        });
    };

    const handleGenerateText = async () => {
        const prompt = aiPrompt.trim();

        if (!prompt) {
            setAiError('Введите промпт для генерации текста');
            return;
        }

        setAiLoading(true);
        setAiError(null);

        try {
            const response = await postApi.generateText({
                prompt,
                channel: POST_TYPE_MAPPING[formData.type],
            });
            setFormData(prev => ({ ...prev, text: response.text }));
        } catch (error) {
            console.error('Error generating post text:', error);
            setAiError('Не удалось сгенерировать текст. Проверьте AI конфиг и попробуйте снова.');
        } finally {
            setAiLoading(false);
        }
    };

    const postTypeOptions = Object.entries(POST_TYPE_MAPPING)
        .filter(([key]) => !DISABLED_POST_TYPES.includes(key as PostType))
        .map(([key, label]) => ({
            value: key,
            label: label,
        }));
    const selectedTargetIds = formData.targetUserIds || [];
    const selectedRecipients = selectedTargetIds
        .map(id => knownRecipients[id])
        .filter((user): user is UserDTO => Boolean(user));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Select
                    label="Канал рассылки *"
                    value={formData.type}
                    onChange={(e) => handlePostTypeChange(e.target.value as PostType)}
                    options={postTypeOptions}
                    required
                />
                <p className="mt-1 text-xs text-gray-500">
                    Выберите канал, через который будет отправлен пост
                </p>
            </div>

            {isMailPost && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={targetedMode}
                            onChange={(e) => handleTargetedModeChange(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Точечная рассылка выбранным получателям
                        </span>
                    </label>

                    {!targetedMode && (
                        <p className="text-xs text-gray-500">
                            По умолчанию письмо уйдёт всей базе, которая привязана к выбранной системной почте.
                        </p>
                    )}

                    {targetedMode && (
                        <div className="space-y-3">
                            <Input
                                label="Поиск получателей"
                                value={recipientSearch}
                                onChange={(e) => setRecipientSearch(e.target.value)}
                                placeholder="Имя, email, телефон или описание"
                            />

                            <div className="max-h-56 overflow-y-auto rounded border border-gray-200 bg-white">
                                {recipientLoading && (
                                    <p className="p-3 text-sm text-gray-500">Загрузка получателей...</p>
                                )}

                                {!recipientLoading && recipientError && (
                                    <p className="p-3 text-sm text-red-600">{recipientError}</p>
                                )}

                                {!recipientLoading && !recipientError && recipientOptions.length === 0 && (
                                    <p className="p-3 text-sm text-gray-500">Получатели не найдены</p>
                                )}

                                {!recipientLoading && !recipientError && recipientOptions.map((user) => (
                                    <label key={user.id} className="flex items-start gap-3 border-b border-gray-100 p-3 last:border-b-0 cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedTargetIds.includes(user.id)}
                                            onChange={(e) => handleRecipientToggle(user, e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-800">{user.name}</span>
                                            <span className="block text-xs text-gray-500 break-all">{user.email}</span>
                                            {user.phone && <span className="block text-xs text-gray-500">{user.phone}</span>}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                                Выбрано получателей: {selectedTargetIds.length}
                                {selectedRecipients.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedRecipients.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => handleRecipientToggle(user, false)}
                                                className="rounded-full bg-white px-3 py-1 text-xs text-blue-700 border border-blue-200 hover:bg-blue-100"
                                            >
                                                {user.name} ×
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текст поста *
                </label>
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI промпт
                    </label>
                    <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={3}
                        placeholder="Например: напиши вежливое уведомление о необходимости обновить данные по ГЛОНАСС"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                    />
                    {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
                    <div className="mt-2 flex justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={aiLoading}
                            onClick={handleGenerateText}
                        >
                            Сгенерировать текст
                        </Button>
                    </div>
                </div>
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
                label="Дата начала рассылки *"
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                min={post ? undefined : today}
                required
            />

            <Input
                label="Дата окончания рассылки *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={formData.startDate || today}
                required
            />
            <p className="-mt-3 text-xs text-gray-500">
                Первая отправка будет поставлена на дату начала, повторения прекратятся в конце даты окончания.
            </p>

            <MediaUpload
                label="Файлы для превью в письме"
                description="Изображения будут отображаться прямо в письме. Видео и прочие файлы из этого блока будут показаны ссылкой."
                buttonText="🖼️ Загрузить превью"
                inputId="media-preview-upload"
                accept="image/*,video/*"
                onUpload={handleMediaUpload}
                onRemove={handleMediaRemove}
                currentMedia={formData.media}
            />

            {isMailPost && (
                <MediaUpload
                    label="Файлы для скачивания в письме"
                    description="Эти файлы будут добавлены к письму как вложения для скачивания."
                    buttonText="📎 Загрузить вложения"
                    inputId="mail-attachment-upload"
                    accept=""
                    onUpload={handleAttachmentUpload}
                    onRemove={handleAttachmentRemove}
                    currentMedia={formData.attachments || []}
                />
            )}

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
