export function getRandomRange(
    from: number,
    to: number,
    asInt: boolean = false
) {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const randDiff = (max - min) * Math.random();
    return asInt ? Math.round(min + randDiff) : min + randDiff;
}

export function getRandomValue(...values: number[]) {
    return values[getRandomRange(0, values.length - 1, true)];
}
