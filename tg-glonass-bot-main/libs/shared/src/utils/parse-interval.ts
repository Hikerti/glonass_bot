export function parseInterval(interval: string): number {
    const regex = /^(\d+)([dhm])$/;
    const match = interval.match(regex);
    if (!match) throw new Error('Invalid interval format');

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'm':
            return value * 60 * 1000;
        default:
            throw new Error('Unknown interval unit');
    }
}
