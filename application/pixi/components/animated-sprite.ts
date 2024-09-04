import { Texture } from '@pixi/core';
import { Sprite } from '@pixi/sprite';
import type { IDestroyOptions } from '@pixi/display';
import type { FrameObject } from 'pixi.js';
import EventEmitter from 'eventemitter3';
import { modulus } from '~/application/utils';

interface IAnimatedSpriteEvents {
    onStop: () => void;
    onPlay: () => void;
    onInterrupt: (progress: number) => void;
    onComplete: (elapsedSince: number) => void;
    onReverseComplete: (elapsedSince: number) => void;
    onFrameChange: (frameIndex: number) => void;
}
class AnimatedSpriteEventEmitter extends EventEmitter<IAnimatedSpriteEvents> {}

export class AnimatedSprite extends Sprite {
    public readonly emitter: AnimatedSpriteEventEmitter =
        new AnimatedSpriteEventEmitter();

    /**
     * frame rate at which to play animations at, this will be disregarded when making use of FrameObjects with their own durations
     * @defauult 30
     */
    public frameRate: number = 30;

    /**
     * The speed that the AnimatedSprite will play at. Higher is faster, lower is slower.
     * @default 1
     */
    public timeScale: number = 1;

    /**
     * Whether or not the animate sprite repeats after playing.
     * @default true
     */
    public loop: boolean = true;

    /**
     * Update anchor to [Texture's defaultAnchor]{@link PIXI.Texture#defaultAnchor} when frame changes.
     *
     * Useful with [sprite sheet animations]{@link PIXI.Spritesheet#animations} created with tools.
     * Changing anchor for each frame allows to pin sprite origin to certain moving feature
     * of the frame (e.g. left foot).
     *
     * Note: Enabling this will override any previously set `anchor` on each frame change.
     * @default false
     */
    public updateAnchor: boolean = false;

    private mIsPlaying: boolean;
    private mTextures: Texture[];
    private mDurations: number[];

    private totalAnimationDuration: number = 0;

    /** Elapsed time since last frame started, used internally to calculate when to display next texture. */
    private currentFrameTime: number = 0;
    /** Elapsed time since animation has been started, used internally to display current texture. */
    private currentTime: number = 0;

    /** The texture index that was displayed last time. */
    private previousFrame: number = 0;
    /** The texture index that was displayed last time. */
    private currentFrame: number = 0;

    /**
     * @param textures - An array of {@link PIXI.Texture} or frame
     *  objects that make up the animation.
     * @param {boolean} [autoUpdate=true] - Whether to use Ticker.shared to auto update animation time.
     */
    constructor(textures?: Texture[] | FrameObject[]) {
        super(
            textures
                ? textures[0] instanceof Texture
                    ? textures[0]
                    : textures[0].texture
                : Texture.EMPTY
        );

        this.mTextures = null;
        this.mDurations = null;
        this.updateAnchor = false;
        this.previousFrame = null;
        this.textures = textures;
    }

    /** Stops the AnimatedSprite. */
    public stop(): void {
        if (!this.mIsPlaying) {
            return;
        }
        this.emitter.emit('onStop');

        this.mIsPlaying = false;
    }

    /** Plays the AnimatedSprite. */
    public play(): void {
        if (this.mIsPlaying) {
            return;
        }
        this.emitter.emit('onPlay');

        this.mIsPlaying = true;
    }

    /**
     * Stops the AnimatedSprite and goes to a specific frame.
     * @param frameNumber - Frame index to stop at.
     */
    public gotoAndStop(frameNumber: number): void {
        this.stop();
        this.goToFrame(frameNumber);
    }

    /**
     * Goes to a specific frame and begins playing the AnimatedSprite.
     * @param frameNumber - Frame index to start at.
     */
    public gotoAndPlay(frameNumber: number): void {
        this.goToFrame(frameNumber);
        this.play();
    }

    private goToFrame(frameNumber: number): void {
        this.currentFrame = frameNumber;
        this.currentTime =
            this.mDurations !== null
                ? this.calculateTimeAtFrame(frameNumber)
                : frameNumber * (1 / this.frameRate);
        this.currentFrameTime = 0;
    }

    private calculateTimeAtFrame(frameNumber: number) {
        return this.mDurations
            .slice(0, frameNumber + 1)
            .reduce((prev, curr) => prev + curr, 0);
    }

    /**
     * Updates the object transform for rendering.
     * @param deltaTime - Time since last tick.
     */
    public update(deltaTime: number): void {
        if (!this.isPlaying) {
            return;
        }

        const scaledDeltaTime = this.timeScale * deltaTime;
        this.currentTime += scaledDeltaTime;
        this.currentFrameTime += scaledDeltaTime;

        if (this.mDurations !== null) {
            if (Math.sign(scaledDeltaTime) === -1) {
                //go back a frame
                while (this.currentFrameTime < 0) {
                    const lastFrame =
                        (this.currentFrame - 1) % this.textures.length;

                    const previousDuration = this.mDurations[lastFrame];
                    this.currentFrameTime += previousDuration;
                    this.currentFrame = lastFrame;
                }
            } else {
                while (
                    this.currentFrameTime > this.mDurations[this.currentFrame]
                ) {
                    this.currentFrameTime -= this.mDurations[this.currentFrame];
                    this.currentFrame =
                        (this.currentFrame + 1) % this.textures.length;
                }
            }
        } else {
            const frameTime = 1 / this.frameRate;
            const framesElapsed = this.currentFrameTime / frameTime;
            const framesFloored =
                Math.sign(framesElapsed) * Math.floor(Math.abs(framesElapsed));
            this.currentFrame = modulus(
                this.currentFrame + framesFloored,
                this.textures.length
            );
            this.currentFrameTime = modulus(this.currentFrameTime, frameTime);
        }

        //after elapsing as far as we needed to:
        if (!this.loop) {
            if (this.currentTime < 0) {
                const elapsed = Math.abs(this.currentTime);
                this.gotoAndStop(0);
                this.emitter.emit('onReverseComplete', elapsed);
            } else if (this.currentTime > this.totalAnimationDuration) {
                const elapsed = this.currentTime - this.totalAnimationDuration;
                this.gotoAndStop(this.textures.length - 1);
                this.emitter.emit('onComplete', elapsed);
            }
        } else if (
            this.currentTime < 0 ||
            this.currentTime > this.totalAnimationDuration
        ) {
            this.currentTime = modulus(
                this.currentTime,
                this.totalAnimationDuration
            );
        }
        this.updateTexture();
    }

    /** Updates the displayed texture to match the current frame index. */
    private updateTexture(): void {
        if (this.previousFrame === this.currentFrame) {
            return;
        }

        this.previousFrame = this.currentFrame;

        this._texture = this.mTextures[this.currentFrame];
        this._textureID = -1;
        this._textureTrimmedID = -1;
        this._cachedTint = 0xffffff;
        this.uvs = this._texture._uvs.uvsFloat32;

        if (this.updateAnchor) {
            this._anchor.copyFrom(this._texture.defaultAnchor);
        }
        this.emitter.emit('onFrameChange', this.currentFrame);
    }

    /**
     * Stops the AnimatedSprite and destroys it.
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value.
     * @param {boolean} [options.children=false] - If set to true, all the children will have their destroy
     *      method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Should it destroy the current texture of the sprite as well.
     * @param {boolean} [options.baseTexture=false] - Should it destroy the base texture of the sprite as well.
     */
    public destroy(options?: IDestroyOptions | boolean): void {
        this.stop();
        super.destroy(options);
    }

    /**
     * The total number of frames in the AnimatedSprite. This is the same as number of textures
     * assigned to the AnimatedSprite.
     * @readonly
     * @default 0
     */
    get totalFrames(): number {
        return this.mTextures.length;
    }

    /** The array of textures used for this AnimatedSprite. */
    get textures(): Texture[] | FrameObject[] {
        return this.mTextures;
    }

    set textures(value: Texture[] | FrameObject[]) {
        this.emitter.emit(
            'onInterrupt',
            this.currentTime / this.totalAnimationDuration
        );
        if (value[0] instanceof Texture) {
            this.mTextures = value as Texture[];
            this.mDurations = null;
            this.totalAnimationDuration =
                (1 / this.frameRate) * this.mTextures.length;
        } else {
            const frameObjects = value as FrameObject[];
            this.mTextures = [];
            this.mDurations = [];
            let totalAnimationDuration = 0;

            for (let i = 0; i < value.length; i++) {
                this.mTextures.push(frameObjects[i].texture);
                this.mDurations.push(frameObjects[i].time);
                totalAnimationDuration += frameObjects[i].time;
            }
            this.totalAnimationDuration = totalAnimationDuration;
        }
        this.previousFrame = null;
        this.gotoAndStop(0);
        this.updateTexture();
    }

    /**
     * Indicates if the AnimatedSprite is currently playing.
     * @readonly
     */
    public get isPlaying(): boolean {
        return this.mIsPlaying;
    }
}
