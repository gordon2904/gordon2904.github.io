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
        const minX = this.scene.viewport.screenWidth * 0.5 * this.scale.x;
        const maxWorldX = this.scene.viewport.worldWidth - minX;
        const minY = this.scene.viewport.screenHeight * 0.5 * this.scale.x;
        const maxWorldY = this.scene.viewport.worldHeight - minY;
        this.position.x = Math.max(minX, Math.min(this.position.x, maxWorldX));
        this.position.y = Math.max(minY, Math.min(this.position.y, maxWorldY));
    }
}
