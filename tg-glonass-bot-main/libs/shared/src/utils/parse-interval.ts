export function parseInterval(interval: string): number {
    const normalizedInterval = interval.trim().toLowerCase();
    const aliases: Record<string, number> = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
    };

    if (aliases[normalizedInterval]) {
        return aliases[normalizedInterval];
    }

    const regex = /^(\d+)\s*(d|day|days|h|hour|hours|m|min|minute|minutes)$/;
    const match = normalizedInterval.match(regex);
    if (!match) throw new Error('Invalid interval format');

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 'day':
        case 'days':
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        case 'hour':
        case 'hours':
        case 'h':
            return value * 60 * 60 * 1000;
        case 'min':
        case 'minute':
        case 'minutes':
        case 'm':
            return value * 60 * 1000;
        default:
            throw new Error('Unknown interval unit');
    }
}
