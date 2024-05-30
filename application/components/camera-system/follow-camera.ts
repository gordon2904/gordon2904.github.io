import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Scene } from '../scene';
import { Camera } from './camera';
import { Linear, gsap } from 'gsap';

const targetBounds = new Rectangle();

const softBounds = new Rectangle();
const hardBounds = new Rectangle();

function interpolate(
    a: number,
    b: number,
    t: number,
    ease: gsap.EaseFunction = Linear.easeNone
) {
    return a + (b - a) * ease(t);
}

function interpolateDelta(
    a: number,
    b: number,
    speed: number,
    dt: number,
    ease: gsap.EaseFunction = Linear.easeNone
) {
    return interpolate(a, b, 1 - Math.pow(speed, dt), ease);
}

interface ICameraBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

interface ICameraPullins {
    pullinLeft: number;
    pullinRight: number;
    pullinTop: number;
    pullinBottom: number;
}

const defaultHardBounds: ICameraBounds = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
};

export class FollowCamera extends Camera {
    public softBoundSpeed: number = 0.2;

    public softBounds?: ICameraBounds;
    public hardBounds?: ICameraBounds;

    private hardDebug: Sprite;
    private softDebug: Sprite;

    public constructor(
        scene: Scene,
        private target: Container
    ) {
        super(scene);
        this.hardDebug = this.createDebugBox(0xff0000, 1);
        this.softDebug = this.createDebugBox(0x00ff00, 2);
    }

    public override update(dt: number) {
        // _target.getBounds();
        this.calculateAdjustedBounds();
        this.calculateHardBounds(dt);
        if (this.softBounds) {
            this.calculateSoftBounds(dt);
        }
        super.update(dt);
    }

    private createDebugBox(tint: number, zIndex: number) {
        const debugBox = new Sprite(Texture.WHITE);
        debugBox.tint = tint;
        debugBox.alpha = 0.5;
        // debugBox.anchor.set(0.5, 0.5);
        debugBox.setParent(this);
        debugBox.zIndex = zIndex;
        debugBox.renderable = false;
        return debugBox;
    }

    private calculateHardBounds(dt: number) {
        this.calculateCameraBounds(
            hardBounds,
            this.hardBounds ?? {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }
        );
        this.updateDebugBox(
            this.hardDebug,
            hardBounds,
            this.hardBounds ?? defaultHardBounds
        );
        if (this.isTargetOutsideOfBounds(targetBounds, hardBounds)) {
            this.calculateAndApplyPullIns(targetBounds, hardBounds, false, dt);
        }
    }

    private updateDebugBox(
        box: Sprite,
        bounds: Rectangle,
        cameraBounds: ICameraBounds
    ) {
        box.width = Math.abs(bounds.width / this.scale.x);
        box.height = Math.abs(bounds.height / this.scale.y);
        box.position.y =
            -this.scene.viewport.screenHeight * 0.5 + cameraBounds.bottom;
        box.position.x =
            -this.scene.viewport.screenWidth * 0.5 + cameraBounds.left;
        box.renderable = true;
    }

    private calculateSoftBounds(dt: number) {
        this.calculateCameraBounds(softBounds, this.softBounds!);
        this.updateDebugBox(this.softDebug, softBounds, this.softBounds!);
        if (this.isTargetOutsideOfBounds(targetBounds, softBounds)) {
            this.calculateAndApplyPullIns(targetBounds, softBounds, true, dt);
        }
    }

    private isTargetOutsideOfBounds(
        targetBounds: Rectangle,
        cameraBounds: Rectangle
    ) {
        const points = [
            { x: targetBounds.x, y: targetBounds.y },
            { x: targetBounds.x + targetBounds.width, y: targetBounds.y },
            { x: targetBounds.x, y: targetBounds.y + targetBounds.height },
            {
                x: targetBounds.x + targetBounds.width,
                y: targetBounds.y + targetBounds.height
            }
        ];
        return !points.every((point) =>
            cameraBounds.contains(point.x, point.y)
        );
    }

    private calculateCameraBounds(
        bounds: Rectangle,
        cameraBounds: ICameraBounds
    ) {
        // this.target.toLocal(this.target, this.target);
        // this.toLocal(this.scene.viewport)
        const { screenWidth, screenHeight } = this.scene.viewport;
        const halfScreenWidth = screenWidth * 0.5;
        const halfScreenHeight = screenHeight * 0.5;
        bounds.x =
            this.position.x -
            (halfScreenWidth - cameraBounds.left) * this.scale.x;
        bounds.y =
            this.position.y -
            (halfScreenHeight - cameraBounds.bottom) * this.scale.y;
        bounds.width =
            (screenWidth - (cameraBounds.left + cameraBounds.right)) *
            this.scale.x;
        bounds.height =
            (screenHeight - (cameraBounds.bottom + cameraBounds.top)) *
            this.scale.y;
    }

    private calculateAndApplyPullIns(
        targetBounds: Rectangle,
        cameraBounds: Rectangle,
        isSoft: boolean,
        dt: number
    ) {
        let pullinLeft: number = 0;
        let pullinRight: number = 0;
        let pullinTop: number = 0;
        let pullinBottom: number = 0;
        if (targetBounds.width > cameraBounds.width) {
            const targetPos = targetBounds.x + this.target.width * 0.5;
            const amountToMove = targetPos - this.position.x;
            const moveIsPositive = Math.sign(amountToMove) === 1;
            pullinLeft = moveIsPositive ? 0 : Math.abs(amountToMove);
            pullinRight = moveIsPositive ? Math.abs(amountToMove) : 0;
        } else {
            const xPoints = [
                targetBounds.x,
                targetBounds.x + targetBounds.width
            ];
            pullinLeft = Math.max(
                ...xPoints.map((xPoint) => {
                    return xPoint < cameraBounds.x
                        ? cameraBounds.x - xPoint
                        : 0;
                })
            );
            pullinRight = Math.max(
                ...xPoints.map((xPoint) =>
                    xPoint > cameraBounds.x + cameraBounds.width
                        ? xPoint - (cameraBounds.x + cameraBounds.width)
                        : 0
                )
            );
        }
        if (targetBounds.height > cameraBounds.height) {
            const targetPos = targetBounds.y + this.target.height * 0.5;
            const amountToMove = targetPos - this.position.y;
            const moveIsPositive = Math.sign(amountToMove) === 1;
            pullinTop = moveIsPositive ? 0 : Math.abs(amountToMove);
            pullinBottom = moveIsPositive ? Math.abs(amountToMove) : 0;
        } else {
            const yPoints = [
                targetBounds.y,
                targetBounds.y + targetBounds.height
            ];
            pullinTop = Math.max(
                ...yPoints.map((yPoint) =>
                    yPoint < cameraBounds.y ? cameraBounds.y - yPoint : 0
                )
            );
            pullinBottom = Math.max(
                ...yPoints.map((yPoint) =>
                    yPoint > cameraBounds.y + cameraBounds.height
                        ? yPoint - (cameraBounds.y + cameraBounds.height)
                        : 0
                )
            );
        }

        this.applyPullins(
            {
                pullinLeft,
                pullinRight,
                pullinTop,
                pullinBottom
            },
            isSoft,
            dt
        );
    }

    private applyPullins(
        { pullinLeft, pullinRight, pullinBottom, pullinTop }: ICameraPullins,
        soft: boolean,
        dt: number
    ) {
        if (soft) {
            const newX =
                pullinLeft > pullinRight
                    ? this.position.x - pullinLeft
                    : this.position.x + pullinRight;
            const newY =
                pullinTop > pullinBottom
                    ? this.position.y - pullinTop
                    : this.position.y + pullinBottom;
            this.position.x = interpolateDelta(
                this.position.x,
                newX,
                this.softBoundSpeed,
                dt
            );
            this.position.y = interpolateDelta(
                this.position.y,
                newY,
                this.softBoundSpeed,
                dt
            );
        } else {
            if (pullinLeft > 0 && pullinRight > 0) {
                this.position.x += (pullinLeft + pullinRight) * 0.5;
            } else {
                this.position.x +=
                    pullinLeft > pullinRight ? -pullinLeft : pullinRight;
            }

            if (pullinTop > 0 && pullinBottom > 0) {
                this.position.y += (pullinTop + pullinBottom) * 0.5;
            } else {
                this.position.y +=
                    pullinTop > pullinBottom ? -pullinTop : pullinBottom;
            }
        }
    }

    private calculateAdjustedBounds() {
        const adjustedBounds = this.target.getBounds(false, targetBounds);
        adjustedBounds.x -= this.scene.position.x;
        adjustedBounds.y -= this.scene.position.y;
        adjustedBounds.x /= this.scene.scale.x;
        adjustedBounds.y /= this.scene.scale.y;
        adjustedBounds.x -= this.scene.viewport.x;
        adjustedBounds.y -= this.scene.viewport.y;
        adjustedBounds.width /= this.scene.scale.x;
        adjustedBounds.height /= this.scene.scale.y;

        adjustedBounds.x /= this.scene.viewport.scale.x;
        adjustedBounds.y /= this.scene.viewport.scale.y;
        adjustedBounds.width /= this.scene.viewport.scale.x;
        adjustedBounds.height /= this.scene.viewport.scale.y;

        adjustedBounds.width = Math.abs(adjustedBounds.width);
        adjustedBounds.height = Math.abs(adjustedBounds.height);
        adjustedBounds.y -= adjustedBounds.height;
        return adjustedBounds;
    }
}
