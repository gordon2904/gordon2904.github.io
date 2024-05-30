import { EventEmitter } from 'eventemitter3';
import { pixiDelay } from './utils';
import { Ticker } from 'pixi.js';

function clamp(value: number, min: number, max: number) {
    const minValue = Math.min(min, max);
    const maxValue = Math.max(min, max);
    if (value > maxValue) {
        value = maxValue;
    } else if (value < minValue) {
        value = minValue;
    }
    return value;
}

interface IKeyInputEvents {
    onKeyDown: (event: KeyboardEvent) => void;
    onKeyUp: (event: KeyboardEvent) => void;
}

export class KeyboardInputManager extends EventEmitter<IKeyInputEvents> {
    private keysPressed: Map<string, KeyboardEvent> = new Map();

    private static mInstance: KeyboardInputManager;
    public static get instance() {
        if (!this.mInstance) {
            this.mInstance = new KeyboardInputManager();
        }
        return this.mInstance;
    }
    private constructor() {
        super();
        this.setupKeyListeners();
    }

    public destroy() {
        document.removeEventListener('keydown', this.onKeyDown.bind(this));
        document.removeEventListener('keyup', this.onKeyUp.bind(this));
        window.removeEventListener('blur', this.interruptHeldKeys.bind(this));
    }

    private setupKeyListeners() {
        window.addEventListener('blur', this.interruptHeldKeys.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    private interruptHeldKeys() {
        this.keysPressed.forEach((event) => {
            this.onKeyUp(event);
        });
    }

    private onKeyDown(event: KeyboardEvent) {
        if (this.keysPressed.has(event.code)) {
            return;
        } else {
            this.keysPressed.set(event.code, event);
            this.emit('onKeyDown', event);
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        if (this.keysPressed.has(event.code)) {
            this.keysPressed.delete(event.code);
            this.emit('onKeyUp', event);
        }
    }

    public async keyHeldForMilliSeconds(
        key: string,
        delayInMilliSeconds: number,
        onComplete: () => void,
        onUpdate: (progress: number) => void = () => {},
        onInterrupt: () => void = () => {}
    ) {
        let keyPressedTime = -1;
        this.on('onKeyDown', (event) => {
            if (event.code === key) {
                keyPressedTime = performance.now();
                onKeyPressed();
                onUpdate(0);
            }
        });

        const updateWrapper = () => {
            const timeElapsedInMS = performance.now() - keyPressedTime;
            const progress = clamp(timeElapsedInMS / delayInMilliSeconds, 0, 1);
            onUpdate(progress);
        };

        const onKeyPressed = async () => {
            Ticker.system.add(updateWrapper);
            new Promise<boolean>((resolve) => {
                //set off delay
                const onKeyUp = (event: KeyboardEvent) => {
                    if (event.code === key) {
                        resolve(false);
                    }
                };
                const cleanup = (status: boolean) => {
                    this.off('onKeyUp', onKeyUp);
                    resolve(status);
                };
                pixiDelay(delayInMilliSeconds * 0.001).then(() =>
                    cleanup(true)
                );
                //set off key up listener
                this.on('onKeyUp', onKeyUp);
            }).then((keyWasHeldLongEnough) => {
                Ticker.system.remove(updateWrapper);
                if (keyWasHeldLongEnough) {
                    onUpdate(1);
                    onComplete();
                } else {
                    onInterrupt();
                }
            });
        };
    }
}
