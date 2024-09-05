import { Cuboid, ShapeType, type World } from '@dimforge/rapier2d';
import { Container, Graphics, ObservablePoint, Point, Ticker } from 'pixi.js';
import { SceneActor } from '~/application/components/scene-actor';
import { PointerInputManager } from '~/application/pointer-input-manager';
import type { Scene } from '../../components/scene';
import { KeyboardInputManager } from '../../keyboard-input-manager';
import { getRandomRange, lerp } from '../../utils';
import { FellaAnimatedSprite } from './animated-sprite';
import { FellaRigidBody } from './rigidbody';
import type { FellaState } from './state-machine';

const yInputs = ['KeyW', 'KeyS'];
const xInputs = ['KeyA', 'KeyD'];
const directionalInputs = [...yInputs, ...xInputs];

interface IMovementSettings {
    acceleration: number;
    maxSpeed: number;
    jumpPower: number;
    dashPower: number;
    airDrag: number;
}

export class Fella extends SceneActor {
    private animatedSprite: FellaAnimatedSprite = new FellaAnimatedSprite();
    public get animationStateMachine(): FellaAnimatedSprite['stateMachine'] {
        return this.animatedSprite.stateMachine;
    }

    private movementSettings: IMovementSettings = {
        acceleration: 30,
        maxSpeed: 6,
        airDrag: 15,
        dashPower: 1200,
        jumpPower: 35
    };

    public get facingDirection() {
        return this.visualsParent.scale.x;
    }

    private visualsParent: Container = new Container();
    private visuals: Container = new Container();
    private rigidBody: FellaRigidBody;

    private get isRolling() {
        return this.animationStateMachine.state === 'roll';
    }

    private dashesUsed: number = 0;
    private dashesAvailable: number = 1;
    private jumpsUsed: number = 0;
    private extraJumps: number = 1;
    private lastJump: number = Number.NEGATIVE_INFINITY;
    public get canJump() {
        return (
            (this.rigidBody.isGrounded || this.jumpsUsed < this.extraJumps) &&
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
        this.rigidBody = new FellaRigidBody(
            this,
            this.sceneParent.physicsWorld
        );
        this.setupVisuals();
        this.setupInputListener();
        this.setupAnimationListeners();
        this.listenForPointer();
        this.setupPhysicsListeners();
        this.setInitialLocal();
    }

    private setInitialLocal() {
        this.sceneParent.viewport.toLocal(
            this.rigidBody.translation,
            this.parent,
            this.lastLocal
        );
    }

    private listenForPointer() {
        PointerInputManager.instance.on('onPointerDown', () => {
            const random = getRandomRange(1, 3, true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.animationStateMachine as any)[`attemptAttack${random}`]();
        });
    }

    private onGroundedStateChange() {
        this.jumpsUsed = 0;
        this.dashesUsed = 0;
        if (this.rigidBody.isGrounded) {
            this.onGrounded();
        }
    }

    private setupPhysicsListeners() {
        this.rigidBody.on('onEnterGrounded', this.onGroundedStateChange, this);
        this.rigidBody.on('onLeaveGrounded', this.onGroundedStateChange, this);
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
            this.rigidBody.translation,
            this.parent
        );
        const local = {
            x: lerp(this.lastLocal.x, nextLocal.x, t),
            y: lerp(this.lastLocal.y, nextLocal.y, t)
        };
        this.position.copyFrom(local);
        const velocity = this.rigidBody.velocity;
        if (
            !this.rigidBody.isGrounded &&
            Math.abs(velocity.y) > Number.EPSILON &&
            Math.sign(velocity.y) === -1
        ) {
            this.animationStateMachine.attemptFall();
        }
    }

    protected onBeforePhysicsStep(world: World) {
        const immovableStates: FellaState[] = [
            'attack-1',
            'attack-2',
            'attack-3',
            'block',
            'block-idle',
            'death',
            'ledge-grab',
            'hurt'
        ];
        this.lastInputs.copyFrom(this.directionalInput);
        if (immovableStates.includes(this.animationStateMachine.state)) {
            this.lastInputs.x = 0;
        }
        this.visualsParent.scale.x =
            this.lastInputs.x === 0
                ? this.visualsParent.scale.x
                : this.lastInputs.x;
        const worldTranslation = this.rigidBody.translation;
        const local = this.sceneParent.viewport.toLocal(
            worldTranslation,
            this.parent
        );
        this.lastLocal.copyFrom(local);
        this.handleHorizontalMovement(world);
    }

    private handleHorizontalMovement(world: World) {
        const signOfVelX = Math.sign(this.rigidBody.velocity.x);
        const signOfInputX = Math.sign(this.lastInputs.x);

        if (
            this.isRolling &&
            signOfVelX !== signOfInputX &&
            signOfInputX !== 0
        ) {
            this.onRollEnd();
        }
        const { acceleration, maxSpeed } = this.movementSettings;

        if (this.lastInputs.x !== 0) {
            const { velocity } = this.rigidBody;

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
            this.rigidBody.footFriction = false;
            this.rigidBody.setVelocity(velocity);
            this.rigidBody.capMovement(this.movementSettings.maxSpeed, 'x');
        } else if (!this.rigidBody.isGrounded && !this.isRolling) {
            this.reduceSpeed(world);
        } else {
            this.rigidBody.footFriction = true;
        }
    }

    private reduceSpeed(world: World) {
        const { airDrag } = this.movementSettings;
        const { velocity } = this.rigidBody;
        const velocitySign = Math.sign(velocity.x);
        const velocityChange = airDrag * world.timestep;

        velocity.x = Math.abs(velocity.x) - velocityChange;
        if (velocity.x < 0) {
            velocity.x = 0;
        } else {
            velocity.x = velocitySign * velocity.x;
        }
        this.rigidBody.setVelocity(velocity);
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
        const { velocity } = this.rigidBody;
        this.rigidBody.setVelocity({ x: velocity.x, y: 0 });
        const { gravity } = this.sceneParent.physicsWorld;
        this.rigidBody.applyImpulse({
            x: 0,
            y: jumpPower * Math.abs(gravity.y)
        });
    }

    private roll() {
        // if (!this.rigidBody.isGrounded) {
        //     return;
        // }
        if (this.isRolling) {
            return;
        }
        if (this.dashesUsed >= this.dashesAvailable) {
            return;
        }
        this.animationStateMachine.attemptRoll();
    }

    private onRollState() {
        if (!this.rigidBody.isGrounded) {
            ++this.dashesUsed;
        }
        this.rigidBody.setGravityScale(0);
        const velX = this.rigidBody.velocity.x;
        this.rigidBody.setVelocity({ x: 0, y: 0 });

        const { dashPower } = this.movementSettings;

        const signOfLastInput =
            Math.sign(this.lastInputs.x || velX) || this.facingDirection;
        this.rigidBody.applyImpulse({ x: dashPower * signOfLastInput, y: 0 });
    }

    private onRollEnd() {
        this.rigidBody.setGravityScale(1, true);
        this.rigidBody.capMovement(this.movementSettings.maxSpeed, 'x');
        this.animatedSprite.stop();
        this.goToClosestIdle();
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
        this.addChild(this.visualsParent);
        this.visualsParent.addChild(this.visuals);
        this.createDebugColliders();
        const spriteScaler = new Container();
        spriteScaler.scale.y = -1;
        this.visuals.addChild(spriteScaler);
        this.visualsParent.x = this.rigidBody.HALF_EXTENTS.x;
        this.visuals.x = -this.visualsParent.x;
        spriteScaler.addChild(this.animatedSprite);
        await this.animatedSprite.init();
    }

    private createDebugColliders() {
        this.rigidBody.colliders.forEach((collider, i) => {
            // const colliderPosition = collider.translation();
            switch (collider.shape.type) {
                case ShapeType.Cuboid: {
                    const cuboid = collider.shape as Cuboid;
                    const cuboidGraphic = new Graphics();
                    cuboidGraphic.beginFill(i === 0 ? 0x00ff00 : 0xff0000, 0.5);
                    const { x: halfExtentX, y: halfExtentY } =
                        cuboid.halfExtents;
                    cuboidGraphic.drawRect(
                        0,
                        0,
                        halfExtentX * 2,
                        halfExtentY * 2
                    );
                    this.visuals.addChild(cuboidGraphic);
                    cuboidGraphic.position.set(0, 0);
                    cuboid.halfExtents;
                    break;
                }
            }
        });
    }

    private onAnimationRepeatState(state: FellaState) {
        switch (state) {
            case 'jump':
                this.onJumpState();
                this.animatedSprite.gotoAndPlay(0);
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
                this.goToClosestIdle();
                break;
            case 'roll':
                this.onRollEnd();
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
        if (this.rigidBody.isGrounded) {
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
}
