import type { Scene } from '../scene';
import type { Camera } from './camera';

export class CameraSystem {
    private activeCamera: Camera;

    public constructor(private scene: Scene) {}

    public lateUpdate(dt: number) {
        if (this.activeCamera) {
            this.activeCamera.update(dt);
            // this.scene.viewport.moveCorner(-10, 0);
            this.scene.viewport.moveCorner(
                this.activeCamera.position.x,
                this.activeCamera.position.y
            );
        }
    }

    public setActiveCamera(camera: Camera) {
        this.activeCamera = camera;
    }

    //TODO: sort out interpolating from/to cameras
}
