import { Viewport } from 'pixi-viewport';
import {
    Sprite,
    Texture,
    type IPointData,
    EventSystem,
    ObservablePoint,
    Container
} from 'pixi.js';
import { CameraSystem } from './camera-system/camera-system';

interface ISceneOptions {
    cameraSize: IPointData;
    screenSize: IPointData;
    worldSize: IPointData;
    events: EventSystem;
    alignment?: IPointData;
}

export type CameraFit = 'Fixed' | 'ScaleWidth' | 'ScaleHeight' | 'ScaleAll';

export class Scene extends Container {
    public readonly viewport: Viewport;
    protected cameraIsDirty: boolean = true;
    protected cameraPositionIsDirty: boolean = true;

    protected mMinAspect?: number;
    protected mMaxAspect?: number;

    public readonly cameraSystem: CameraSystem;

    public get minAspect() {
        return this.mMinAspect;
    }
    public set minAspect(value: number | undefined) {
        if (this.mMinAspect !== value) {
            this.mMinAspect = value;
            this.markCameraAsDirty();
        }
    }
    public get maxAspect() {
        return this.mMaxAspect;
    }
    public set maxAspect(value: number | undefined) {
        if (this.mMaxAspect !== value) {
            this.mMaxAspect = value;
            this.markCameraAsDirty();
        }
    }

    protected mCameraFit: CameraFit = 'Fixed';
    public set cameraFit(value: CameraFit) {
        if (value !== this.cameraFit) {
            this.mCameraFit = value;
            this.markCameraAsDirty();
        }
    }
    public get cameraFit(): CameraFit {
        return this.mCameraFit;
    }

    public readonly cameraSize: ObservablePoint<Scene>;
    public readonly screenSize: ObservablePoint<Scene>;
    public readonly alignment: ObservablePoint<Scene>;
    protected sceneMask: Sprite;

    public constructor(options: ISceneOptions) {
        super();
        this.cameraSystem = new CameraSystem(this);
        this.sortableChildren = true;
        this.viewport = new Viewport({
            events: options.events,
            screenWidth: options.cameraSize.x,
            screenHeight: options.cameraSize.y,
            worldWidth: options.worldSize.x,
            worldHeight: options.worldSize.y
        });
        this.viewport.setParent(this);
        this.sceneMask = new Sprite(Texture.WHITE);
        this.sceneMask.setParent(this);
        this.disableSceneMask();
        this.cameraSize = new ObservablePoint<Scene>(
            this.markCameraAsDirty,
            this,
            options.cameraSize.x,
            options.cameraSize.y
        );
        this.screenSize = new ObservablePoint<Scene>(
            this.markCameraAsDirty,
            this,
            options.screenSize.x,
            options.screenSize.y
        );
        this.alignment = new ObservablePoint<Scene>(
            this.markCameraAsDirty,
            this,
            options.alignment?.x ?? 0.5,
            options.alignment?.y ?? 0.5
        );
        this.on('update', this.onUpdate, this);
        this.on('lateUpdate', this.onLateUpdate, this);
    }

    public enableSceneMask() {
        this.sceneMask.visible = true;
        this.viewport.mask = this.sceneMask;
    }

    public disableSceneMask() {
        this.sceneMask.visible = false;
        this.viewport.mask = null;
    }

    protected markCameraPositionAsDirty() {
        this.cameraPositionIsDirty = true;
    }

    protected markCameraAsDirty() {
        this.cameraIsDirty = true;
    }

    protected onLateUpdate(dt: number) {
        this.cameraSystem.lateUpdate(dt);
    }

    protected onUpdate(dt: number) {
        this.checkIsDirtyAndRebuild();
    }

    protected checkIsDirtyAndRebuild() {
        if (this.cameraIsDirty) {
            this.rebuildScene();
        } else if (this.cameraPositionIsDirty) {
            this.rebuildScenePosition();
        }
    }

    protected rebuildScene() {
        const screenAspect = this.screenSize.x / this.screenSize.y;
        const cameraAspect = this.cameraSize.x / this.cameraSize.y;
        switch (this.cameraFit) {
            case 'Fixed':
                this.viewport.screenWidth = this.cameraSize.x;
                this.viewport.screenHeight = this.cameraSize.y;
                break;
            case 'ScaleAll':
                if (screenAspect > cameraAspect) {
                    this.viewport.screenHeight = this.cameraSize.y;
                    this.viewport.screenWidth =
                        this.cameraSize.y * screenAspect;
                } else {
                    this.viewport.screenWidth = this.cameraSize.x;
                    this.viewport.screenHeight =
                        this.cameraSize.x / screenAspect;
                }
                break;
            case 'ScaleWidth':
                this.viewport.screenHeight = this.cameraSize.y;
                this.viewport.screenWidth =
                    screenAspect > cameraAspect
                        ? this.cameraSize.y * screenAspect
                        : this.cameraSize.x;
                break;
            case 'ScaleHeight':
                this.viewport.screenWidth = this.cameraSize.x;
                this.viewport.screenHeight =
                    screenAspect < cameraAspect
                        ? this.cameraSize.x / screenAspect
                        : this.cameraSize.y;
                break;
        }
        const currentAspect =
            this.viewport.screenWidth / this.viewport.screenHeight;
        const minAspect = this.mMinAspect !== undefined ? this.mMinAspect : 0;
        const maxAspect =
            this.mMaxAspect !== undefined
                ? this.mMaxAspect
                : Number.POSITIVE_INFINITY;
        const clampedAspect = Math.max(
            minAspect,
            Math.min(currentAspect, maxAspect)
        );
        if (clampedAspect > 1) {
            this.viewport.screenWidth =
                this.viewport.screenHeight * clampedAspect;
        } else {
            this.viewport.screenHeight =
                this.viewport.screenWidth / clampedAspect;
        }
        this.calculateSceneScaling();
        this.rebuildScenePosition();
        this.cameraIsDirty = false;
    }

    protected rebuildScenePosition() {
        const xDiff =
            this.screenSize.x - this.viewport.screenWidth * this.scale.x;
        const yDiff =
            this.screenSize.y - this.viewport.screenHeight * this.scale.y;
        this.position.set(xDiff * this.alignment.x, yDiff * this.alignment.y);
        this.cameraPositionIsDirty = false;
    }

    protected calculateSceneScaling() {
        const xScale = this.screenSize.x / this.viewport.screenWidth;
        const yScale = this.screenSize.y / this.viewport.screenHeight;
        const containScale = Math.min(xScale, yScale);
        this.scale.set(containScale, containScale);
        this.sceneMask.width = this.viewport.screenWidth;
        this.sceneMask.height = this.viewport.screenHeight;
    }
}
