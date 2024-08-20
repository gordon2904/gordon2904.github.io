import type { Collider } from '@dimforge/rapier2d';
import EventEmitter from 'eventemitter3';

interface IColliderEvents {
    //triggers when it occurs
    onCollisionStart: (handle: number) => void;
    onCollisionLeave: (handle: number) => void;
    //triggers every frame
    onIntersect: (handle: number) => void;
}

export class ColliderEventEmitter extends EventEmitter<IColliderEvents> {}

const COLLIDER_TYPES = ['floor', 'foot'] as const;

export type ColliderType = (typeof COLLIDER_TYPES)[number];

interface IColliderInfo {
    emitter: ColliderEventEmitter;
    collider: Collider;
}

const colliderInfoMap = new Map<number, IColliderInfo>();

export function registerCollider(
    collider: Collider,
    emitter: ColliderEventEmitter
) {
    colliderInfoMap.set(collider.handle, {
        collider,
        emitter
    });
}

export function getColliderInfo(handle: number) {
    if (colliderInfoMap.has(handle)) {
        return colliderInfoMap.get(handle);
    }
    return undefined;
}
