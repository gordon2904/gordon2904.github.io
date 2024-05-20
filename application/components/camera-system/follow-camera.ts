import { Ticker, Container, Rectangle, Bounds, Sprite, Texture } from 'pixi.js';
import type { Scene } from '../scene';
import { Camera } from './camera';
import { Linear, Power2, gsap } from 'gsap';

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

export class FollowCamera extends Camera {
    public softBoundSpeed: number = 0.2;

    public softBounds?: ICameraBounds;
    public hardBounds: ICameraBounds;

    private hardDebug: Sprite;
    private softDebug: Sprite;

    public constructor(scene: Scene, private target: Container) {
        super(scene);
        this.hardDebug = this.createDebugBox(0xff0000, 1);
        this.softDebug = this.createDebugBox(0x00ff00, 2);
        console.log('hard debug: ', this.hardDebug);
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
        debugBox.alpha = 0.2;
        debugBox.setParent(this);
        debugBox.zIndex = zIndex;
        debugBox.renderable = false;
        return debugBox;
    }

    private calculateHardBounds(dt: number) {
        this.calculateCameraBounds(hardBounds, {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        });
        this.updateDebugBox(this.hardDebug, hardBounds);
        if (this.isTargetOutsideOfBounds(targetBounds, hardBounds)) {
            this.calculateAndApplyPullIns(targetBounds, hardBounds, false, dt);
        }
    }

    private updateDebugBox(box: Sprite, bounds: Rectangle) {
        box.position.x = bounds.x - this.position.x;
        box.position.y = bounds.y - this.position.y;
        box.width = bounds.width;
        box.height = bounds.height;
        // box.renderable = true;
    }

    private calculateSoftBounds(dt: number) {
        this.calculateCameraBounds(softBounds, this.softBounds!);
        this.updateDebugBox(this.softDebug, softBounds);
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
        bounds.x = this.position.x + cameraBounds.left;
        bounds.y = this.position.y + cameraBounds.top;
        bounds.width =
            this.scene.viewport.screenWidth -
            (cameraBounds.left + cameraBounds.right);
        bounds.height =
            this.scene.viewport.screenHeight -
            (cameraBounds.top + cameraBounds.bottom);
    }

    private calculateAndApplyPullIns(
        targetBounds: Rectangle,
        cameraBounds: Rectangle,
        isSoft: boolean,
        dt: number
    ) {
        //check if x
        const xPoints = [targetBounds.x, targetBounds.x + targetBounds.width];
        const pullinLeft = Math.max(
            ...xPoints.map((xPoint) => {
                return xPoint < cameraBounds.x ? cameraBounds.x - xPoint : 0;
            })
        );
        const pullinRight = Math.max(
            ...xPoints.map((xPoint) =>
                xPoint > cameraBounds.x + cameraBounds.width
                    ? xPoint - (cameraBounds.x + cameraBounds.width)
                    : 0
            )
        );
        //check if y
        const yPoints = [targetBounds.y, targetBounds.y + targetBounds.height];
        const pullinTop = Math.max(
            ...yPoints.map((yPoint) =>
                yPoint < cameraBounds.y ? cameraBounds.y - yPoint : 0
            )
        );
        const pullinBottom = Math.max(
            ...yPoints.map((yPoint) =>
                yPoint > cameraBounds.y + cameraBounds.height
                    ? yPoint - (cameraBounds.y + cameraBounds.height)
                    : 0
            )
        );

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
            this.position.x += pullinRight;
            this.position.x -= pullinLeft;
            this.position.y += pullinBottom;
            this.position.y -= pullinTop;
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
        return adjustedBounds;
    }
}
