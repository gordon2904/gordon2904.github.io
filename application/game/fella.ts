import {
    Assets,
    Color,
    Container,
    ObservablePoint,
    Point,
    Sprite,
    Spritesheet
} from 'pixi.js';
import type { Scene } from '../components/scene';
import RAPIER from '@dimforge/rapier2d';
import { getRandomRange, getRandomValue } from '../utils';

export class Fella extends Container {
    private fellaSprite?: Sprite;

    private flip: boolean = false;
    private direction!: ObservablePoint;
    private speed!: Point;

    public constructor(private sceneParent: Scene) {
        super();
        this.setParent(this.sceneParent.viewport);
        this.setupVisuals();
        this.setupPoints();
        this.on('update', this.onUpdate, this);
        const { worldWidth, worldHeight } = this.sceneParent.viewport;
        this.position.x = getRandomRange(0, worldWidth);
        this.position.y = getRandomRange(0, worldHeight);
        // this.rapierTest();
    }

    // private rapierWorld: RAPIER.World;
    // private rigidBody: RAPIER.RigidBody;

    // private rapierTest() {
    //     // Use the RAPIER module here.
    //     let gravity = { x: 0.0, y: 9.81 };
    //     this.rapierWorld = new RAPIER.World(gravity);
    //     this.rapierWorld.timestep = 1 / 60;
    //     // Create the ground
    //     let groundColliderDesc = RAPIER.ColliderDesc.cuboid(
    //         this.sceneParent.viewport.worldWidth * 0.5,
    //         0.1
    //     );
    //     const groundCollider =
    //         this.rapierWorld.createCollider(groundColliderDesc);
    //     groundCollider.setTranslation({
    //         x: this.sceneParent.viewport.worldWidth * 0.5,
    //         y: this.sceneParent.viewport.worldHeight + 0.05
    //     });

    //     // Create the ground
    //     let t = RAPIER.ColliderDesc.cuboid(
    //         this.sceneParent.viewport.worldWidth * 0.25,
    //         0.1
    //     );
    //     const gc = this.rapierWorld.createCollider(groundColliderDesc);
    //     gc.setTranslation({
    //         x: this.sceneParent.viewport.worldWidth * 0.25,
    //         y: this.sceneParent.viewport.worldHeight * 0.5 + 0.05
    //     });

    //     // Create a dynamic rigid-body.
    //     let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    //     this.rigidBody = this.rapierWorld.createRigidBody(rigidBodyDesc);
    //     let colliderDesc = RAPIER.ColliderDesc.cuboid(5, 5)
    //         .setTranslation(0, 5)
    //         .setMass(1)
    //         .setFriction(0.5);
    //     let collider = this.rapierWorld.createCollider(
    //         colliderDesc,
    //         this.rigidBody
    //     );
    // }

    private total: number = 0;

    private onUpdate(dt: number) {
        this.move(dt);
        this.checkBounds();
    }

    private move(dt: number) {
        this.position.x += dt * this.speed.x * this.direction.x;
        this.position.y += dt * this.speed.y * this.direction.y;
    }

    private checkBounds() {
        const funkyFellaLeft = this.position.x;
        const funkyFellaRight = funkyFellaLeft + (this.fellaSprite?.width ?? 0);
        const funkyFellaTop = this.position.y;
        const funkyFellaBottom =
            funkyFellaTop + (this.fellaSprite?.height ?? 0);
        const { worldWidth, worldHeight } = this.sceneParent.viewport;

        if (funkyFellaBottom > worldHeight && this.direction.y === 1) {
            this.direction.y = -1;
            this.speed.y = this.generateRandomSpeed();
        } else if (funkyFellaTop < 0 && this.direction.y === -1) {
            this.direction.y = 1;
            this.speed.y = this.generateRandomSpeed();
        }
        if (funkyFellaLeft < 0 && this.direction.x === -1) {
            this.direction.x = 1;
            this.speed.x = this.generateRandomSpeed();
        } else if (funkyFellaRight > worldWidth && this.direction.x === 1) {
            this.direction.x = -1;
            this.speed.x = this.generateRandomSpeed();
        }
        this.position.x = Math.max(0, Math.min(this.position.x, worldWidth));
        this.position.y = Math.max(0, Math.min(this.position.y, worldHeight));
    }

    private setupPoints() {
        this.direction = new ObservablePoint(
            this.directionChanged,
            this,
            getRandomValue(-1, 1),
            getRandomValue(-1, 1)
        );
        this.speed = new Point(
            this.generateRandomSpeed(),
            this.generateRandomSpeed()
        );
    }

    private async setupVisuals() {
        const record = await Assets.load(['sheets/ui']);
        const sheet = record['sheets/ui'] as Spritesheet;
        const texture = sheet.textures['panel-003'];
        this.fellaSprite = new Sprite(texture);
        this.addChild(this.fellaSprite);

        this.fellaSprite.width = 10;
        this.fellaSprite.scale.y = this.fellaSprite.scale.x;
    }

    private directionChanged() {
        this.generateRandomSpeed();
        const randomColor = Color.shared
            .setValue([Math.random(), Math.random(), Math.random()])
            .toNumber();
        if (this.fellaSprite) {
            this.fellaSprite.tint = randomColor;
        }
    }

    private generateRandomSpeed() {
        return getRandomRange(20, 30);
    }
}
