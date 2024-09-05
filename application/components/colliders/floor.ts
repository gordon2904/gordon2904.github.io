import { type IPointData } from 'pixi.js';
import type { Scene } from '../scene';
import type { Collider, World } from '@dimforge/rapier2d';
import { RAPIER } from '../../rapier/rapier';
import { Wall } from './wall';

export class Floor extends Wall {
    public readonly floorCollider: Collider;

    public constructor(parent: Scene, size: IPointData) {
        super(parent, size);
        this.floorCollider = this.setupFloorCollider(parent.physicsWorld);
        this.colliders.push(this.floorCollider);
    }

    protected setColliderSizes() {
        super.setColliderSizes();
        this.floorCollider.setHalfExtents({
            x: this.size.x * 0.5,
            y: this.size.y * 0.05
        });
    }

    protected setColliderPosition() {
        super.setColliderPosition();
        this.floorCollider.setTranslation({
            x: this.x + this.size.x * 0.5,
            y: this.y + this.size.y * 0.95
        });
    }

    private setupFloorCollider(world: World) {
        return world.createCollider(
            RAPIER.ColliderDesc.cuboid(
                this.size.x * 0.5,
                this.size.y * 0.05
            ).setFriction(4)
        );
    }
}
