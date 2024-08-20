import type { World } from '@dimforge/rapier2d';
import { Container } from 'pixi.js';

export class SceneActor extends Container {
    public constructor() {
        super();
        this.on('beforePhysicsStep', this.onBeforePhysicsStep, this);
        this.on('afterPhysicsStep', this.onAfterPhysicsStep, this);
        this.on('update', this.onUpdate, this);
        this.on('lateUpdate', this.onLateUpdate, this);
        this.on('physicsUpdate', this.onPhysicsUpdate, this);
    }

    protected onBeforePhysicsStep(_world: World) {}

    protected onAfterPhysicsStep(_world: World) {}

    protected onUpdate(_dt: number) {}

    protected onLateUpdate(_dt: number) {}

    protected onPhysicsUpdate(_t: number) {}
}
