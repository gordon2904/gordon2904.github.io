import {
    Assets,
    Point,
    Spritesheet,
    type IPointData,
    NineSlicePlane,
    Sprite,
    Ticker
} from 'pixi.js';
import type { Scene } from '../../components/scene';
import { lerp, pixiDelay } from '../../utils';
import { KeyboardInputManager } from '../../keyboard-input-manager';
import { RAPIER } from '../../rapier/rapier';
import {
    CoefficientCombineRule,
    Collider,
    type RigidBody,
    type World
} from '@dimforge/rapier2d';
import { SceneActor } from '../../components/scene-actor';
import {
    ColliderEventEmitter,
    registerCollider
} from '~/application/rapier/collision-events';

const yInputs = ['KeyW', 'KeyS'];
const xInputs = ['KeyA', 'KeyD'];
const directionalInputs = [...yInputs, ...xInputs];
const gravity = 4 * 9.81;
const mass = gravity * 2;

interface IDashSettings {
    power: number;
    time: number;
}

interface IMovementSettings {
    acceleration: number;
    maxSpeed: number;
    jumpPower: number;
    dash: IDashSettings;
    airDrag: number;
}

export class Fella extends SceneActor {
    private fellaSprite?: NineSlicePlane;

    private movementSettings: IMovementSettings = {
        acceleration: 30,
        maxSpeed: 6,
        airDrag: 15,
        dash: {
            power: 1200,
            time: 0.25
        },
        jumpPower: gravity * 35
    };

    private debugSprite: Sprite;
    private rigidBody: RigidBody;
    private colliders: Collider[] = [];
    private footCollider: Collider;

    private mIsGrounded: boolean = false;
    private get isGrounded() {
        return this.mIsGrounded;
    }
    private set isGrounded(value: boolean) {
        this.mIsGrounded = value;
        this.dashesUsed = 0;
        this.jumpsUsed = 0;
    }
    private dashesUsed: number = 0;
    private dashesAvailable: number = 1;
    private jumpsUsed: number = 0;
    private extraJumps: number = 1;
    private lastJump: number = Number.NEGATIVE_INFINITY;
    public get canJump() {
        return (
            (this.isGrounded || this.jumpsUsed < this.extraJumps) &&
            this.lastJump !== Ticker.shared.lastTime
        );
    }

    protected isDashing: boolean = false;
    private dashInterrupter?: (value: unknown) => void;

    public constructor(private sceneParent: Scene) {
        super();
        this.setParent(this.sceneParent.viewport);
        this.setupVisuals();
        this.setupPhysics(sceneParent.physicsWorld);
        this.setupInputListener();
    }

    private setupPhysics(world: World) {
        world.gravity.y = -gravity;
        this.rigidBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .lockRotations()
                .setTranslation(0.0, 0.0)
        );
        //work this out better as its allowing wall jumps occasionally
        this.footCollider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.45, 0.1)
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                .setTranslation(0.5, 0.1)
                .setMass(0)
                .setFriction(1)
                .setFrictionCombineRule(CoefficientCombineRule.Multiply),
            this.rigidBody
        );
        const footEmitter = new ColliderEventEmitter();
        footEmitter.on('onCollisionStart', () => {
            this.isGrounded = true;
        });
        footEmitter.on('onCollisionLeave', () => {
            this.isGrounded = false;
        });
        registerCollider(this.footCollider, footEmitter);

        this.colliders.push(
            //total body
            world.createCollider(
                RAPIER.ColliderDesc.cuboid(0.5, 1)
                    .setTranslation(0.5, 1)
                    .setMass(mass)
                    .setFriction(0)
                    .setFrictionCombineRule(CoefficientCombineRule.Min),
                this.rigidBody
            ),
            //feet?
            this.footCollider
        );
        // this.debugPhysicsGraphic();
    }

    private directionalKeysPressed: string[] = [];

    private setupInputListener() {
        KeyboardInputManager.instance.on('onKeyDown', (event) => {
            if (event.code === 'KeyW') {
                this.jump();
            }
            if (event.code === 'Space') {
                this.dash();
            }
            const match = directionalInputs.find(
                (input) => input === event.code
            );
            if (match) {
                this.directionalKeysPressed.push(event.code);
            }
        });
        KeyboardInputManager.instance.on('onKeyUp', (event) => {
            const foundIndex = this.directionalKeysPressed.findIndex(
                (input) => input === event.code
            );
            if (foundIndex > -1) {
                this.directionalKeysPressed.splice(foundIndex, 1);
            }
        });
    }

    private directionalInput: IPointData = { x: 0, y: 0 };

    private facing: number = 1;

    private lastInputs: Point = new Point(0, 0);
    private lastLocal: Point = new Point(0, 0);

    protected onPhysicsUpdate(t: number) {
        const nextLocal = this.sceneParent.viewport.toLocal(
            this.rigidBody.translation(),
            this.parent
        );
        const local = {
            x: lerp(this.lastLocal.x, nextLocal.x, t),
            y: lerp(this.lastLocal.y, nextLocal.y, t)
        };
        this.position.copyFrom(local);
    }

    protected onBeforePhysicsStep(world: World) {
        this.lastInputs.copyFrom(this.directionalInput);
        const worldTranslation = this.rigidBody.translation();
        const local = this.sceneParent.viewport.toLocal(
            worldTranslation,
            this.parent
        );
        this.lastLocal.copyFrom(local);
        this.handleHorizontalMovement(world);
    }

    private handleHorizontalMovement(world: World) {
        const signOfVelX = Math.sign(this.rigidBody.linvel().x);
        const signOfInputX = Math.sign(this.lastInputs.x);

        if (
            this.isDashing &&
            signOfVelX !== signOfInputX &&
            signOfInputX !== 0
        ) {
            this.interruptDash();
        }
        const { acceleration, maxSpeed } = this.movementSettings;

        if (!this.isDashing && this.lastInputs.x !== 0) {
            const velocity = this.rigidBody.linvel();

            if (Math.sign(velocity.x) !== Math.sign(this.lastInputs.x)) {
                velocity.x = 0;
            }

            if (
                Math.abs(velocity.x) >= maxSpeed &&
                Math.sign(velocity.x) === Math.sign(this.lastInputs.x)
            ) {
                return;
            }
            const velocityChange =
                acceleration * world.timestep * this.lastInputs.x;
            velocity.x += velocityChange;
            this.footCollider.setFriction(0);
            this.rigidBody.setLinvel(velocity, true);
            this.capMovementSpeed();
        } else if (!this.isGrounded && !this.isDashing) {
            this.reduceSpeed(world);
        } else {
            this.footCollider.setFriction(1);
        }
    }

    private reduceSpeed(world: World) {
        const { airDrag } = this.movementSettings;
        const velocity = this.rigidBody.linvel();
        const velocitySign = Math.sign(velocity.x);
        const velocityChange = airDrag * world.timestep;

        velocity.x = Math.abs(velocity.x) - velocityChange;
        if (velocity.x < 0) {
            velocity.x = 0;
        } else {
            velocity.x = velocitySign * velocity.x;
        }
        this.rigidBody.setLinvel(velocity, true);
    }

    private jump() {
        if (!this.canJump) {
            return;
        }
        ++this.jumpsUsed;
        const { jumpPower } = this.movementSettings;
        const vel = this.rigidBody.linvel();
        this.rigidBody.setLinvel({ x: vel.x, y: 0 }, true);
        this.rigidBody.applyImpulse({ x: 0, y: jumpPower }, true);
        this.interruptDash();
    }

    private async dash() {
        if (this.isDashing) {
            return;
        }
        if (this.dashesUsed >= this.dashesAvailable) {
            return;
        }
        if (!this.isGrounded) {
            ++this.dashesUsed;
        }
        this.isDashing = true;
        this.rigidBody.setGravityScale(0, true);
        const velX = this.rigidBody.linvel().x;
        this.rigidBody.setLinvel({ x: 0, y: 0 }, true);

        const { power: dashPower, time: dashTime } = this.movementSettings.dash;

        const signOfLastInput = Math.sign(this.lastInputs.x || velX) || 1;
        this.rigidBody.applyImpulse(
            { x: dashPower * signOfLastInput, y: 0 },
            true
        );
        const dashInterrupter = new Promise((resolve) => {
            this.dashInterrupter = resolve;
        });
        await Promise.race([pixiDelay(dashTime), dashInterrupter]);
        this.dashInterrupter = undefined;
        this.rigidBody.setGravityScale(1, true);
        this.capMovementSpeed();
        this.isDashing = false;
    }

    private capMovementSpeed() {
        const vel = this.rigidBody.linvel();
        vel.x =
            Math.sign(vel.x) *
            Math.min(Math.abs(vel.x), this.movementSettings.maxSpeed);
        this.rigidBody.setLinvel(vel, true);
    }

    private interruptDash() {
        if (this.dashInterrupter) {
            this.dashInterrupter(1);
        }
    }

    protected onAfterPhysicsStep(_world: World) {}

    protected onUpdate(_dt: number) {
        this.updateDirectionalInput();
    }

    private updateDirectionalInput() {
        const lastX = this.directionalKeysPressed.findLast((value) =>
            xInputs.includes(value)
        );
        switch (lastX) {
            case 'KeyA':
                this.directionalInput.x = -1;
                this.lastInputs.x = this.directionalInput.x;
                break;
            case 'KeyD':
                this.directionalInput.x = 1;
                this.lastInputs.x = this.directionalInput.x;
                break;
            default:
                this.directionalInput.x = 0;
                break;
        }

        const lastY = this.directionalKeysPressed.findLast((value) =>
            yInputs.includes(value)
        );
        switch (lastY) {
            case 'KeyW':
                this.directionalInput.y = 1;
                this.lastInputs.y = this.directionalInput.y;
                break;
            case 'KeyS':
                this.directionalInput.y = -1;
                this.lastInputs.y = this.directionalInput.y;
                break;
            default:
                this.directionalInput.y = 0;
                break;
        }
    }

    private async setupVisuals() {
        const record = await Assets.load(['sheets/ui']);
        const sheet = record['sheets/ui'] as Spritesheet;
        const nineSlice = {
            left: 12,
            top: 12,
            right: 12,
            bottom: 12
        };
        const texture = sheet.textures['panel/panel-003'];
        this.fellaSprite = new NineSlicePlane(
            texture,
            nineSlice.left,
            nineSlice.top,
            nineSlice.right,
            nineSlice.bottom
        );
        this.addChild(this.fellaSprite);

        this.fellaSprite.scale.set(1);
        this.fellaSprite.height = 2; // / this.fellaSprite.scale.y;
        this.fellaSprite.width = 1; // / this.fellaSprite.scale.x;
    }
}
