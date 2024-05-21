import { getRandomRange } from '~/application/utils';
import type { Scene } from '../scene';
import type { Camera } from './camera';

export class CameraSystem {
    private activeCamera: Camera;

    public constructor(private scene: Scene) {}

    public lateUpdate(dt: number) {
        if (this.activeCamera) {
            this.scene.viewport.scale.set(
                1 / this.activeCamera.scale.x,
                1 / this.activeCamera.scale.y
            );
            this.activeCamera.update(dt);
            // this.scene.viewport.moveCorner(-10, 0);
            this.scene.viewport.moveCenter(
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
