import { EventEmitter } from 'eventemitter3';
import { type IPointData, FederatedPointerEvent } from 'pixi.js';
import type { Scene } from './components/scene';

interface IPointerEvents {
    onPointerDown: (event: FederatedPointerEvent) => void;
    onPointerUp: (event: FederatedPointerEvent) => void;
}

export class PointerInputManager extends EventEmitter<IPointerEvents> {
    private pointerPositions: Map<number, IPointData> = new Map();

    private static mInstance: PointerInputManager;
    public static get instance() {
        if (!this.mInstance) {
            this.mInstance = new PointerInputManager();
        }
        return this.mInstance;
    }

    private constructor() {
        super();
    }

    private lastScene: Scene | undefined;

    public setActiveScene(scene: Scene | undefined) {
        this.clearPointerPositions();
        this.removeSceneEventListeners();
        if (scene) {
            this.lastScene = scene;
            scene.viewport.eventMode = 'dynamic';
            this.addSceneEventListeners(scene);
            console.log('added events');
        }
    }

    private clearPointerPositions() {
        this.pointerPositions.clear();
    }

    private removeSceneEventListeners() {
        if (!this.lastScene) {
            return;
        }
        this.lastScene.viewport.off('pointerdown', this.onPointerDown, this);
        this.lastScene.viewport.off('pointerup', this.onPointerUp, this);
    }

    private addSceneEventListeners(scene: Scene) {
        scene.viewport.on('pointerdown', this.onPointerDown, this);
        scene.viewport.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(event: FederatedPointerEvent) {
        console.log('pointer down: ', event);
        this.emit('onPointerDown', event);
    }

    private onPointerUp(event: FederatedPointerEvent) {
        console.log('pointer up: ', event);
        this.emit('onPointerUp', event);
    }

    public destroy() {
        this.removeSceneEventListeners();
    }
}
