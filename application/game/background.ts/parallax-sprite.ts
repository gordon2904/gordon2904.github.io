import { Texture, TilingSprite, type IPointData } from 'pixi.js';

export class ParallaxSprite extends TilingSprite {
    public scaling: IPointData;

    public constructor(texture: Texture = Texture.EMPTY) {
        super(texture);
        this.scaling = { x: 1, y: 0 };
    }
}
