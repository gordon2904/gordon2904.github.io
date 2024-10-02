import { Power2 } from 'gsap';
import { Assets, Container, SCALE_MODES, Spritesheet } from 'pixi.js';
import type { Scene } from '~/application/components/scene';
import { ParallaxSprite } from './parallax-sprite';

export class ParallaxBackground extends Container {
    private parallaxSprites: ParallaxSprite[] = [];

    public constructor(private scene: Scene) {
        super();
        this.setParent(this.scene.viewport);
        this.setupSprites();
        this.on('sceneRebuilt', this.onSceneRebuilt, this);
        this.on('lateUpdate', this.onLateUpdate, this);
    }

    private async setupSprites() {
        this.setupEnvironmentLayers();
    }

    private async setupEnvironmentLayers() {
        const environmentRecord = await Assets.load(['sheets/environment']);
        const environmentSheet = environmentRecord[
            'sheets/environment'
        ] as Spritesheet;
        environmentSheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        const scaleFactor = -1;
        const layerCount = 3;
        const multiple = 1 / layerCount;
        for (let i = 0; i < layerCount; ++i) {
            const layer = i + 1;
            const texture =
                environmentSheet.textures[`environment/layer-${layer}`];
            const sprite = new ParallaxSprite(texture);
            const t = (i + 1) * multiple;
            console.log('t: ', t);
            sprite.scaling.x =
                i === 2 ? 0 : Power2.easeInOut(1 - t) * scaleFactor;

            console.log('scaling: ', sprite.scaling.x);
            sprite.scaling.y = 0;
            this.addChild(sprite);
            this.parallaxSprites.push(sprite);
        }
    }

    private onSceneRebuilt() {
        const backgroundScale = 1.25;
        this.parallaxSprites.forEach((sprite) => {
            sprite.width = this.scene.viewport.worldWidth;
            sprite.height = backgroundScale * this.scene.cameraSize.y;
            const scale = Math.min(
                (backgroundScale * this.scene.cameraSize.x) /
                    sprite.texture.width,
                (backgroundScale * this.scene.cameraSize.y) /
                    sprite.texture.height
            );
            sprite.tileScale.x = scale;
            sprite.tileScale.y = -scale;
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
