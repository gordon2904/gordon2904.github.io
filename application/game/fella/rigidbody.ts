import {
    CoefficientCombineRule,
    Collider,
    RigidBody,
    World,
    type Vector
} from '@dimforge/rapier2d';
import {
    ColliderEventEmitter,
    RAPIER,
    registerCollider
} from '~/application/rapier';
import type { Fella } from '.';
import { Point } from 'pixi.js';
import EventEmitter from 'eventemitter3';

interface IFellaRigidBodyEvents {
    onEnterGrounded: () => void;
    onLeaveGrounded: () => void;
}

export class FellaRigidBody extends EventEmitter<IFellaRigidBodyEvents> {
    public readonly HALF_EXTENTS = { x: 0.58, y: 1 } as const;

    private defaultMass: number;

    public maxMoveSpeed: Point = new Point(0, 0);

    private mGroundCount: number = 0;
    private get groundCount() {
        return this.mGroundCount;
    }
    private set groundCount(value: number) {
        this.mGroundCount = value;
        this.isGrounded = this.groundCount > 0;
    }

    private mIsGrounded: boolean = false;
    public get isGrounded() {
        return this.mIsGrounded;
    }
    private set isGrounded(value: boolean) {
        if (this.mIsGrounded === value) {
            return;
        }
        this.mIsGrounded = value;
        if (value) {
            this.emit('onEnterGrounded');
        } else {
            this.emit('onLeaveGrounded');
        }
    }

    private footEmitter: ColliderEventEmitter = new ColliderEventEmitter();

    public readonly rigidBody: RigidBody;
    private footCollider: Collider;
    public readonly colliders: Collider[] = [];
    public constructor(
        private fella: Fella,
        private physicsWorld: World
    ) {
        super();
        this.rigidBody = physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .lockRotations()
                .setTranslation(this.fella.x, this.fella.y)
                .setCcdEnabled(true)
        );
        this.rigidBody.setTranslation({ x: 2, y: 3 }, true);
        this.defaultMass = Math.abs(physicsWorld.gravity.y) * 2;
        this.setupHitboxes();
    }

    private setupHitboxes() {
        //work this out better as its allowing wall jumps occasionally
        this.footCollider = this.physicsWorld.createCollider(
            RAPIER.ColliderDesc.cuboid(
                this.HALF_EXTENTS.x * 0.9,
                this.HALF_EXTENTS.y * 0.1
            )
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                .setTranslation(this.HALF_EXTENTS.x, this.HALF_EXTENTS.y * 0.1)
                .setMass(0)
                .setFriction(1)
                .setFrictionCombineRule(CoefficientCombineRule.Multiply),
            this.rigidBody
        );
        registerCollider(this.footCollider, this.footEmitter);
        this.footEmitter.on('onCollisionStart', () => ++this.groundCount);
        this.footEmitter.on('onCollisionLeave', () => --this.groundCount);

        this.colliders.push(
            // total body
            this.physicsWorld.createCollider(
                RAPIER.ColliderDesc.cuboid(
                    this.HALF_EXTENTS.x,
                    this.HALF_EXTENTS.y
                )
                    .setTranslation(this.HALF_EXTENTS.x, this.HALF_EXTENTS.y)
                    .setMass(this.defaultMass)
                    .setFriction(0)
                    .setFrictionCombineRule(CoefficientCombineRule.Min),
                this.rigidBody
            ),
            // feet
            this.footCollider
        );
    }

    public setTranslation(translation: Vector) {
        this.rigidBody.setTranslation(translation, true);
    }

    public setVelocity(velocity: Vector) {
        this.rigidBody.setLinvel(velocity, true);
    }

    public get translation() {
        return this.rigidBody.translation();
    }

    public get velocity() {
        return this.rigidBody.linvel();
    }

    public setGravityScale(scaleFactor: number, wakeUp: boolean = true) {
        this.rigidBody.setGravityScale(scaleFactor, wakeUp);
    }

    public capMovement(speed: number, axis: 'x' | 'y') {
        const vel = this.rigidBody.linvel();
        vel[axis] = Math.sign(vel[axis]) * Math.min(speed, Math.abs(vel[axis]));
        this.rigidBody.setLinvel(vel, true);
    }

    public applyImpulse(impulse: Vector) {
        this.rigidBody.applyImpulse(impulse, true);
    }

    public set footFriction(value: boolean) {
        this.footCollider.setFriction(value ? 1 : 0);
    }
}
