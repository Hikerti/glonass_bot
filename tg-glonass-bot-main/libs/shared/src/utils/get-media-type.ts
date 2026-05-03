type MediaType = 'photo'|'video';

export function getMediaType(url: string): MediaType {
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

    if (extension && videoExtensions.includes(extension)) {
        return 'video';
    }
    return 'photo';
}