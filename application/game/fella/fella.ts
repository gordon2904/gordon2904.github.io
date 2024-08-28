import {
    Point,
    Sprite,
    Ticker,
    Texture,
    Container,
    Graphics,
    ObservablePoint
} from 'pixi.js';
import type { Scene } from '../../components/scene';
import { lerp } from '../../utils';
import { KeyboardInputManager } from '../../keyboard-input-manager';
import {
    CoefficientCombineRule,
    Collider,
    ShapeType,
    type RigidBody,
    type World,
    Cuboid
} from '@dimforge/rapier2d';
import { SceneActor } from '~/application/components/scene-actor';
import {
    RAPIER,
    ColliderEventEmitter,
    registerCollider
} from '~/application/rapier';
import { FellaAnimatedSprite } from './animated-sprite';
import type { FellaState } from './state-machine';
import { PointerInputManager } from '~/application/pointer-input-manager';

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

//sort out fella spritesheets

export class Fella extends SceneActor {
    private animatedSprite: FellaAnimatedSprite = new FellaAnimatedSprite([
        Texture.EMPTY
    ]);
    public get animationStateMachine(): FellaAnimatedSprite['stateMachine'] {
        return this.animatedSprite.stateMachine;
    }

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

    private rigidBody: RigidBody;
    private colliders: Collider[] = [];
    private footCollider: Collider;

    private mIsGrounded: boolean = false;
    private get isGrounded() {
        return this.mIsGrounded;
    }
    private get isRolling() {
        return this.animationStateMachine.state === 'roll';
    }
    private set isGrounded(value: boolean) {
        this.mIsGrounded = value;
        this.dashesUsed = 0;
        this.jumpsUsed = 0;
        if (value) {
            this.onGrounded();
        }
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

    public constructor(private sceneParent: Scene) {
        super();
        this.directionalInput = new ObservablePoint(
            this.onDirectionalInputChange,
            this,
            0,
            0
        );
        this.setParent(this.sceneParent.viewport);
        this.setupPhysics(sceneParent.physicsWorld);
        this.setupVisuals();
        this.setupInputListener();
        this.setupAnimationListeners();
        this.listenForPointer();
    }

    private listenForPointer() {
        PointerInputManager.instance.on('onPointerDown', (event) => {
            this.animationStateMachine.attemptAttack1();
        });
    }

    private setupAnimationListeners() {
        this.animationStateMachine.on(
            'onRepeatState',
            this.onAnimationRepeatState.bind(this)
        );

        this.animationStateMachine.on(
            'onStateChange',
            this.onAnimationStateChange.bind(this)
        );

        this.animatedSprite.emitter.on(
            'onComplete',
            this.onAnimationComplete.bind(this)
        );
    }

    private setupPhysics(world: World) {
        world.gravity.y = -gravity;
        this.rigidBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .lockRotations()
                .setTranslation(0.0, 0.0)
                .setCcdEnabled(true)
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
        footEmitter.on('onCollisionStart', async () => {
            this.isGrounded = true;
        });
        footEmitter.on('onCollisionLeave', async () => {
            this.isGrounded = false;
        });
        registerCollider(this.footCollider, footEmitter);

        this.colliders.push(
            // total body
            world.createCollider(
                RAPIER.ColliderDesc.cuboid(0.5, 1)
                    .setTranslation(0.5, 1)
                    .setMass(mass)
                    .setFriction(0)
                    .setFrictionCombineRule(CoefficientCombineRule.Min),
                this.rigidBody
            ),
            // feet
            this.footCollider
        );
    }

    private directionalKeysPressed: string[] = [];

    private setupInputListener() {
        KeyboardInputManager.instance.on('onKeyDown', (event) => {
            if (event.code === 'KeyW') {
                this.jump();
            }
            if (event.code === 'Space') {
                this.roll();
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

    private directionalInput: Point;
    private lastInputs: Point = new Point(0, 0);
    private lastLocal: Point = new Point(0, 0);

    private onDirectionalInputChange() {
        this.goToClosestIdle();
    }

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
        const currentVelY = this.rigidBody.linvel().y;
        if (
            !this.isGrounded &&
            Math.abs(currentVelY) > Number.EPSILON &&
            Math.sign(currentVelY) === -1
        ) {
            this.animationStateMachine.attemptFall();
        }
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
            this.isRolling &&
            signOfVelX !== signOfInputX &&
            signOfInputX !== 0
        ) {
            this.onRollEnd();
        }
        const { acceleration, maxSpeed } = this.movementSettings;

        if (!this.isRolling && this.lastInputs.x !== 0) {
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
        } else if (!this.isGrounded && !this.isRolling) {
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
        this.animationStateMachine.attemptJump();
    }

    private onJumpState() {
        const { jumpPower } = this.movementSettings;
        const vel = this.rigidBody.linvel();
        this.rigidBody.setLinvel({ x: vel.x, y: 0 }, true);
        this.rigidBody.applyImpulse({ x: 0, y: jumpPower }, true);
    }

    private roll() {
        if (this.isRolling) {
            return;
        }
        if (this.dashesUsed >= this.dashesAvailable) {
            return;
        }
        this.animationStateMachine.attemptRoll();
    }

    private onRollState() {
        if (!this.isGrounded) {
            ++this.dashesUsed;
        }
        this.rigidBody.setGravityScale(0, true);
        const velX = this.rigidBody.linvel().x;
        this.rigidBody.setLinvel({ x: 0, y: 0 }, true);

        const { power: dashPower, time: dashTime } = this.movementSettings.dash;

        const signOfLastInput = Math.sign(this.lastInputs.x || velX) || 1;
        this.rigidBody.applyImpulse(
            { x: dashPower * signOfLastInput, y: 0 },
            true
        );
    }

    private onRollEnd() {
        this.rigidBody.setGravityScale(1, true);
        this.capMovementSpeed();
    }

    private capMovementSpeed() {
        const vel = this.rigidBody.linvel();
        vel.x =
            Math.sign(vel.x) *
            Math.min(Math.abs(vel.x), this.movementSettings.maxSpeed);
        this.rigidBody.setLinvel(vel, true);
    }

    protected onAfterPhysicsStep(_world: World) {}

    protected onUpdate(dt: number) {
        this.animatedSprite.update(dt);
        this.updateDirectionalInput();
    }

    private updateDirectionalInput() {
        const lastX = this.directionalKeysPressed.findLast((value) =>
            xInputs.includes(value)
        );
        switch (lastX) {
            case 'KeyA':
                this.directionalInput.x = -1;
                break;
            case 'KeyD':
                this.directionalInput.x = 1;
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
                break;
            case 'KeyS':
                this.directionalInput.y = -1;
                break;
            default:
                this.directionalInput.y = 0;
                break;
        }
    }

    private async setupVisuals() {
        this.colliders.forEach((collider) => {
            const colliderPosition = collider.translation();
            switch (collider.shape.type) {
                case ShapeType.Cuboid: {
                    const cuboid = collider.shape as Cuboid;
                    const cuboidGraphic = new Graphics();
                    cuboidGraphic.beginFill(0x00ff00, 0.5);
                    const { x: halfExtentX, y: halfExtentY } =
                        cuboid.halfExtents;
                    cuboidGraphic.drawRect(
                        -halfExtentX,
                        -halfExtentY,
                        halfExtentX * 2,
                        halfExtentY * 2
                    );
                    this.addChild(cuboidGraphic);
                    cuboidGraphic.position.set(
                        colliderPosition.x,
                        colliderPosition.y
                    );
                    cuboid.halfExtents;
                    break;
                }
            }
        });
        const debugSprite = new Sprite(Texture.WHITE);
        debugSprite.tint = 0x00ff00;
        debugSprite.alpha = 0.2;
        const spriteScaler = new Container();
        spriteScaler.x = 1;
        spriteScaler.scale.y = -1;
        this.addChild(spriteScaler);
        debugSprite.height = 2; // / this.fellaSprite.scale.y;
        debugSprite.width = 1; // / this.fellaSprite.scale.x;
        spriteScaler.addChild(this.animatedSprite);
        await this.animatedSprite.init();
    }

    private onAnimationRepeatState(state: FellaState) {
        switch (state) {
            case 'jump':
                this.onJumpState();
                break;
        }
    }

    private onAnimationStateChange(from: FellaState, to: FellaState) {
        // tidy up any of the froms
        switch (from) {
            case 'roll':
                this.onRollEnd();
        }

        //sort out the tos
        switch (to) {
            case 'jump':
                this.onJumpState();
                break;
            case 'roll':
                this.onRollState();
        }
    }

    private onAnimationComplete(timeElapsed: number) {
        switch (this.animationStateMachine.state) {
            //uninterruptables
            case 'attack-1':
            case 'attack-2':
            case 'attack-3':
                break;
            case 'roll':
                this.onRollEnd();
                this.goToClosestIdle();
                break;
            default:
                break;
        }

        //elapse by the time difference since last animation complete
        if (this.animatedSprite.isPlaying) {
            this.animatedSprite.update(timeElapsed);
        }
    }

    private goToClosestIdle() {
        if (!this.animatedSprite.loop && this.animatedSprite.isPlaying) {
            return;
        }
        if (this.isGrounded) {
            this.onGrounded();
        } else {
            this.animationStateMachine.attemptFall();
        }
    }

    private onGrounded() {
        if (this.directionalInput.x !== 0) {
            this.animationStateMachine.attemptRun();
        } else {
            this.animationStateMachine.attemptIdle();
        }
    }

    // private onInputChanged() {
    //     // we in air
    //     if (!this.isGrounded) {
    //         return;
    //     }

    //     if (this.animationStateMachine.state)
    //         if (this.lastInputs.x !== 0) {
    //             this.animationStateMachine.attemptRun();
    //         } else {
    //             this.animationStateMachine.attemptIdle();
    //         }
    // }
}
