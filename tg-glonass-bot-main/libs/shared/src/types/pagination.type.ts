export type PaginationType<T> = {
    items: T[],
    total: number,
    page: number,
    isLast: boolean,
    limit: number
}