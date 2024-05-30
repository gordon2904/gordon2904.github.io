import { Ticker } from 'pixi.js';

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

export function calculateDeltaTimeFromPixiTick(tick: number) {
    const dtInMS = tick / Ticker.targetFPMS;
    return dtInMS * 0.001;
}

export async function pixiDelay(
    delayInSeconds: number,
    ticker: Ticker = Ticker.system
) {
    return new Promise((resolve) => {
        let time = 0;
        const onFinished = (overshoot: number) => {
            ticker.remove(delayListener);
            resolve(overshoot);
        };
        const delayListener = (pixiTick: number) => {
            time += calculateDeltaTimeFromPixiTick(pixiTick);
            if (time >= delayInSeconds) {
                onFinished(time - delayInSeconds);
            }
        };
        ticker.add(delayListener);
    });
}

export const EMPTY_PROMISE = new Promise<never>(() => {});
