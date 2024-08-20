import RAPIERType from '@dimforge/rapier2d';

export let RAPIER: typeof RAPIERType;

export async function InitRapier() {
    RAPIER = await import('@dimforge/rapier2d');
}
