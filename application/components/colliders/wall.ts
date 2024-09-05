import {
    Container,
    ObservablePoint,
    type IPointData,
    Graphics,
    Point
} from 'pixi.js';
import type { Scene } from '../scene';
import {
    ShapeType,
    type Collider,
    type World,
    Cuboid
} from '@dimforge/rapier2d';
import { RAPIER } from '../../rapier/rapier';

const tempLocal = new Point();

export class Wall extends Container {
    public readonly wallCollider: Collider;
    public readonly size: ObservablePoint;
    protected colliders: Collider[] = [];
    private graphics: Graphics = new Graphics();

    public constructor(
        private sceneParent: Scene,
        size: IPointData
    ) {
        super();
        this.size = new ObservablePoint(
            this.onSizeChange.bind(this),
            this,
            size.x,
            size.y
        );
        sceneParent.viewport.addChild(this);
        this.addChild(this.graphics);
        this.graphics.renderable = false;
        this.wallCollider = this.setupCollider(sceneParent.physicsWorld);
        this.colliders.push(this.wallCollider);
        this.position.cb = this.onPositionChanged.bind(this);
        this.DEBUG();
    }

    private drawGraphics() {
        this.graphics.clear();
        this.colliders.forEach((collider, i) => {
            const colliderPosition = collider.translation();
            this.sceneParent.viewport.toLocal(
                colliderPosition,
                this.parent,
                tempLocal
            );
            switch (collider.shape.type) {
                case ShapeType.Cuboid: {
                    const cuboid = collider.shape as Cuboid;
                    this.graphics.beginFill(i === 0 ? 0x00ff00 : 0xff0000, 0.5);
                    const { x: halfExtentX, y: halfExtentY } =
                        cuboid.halfExtents;
                    this.graphics.drawRect(
                        tempLocal.x - halfExtentX - this.x, //tempLocal.x + halfExtentX,
                        tempLocal.y - halfExtentY - this.y,
                        halfExtentX * 2,
                        halfExtentY * 2
                    );
                    break;
                }
            }
        });
    }

    private onPositionChanged() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.transform as any).onChange();
        this.setColliderPosition();
        this.drawGraphics();
    }

    private onSizeChange() {
        this.setColliderSizes();
        this.setColliderPosition();
        this.drawGraphics();
    }

    protected setColliderSizes() {
        this.wallCollider.setHalfExtents({
            x: this.size.x * 0.5,
            y: this.size.y * 0.5
        });
    }

    protected setColliderPosition() {
        this.wallCollider.setTranslation({
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
        this.graphics.renderable = true;
    }
}
