import {
    Container,
    ObservablePoint,
    type IPointData,
    Sprite,
    Texture
} from 'pixi.js';
import type { Scene } from '../scene';
import type { Collider, World } from '@dimforge/rapier2d';
import { RAPIER } from '../../rapier/rapier';

export class Wall extends Container {
    public readonly collider: Collider;
    public readonly size: ObservablePoint;
    private debugSprite: Sprite;

    public constructor(parent: Scene, size: IPointData) {
        super();
        this.size = new ObservablePoint(
            this.onSizeChange.bind(this),
            this,
            size.x,
            size.y
        );
        parent.viewport.addChild(this);
        this.collider = this.setupCollider(parent.physicsWorld);
        this.position.cb = this.onPositionChanged.bind(this);
        this.createDebugGraphic();
        this.DEBUG();
    }

    private createDebugGraphic() {
        this.debugSprite = new Sprite(Texture.WHITE);
        this.debugSprite.renderable = false;
        this.debugSprite.tint = 0xffffff;
        this.debugSprite.alpha = 0.3;
        this.addChild(this.debugSprite);
        this.drawGraphic();
    }

    private drawGraphic() {
        this.debugSprite.width = this.size.x;
        this.debugSprite.height = this.size.y;
    }

    private onPositionChanged() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.transform as any).onChange();
        this.setColliderPosition();
    }

    private onSizeChange() {
        this.collider.setHalfExtents({ x: this.size.x, y: this.size.y });
        this.setColliderPosition();
        this.drawGraphic();
    }

    private setColliderPosition() {
        this.collider.setTranslation({
            x: this.x + this.size.x / 2,
            y: this.y + this.size.y / 2
        });
    }

    private setupCollider(world: World) {
        return world.createCollider(
            RAPIER.ColliderDesc.cuboid(
                this.size.x / 2,
                this.size.y / 2
            ).setFriction(4)
        );
    }

    public DEBUG() {
        this.debugSprite.renderable = true;
    }
}
