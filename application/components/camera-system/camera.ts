import { Container } from 'pixi.js';
import type { Scene } from '../scene';

export abstract class Camera extends Container {
    public clampToWorld: boolean = true;
    public constructor(protected scene: Scene) {
        super();
        this.setParent(this.scene.viewport);
    }

    public update(dt: number): void {
        if (this.clampToWorld) {
            this.clampCamera();
        }
    }

    protected clampCamera() {
        const maxWorldX =
            this.scene.viewport.worldWidth - this.scene.viewport.screenWidth;
        const maxWorldY =
            this.scene.viewport.worldHeight - this.scene.viewport.screenHeight;
        this.position.x = Math.max(0, Math.min(this.position.x, maxWorldX));
        this.position.y = Math.max(0, Math.min(this.position.y, maxWorldY));
    }
}
