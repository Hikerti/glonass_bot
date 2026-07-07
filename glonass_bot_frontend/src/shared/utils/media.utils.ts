const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DOCKER_ONLY_HOSTS = new Set(['minio', '0.0.0.0']);

const getCurrentLocation = () => {
    return typeof window === 'undefined' ? undefined : window.location;
};

const isLocalBrowser = () => {
    const currentLocation = getCurrentLocation();
    return Boolean(currentLocation && LOCAL_HOSTS.has(currentLocation.hostname));
};

export const getMediaPreviewUrl = (url: string): string => {
    try {
        const currentLocation = getCurrentLocation();
        const mediaUrl = new URL(url, currentLocation?.origin);
        const isStoragePath = mediaUrl.pathname.startsWith('/local/');

        if (DOCKER_ONLY_HOSTS.has(mediaUrl.hostname)) {
            if (isLocalBrowser()) {
                mediaUrl.hostname = 'localhost';
                return mediaUrl.toString();
            }

            return isStoragePath ? `${mediaUrl.pathname}${mediaUrl.search}${mediaUrl.hash}` : url;
        }

        if (!currentLocation) {
            return url;
        }

        const isPrivateLocalUrl = LOCAL_HOSTS.has(mediaUrl.hostname) && !isLocalBrowser();
        const isMixedContentStorageUrl = currentLocation.protocol === 'https:' && mediaUrl.protocol === 'http:' && isStoragePath;

        if (isStoragePath && (isPrivateLocalUrl || isMixedContentStorageUrl)) {
            return `${mediaUrl.pathname}${mediaUrl.search}${mediaUrl.hash}`;
        }

        return url;
    } catch {
        return url;
    }
};

export const isImageMediaUrl = (url: string): boolean => IMAGE_EXTENSIONS.test(url);

export const isVideoMediaUrl = (url: string): boolean => VIDEO_EXTENSIONS.test(url);
