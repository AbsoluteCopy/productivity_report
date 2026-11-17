export const fmtClock = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
};

export const compareText = (actual, expected) => {
    if (!expected) return { text: 'No time target set', cls: 'text-muted' };
    const pct = Math.round((Math.abs(actual - expected) / expected) * 100);
    if (actual <= expected) return { text: `${pct}% faster than selected time`, cls: 'text-success' };
    return { text: `${pct}% slower than selected time`, cls: 'text-danger' };
};
