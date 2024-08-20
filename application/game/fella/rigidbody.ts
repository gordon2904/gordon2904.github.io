import { RigidBody } from '@dimforge/rapier2d';
import type { Fella } from '.';

export class FellaPhysics {
    public readonly rigidBody: RigidBody;
    public constructor(private fella: Fella) {}
}
