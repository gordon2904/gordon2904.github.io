import { Assets, Container, SCALE_MODES, Sprite, Spritesheet } from 'pixi.js';
import type { Scene } from '~/application/components/scene';
import { ParallaxSprite } from './parallax-sprite';

export class ParallaxBackground extends Container {
    private sprites: Sprite[] = [];
    private parallaxSprites: ParallaxSprite[] = [];

    public constructor(private scene: Scene) {
        super();
        this.setupSprites();
        this.on('sceneRebuilt', this.onSceneRebuilt, this);
        this.on('lateUpdate', this.onLateUpdate, this);
    }

    private async setupSprites() {
        // const testBackground = new Sprite(Texture.WHITE);
        // testBackground.tint = 0x335533;
        // this.addChild(testBackground);
        // this.sprites.push(testBackground);
        this.setupEnvironmentLayers();
    }

    private async setupEnvironmentLayers() {
        const environmentRecord = await Assets.load(['sheets/environment']);
        const environmentSheet = environmentRecord[
            'sheets/environment'
        ] as Spritesheet;
        environmentSheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;

        for (let i = 0; i < 3; ++i) {
            const layer = i + 1;
            const scalingMulti = i;
            const texture =
                environmentSheet.textures[`environment/layer-${layer}`];
            const sprite = new ParallaxSprite(texture);
            sprite.scaling.x = scalingMulti * (1 / 2);
            sprite.scaling.y = 0;
            scalingMulti * (1 / 2);
            this.addChild(sprite);
            this.parallaxSprites.push(sprite);
        }
    }

    private onSceneRebuilt() {
        this.sprites.forEach((sprite) => {
            sprite.width = this.scene.cameraSize.x;
            sprite.height = this.scene.cameraSize.y;
        });
        this.parallaxSprites.forEach((sprite) => {
            sprite.width = this.scene.cameraSize.x;
            sprite.height = this.scene.cameraSize.y;
            sprite.tileScale.x = this.scene.cameraSize.x / sprite.texture.width;
            sprite.tileScale.y =
                this.scene.cameraSize.y / sprite.texture.height;
            // sprite.texture.height /
            // (this.scene.viewport.worldHeight * sprite.scaling.y);
            console.log('scale: ', sprite.tileScale.x);
        });
    }

    private onLateUpdate() {
        this.parallaxSprites.forEach((sprite) => {
            sprite.tilePosition.x = this.scene.viewport.x * sprite.scaling.x;
            sprite.tilePosition.y =
                (this.scene.viewport.y - this.scene.cameraSize.y) *
                sprite.scaling.y;
        });
    }
}
