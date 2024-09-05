import {
    Assets,
    Spritesheet,
    Texture,
    type IPointData,
    SCALE_MODES
} from 'pixi.js';
import { AnimatedSprite } from '~/application/pixi/components/animated-sprite';
import { type FellaState, FellaStateMachine } from './state-machine';
import { FELLA_ANIMATIONS } from './consts';

interface IAnimationFrameData {
    frames: number;
}
type AnimationKeyframeData<T extends string> = {
    [key in T]: IAnimationFrameData;
};

const animationFrameData: AnimationKeyframeData<FellaState> = {
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

const DEFAULT_ANCHOR: IPointData = { x: 0.385, y: 0.96 } as const;
export class FellaAnimatedSprite extends AnimatedSprite {
    private readonly animations: Map<FellaState, Texture[]> = new Map();
    public readonly stateMachine: FellaStateMachine = new FellaStateMachine();

    public constructor() {
        super([Texture.EMPTY]);
        this.frameRate = 12;
        this.updateAnchor = true;
    }

    public async init() {
        const playerRecord = await Assets.load(['sheets/player']);
        const playerSheet = playerRecord['sheets/player'] as Spritesheet;
        playerSheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;

        FELLA_ANIMATIONS.forEach((animation) => {
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
        this.stateMachine.on('onStateChange', this.onStateChange.bind(this));
        this.playAnimation(this.stateMachine.state);
        // this.x = 2;
        this.height = 2.8;
        this.scale.x = this.scale.y;
    }

    private onStateChange(_from: FellaState, to: FellaState) {
        this.playAnimation(to);
    }

    public async playAnimation(state: FellaState) {
        this.textures = this.getAnimationTextures(state);
        this.play();
        this.loop = this.isStateLoopable(state);
    }

    private isStateLoopable(state: FellaState) {
        const loopables: FellaState[] = ['idle', 'run', 'block-idle', 'fall'];
        return loopables.includes(state);
    }

    private getAnimationTextures(animation: FellaState): Texture[] {
        return this.animations.get(animation)!;
    }
}
