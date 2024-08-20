export enum EColliderLayer {
    Default = 0x0001,
    Player = 0x0002,
    Enemy = 0x0004,
    Test = 0x0008,
    Layer5 = 0x0010,
    Layer6 = 0x0020,
    Layer7 = 0x0040,
    Layer8 = 0x0080,
    Layer9 = 0x0100,
    Layer10 = 0x0200,
    Layer11 = 0x0400,
    Layer12 = 0x0800,
    Layer13 = 0x1000,
    Layer14 = 0x2000,
    Layer15 = 0x4000,
    Layer16 = 0x8000
}

const MAX_MASK = 0xffff;

export function constructCollisionLayer(...layers: EColliderLayer[]) {
    //ensures the final value is definitely a 16-bit collision mask
    return layers.reduce((prev, curr) => prev | curr, 0) & MAX_MASK;
}

export function constructCollisionGroup(self: number, other: number) {
    return ((other & MAX_MASK) << 16) | (self & MAX_MASK);
}
