import React, { useState } from 'react';
import { postApi } from '../../../entities/post/api/postApi';

interface MediaUploadProps {
    onUpload: (url: string) => void;
    onRemove?: (url: string) => void;
    currentMedia?: string[];
    label?: string;
    description?: string;
    buttonText?: string;
    accept?: string;
    inputId?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
                                                            onUpload,
                                                            onRemove,
                                                            currentMedia = [],
                                                            label = 'Медиа файлы',
                                                            description = 'Поддерживаются изображения и видео. Можно выбрать несколько файлов',
                                                            buttonText = '📎 Загрузить файлы',
                                                            accept = 'image/*,video/*',
                                                            inputId = 'media-upload',
                                                        }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);

        try {
            for (const file of files) {
                const result = await postApi.uploadMedia(file);
                onUpload(result.url);
            }
            // Очистить input после загрузки
            e.target.value = '';
        } catch (err) {
            console.error('Upload error:', err);
            alert('Ошибка при загрузке файла');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (url: string) => {
        if (onRemove) {
            onRemove(url);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
                <input
                    type="file"
                    multiple
                    accept={accept}
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id={inputId}
                />
                <label
                    htmlFor={inputId}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                        uploading
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                >
                    {uploading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Загрузка...
                        </>
                    ) : (
                        <>
                            {buttonText}
                        </>
                    )}
                </label>
                <p className="mt-1 text-xs text-gray-500">
                    {description}
                </p>
            </div>

            {currentMedia.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {currentMedia.map((url, index) => (
                        <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                ) : url.match(/\.(mp4|webm|ogg)$/i) ? (
                                    <video src={url} className="w-full h-full object-cover" controls />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <span className="text-xs text-center px-2">📄 {url.split('/').pop()?.slice(0, 20)}...</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button" // ВАЖНО!
                                onClick={() => handleRemove(url)}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-lg"
                                title="Удалить файл"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {currentMedia.length > 0 && (
                <p className="text-xs text-gray-500">
                    Загружено файлов: {currentMedia.length}
                </p>
            )}
        </div>
    );
};