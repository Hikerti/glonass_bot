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

const isLocalDevBrowser = () => {
    const currentLocation = getCurrentLocation();
    return Boolean(currentLocation && LOCAL_HOSTS.has(currentLocation.hostname) && !['', '80', '443'].includes(currentLocation.port));
};

const getSameOriginStorageUrl = (url: URL) => {
    return `${url.pathname}${url.search}${url.hash}`;
};

export const getMediaPreviewUrl = (url: string): string => {
    try {
        const currentLocation = getCurrentLocation();
        const mediaUrl = new URL(url, currentLocation?.origin);
        const isStoragePath = mediaUrl.pathname.startsWith('/local/');

        if (DOCKER_ONLY_HOSTS.has(mediaUrl.hostname)) {
            if (isLocalDevBrowser()) {
                mediaUrl.hostname = 'localhost';
                return mediaUrl.toString();
            }

            return isStoragePath ? getSameOriginStorageUrl(mediaUrl) : url;
        }

        if (!currentLocation) {
            return url;
        }

        if (isStoragePath && !isLocalBrowser()) {
            return getSameOriginStorageUrl(mediaUrl);
        }

        const isPrivateLocalUrl = LOCAL_HOSTS.has(mediaUrl.hostname) && !isLocalDevBrowser();
        const isMixedContentStorageUrl = currentLocation.protocol === 'https:' && mediaUrl.protocol === 'http:' && isStoragePath;

        if (isStoragePath && (isPrivateLocalUrl || isMixedContentStorageUrl)) {
            return getSameOriginStorageUrl(mediaUrl);
        }

        return url;
    } catch {
        return url;
    }
};

export const isImageMediaUrl = (url: string): boolean => IMAGE_EXTENSIONS.test(url);

export const isVideoMediaUrl = (url: string): boolean => VIDEO_EXTENSIONS.test(url);
