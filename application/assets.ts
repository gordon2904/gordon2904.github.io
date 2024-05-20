import { type UnresolvedAsset } from 'pixi.js';

const SPRITE_SHEETS = ['sheets/ui'] as const;
type GameSpriteSheet = (typeof SPRITE_SHEETS)[number];

export const assetConfig = {
    sheets: [
        {
            alias: 'sheets/ui',
            src: '/assets/spritesheets/ui.json'
        } as UnresolvedAsset
    ]
} as const;
