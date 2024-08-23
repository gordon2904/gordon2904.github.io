import {
    Assets,
    Spritesheet,
    Texture,
    type FrameObject,
    type IPointData
} from 'pixi.js';
import { AnimatedSprite } from '~/application/pixi/components/animated-sprite';

const ANIMATIONS = [
    'attack-1',
    'attack-2',
    'attack-3',
    'block',
    'block-idle',
    'block-no-effect',
    'death',
    'death-no-blood',
    'fall',
    'hurt',
    'idle',
    'jump',
    'ledge-grab',
    'roll',
    'run',
    'wall-slide'
] as const;

type FellaAnimation = (typeof ANIMATIONS)[number];

interface IAnimationFrameData {
    frames: number;
}
type AnimationKeyframeData<T extends string> = {
    [key in T]: IAnimationFrameData;
};

const animationFrameData: AnimationKeyframeData<FellaAnimation> = {
    ['attack-1']: {
        frames: 6
    },
    ['attack-2']: {
        frames: 6
    },
    ['attack-3']: {
        frames: 8
    },
    ['block']: {
        frames: 5
    },
    ['block-idle']: {
        frames: 8
    },
    ['block-no-effect']: {
        frames: 5
    },
    ['death']: {
        frames: 10
    },
    ['death-no-blood']: {
        frames: 10
    },
    ['fall']: {
        frames: 4
    },
    ['hurt']: {
        frames: 3
    },
    ['idle']: {
        frames: 8
    },
    ['jump']: {
        frames: 3
    },
    ['ledge-grab']: {
        frames: 5
    },
    ['roll']: {
        frames: 9
    },
    ['run']: {
        frames: 10
    },
    ['wall-slide']: {
        frames: 5
    }
};

const DEFAULT_ANCHOR: IPointData = { x: 0.76, y: 0.96 } as const;
export class FellaAnimatedSprite extends AnimatedSprite {
    private animations: Map<FellaAnimation, Texture[]> = new Map();

    public constructor(textures?: Texture[] | FrameObject[]) {
        super(textures);
        this.frameRate = 12;
        this.updateAnchor = true;

        this.emitter.on('onComplete', (elapsed) =>
            console.log('completed anim: ', elapsed)
        );

        this.emitter.on('onInterrupt', (progress) =>
            console.log('interrupt anim: ', progress)
        );

        // this.emitter.on('onFrameChange', (frame) =>
        //     console.log('frame change: ', frame)
        // );
    }

    public async init() {
        const playerRecord = await Assets.load(['sheets/player']);
        const playerSheet = playerRecord['sheets/player'] as Spritesheet;

        ANIMATIONS.forEach((animation) => {
            const textures = [];
            const { frames } = animationFrameData[animation];
            for (let i = 0; i < frames; ++i) {
                const texture =
                    playerSheet.textures[`${animation}/${animation}_${i}`];
                texture.defaultAnchor.copyFrom(DEFAULT_ANCHOR);
                textures.push(texture);
            }
            this.animations.set(animation, textures);
        });
        this.playAnimation('idle');
        this.height = 1;
        this.scale.x = this.scale.y;
    }

    public async playAnimation(
        animation: FellaAnimation,
        loop: boolean = true
    ) {
        // this.emit('animationInterrupt');
        this.textures = this.getAnimationTextures(animation);
        this.play();
        this.loop = loop;
        console.log('start listening for interrupt - ', `"${animation}"`);
        await Promise.race([this.onInterrupt(), this.onAnimationComplete()]);
        // this.emitter.emit('onComplete', 0);
    }

    private onInterrupt() {
        return new Promise((resolve) => {
            console.log('construct listener for interrupt');
            const completeListener = () => {
                console.log('INTERRUPT HAPPENED');
                resolve(true);
                removeListener();
            };
            const removeListener = () => {
                this.emitter.removeListener('onInterrupt', completeListener);
            };
            this.emitter.addListener('onInterrupt', completeListener);
        });
    }

    private onAnimationComplete() {
        return new Promise((resolve) => {
            const completeListener = () => {
                console.log('onComplete');
                resolve(true);
                removeListener();
            };
            const removeListener = () => {
                this.emitter.removeListener('onComplete', completeListener);
            };
            this.emitter.addListener('onComplete', completeListener);
        });
    }

    private getAnimationTextures(animation: FellaAnimation): Texture[] {
        return this.animations.get(animation)!;
    }
}
