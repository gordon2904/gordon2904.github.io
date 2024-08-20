import { Container, DisplayObject, Ticker } from 'pixi.js';

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

export function traverseChildren<T extends DisplayObject = DisplayObject>(
    parent: Container<T> | DisplayObject,
    emitMethod: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
) {
    parent.emit(emitMethod, ...args);
    if (!(parent instanceof Container)) {
        return;
    }
    for (let i = 0; i < parent.children.length; ++i) {
        if (parent.children[i].worldVisible) {
            traverseChildren(parent.children[i], emitMethod, ...args);
        }
    }
}

export function lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
}
