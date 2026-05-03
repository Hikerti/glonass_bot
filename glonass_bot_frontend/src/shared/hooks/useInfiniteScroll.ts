import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollProps {
    loading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

export const useInfiniteScroll = ({
                                      loading,
                                      hasMore,
                                      onLoadMore,
                                  }: UseInfiniteScrollProps) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [target] = entries;
            if (target.isIntersecting && !loading && hasMore) {
                onLoadMore();
            }
        },
        [loading, hasMore, onLoadMore]
    );

    useEffect(() => {
        const element = loadMoreRef.current;
        if (!element) return;

        observerRef.current = new IntersectionObserver(handleObserver, {
            threshold: 0.1,
        });

        observerRef.current.observe(element);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleObserver]);

    return { loadMoreRef };
};