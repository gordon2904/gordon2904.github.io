import { type UnresolvedAsset } from 'pixi.js';

const SPRITE_SHEETS = [
    'sheets/ui',
    'sheets/player',
    'sheets/environment'
] as const;
export type GameSpriteSheet = (typeof SPRITE_SHEETS)[number];

export const assetConfig = {
    sheets: [
        {
            alias: 'sheets/ui',
            src: '/assets/spritesheets/ui.json'
        } as UnresolvedAsset<GameSpriteSheet>,
        {
            alias: 'sheets/player',
            src: '/assets/spritesheets/player.json'
        } as UnresolvedAsset<GameSpriteSheet>,
        {
            alias: 'sheets/environment',
            src: '/assets/spritesheets/environment.json'
        } as UnresolvedAsset<GameSpriteSheet>
    ]
} as const;
