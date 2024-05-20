import { EventSystem, Sprite, Texture } from 'pixi.js';
import { Scene } from '../components/scene';
import { Fella } from './fella';
import { gsap } from 'gsap';
import { FollowCamera } from '../components/camera-system/follow-camera';

export class GameScene extends Scene {
    private moveTimeline: gsap.core.Timeline = new gsap.core.Timeline({
        paused: true
    });

    public constructor(events: EventSystem) {
        super({
            cameraSize: { x: 200, y: 100 },
            screenSize: { x: window.innerWidth, y: window.innerHeight },
            worldSize: { x: 400, y: 150 },
            events
        });
        this.enableSceneMask();
        this.setupBasicBackgrounds();
        const fella = new Fella(this);
        const followCamera = new FollowCamera(this, fella);
        followCamera.softBounds = {
            left: 20,
            right: 20,
            top: 10,
            bottom: 10
        };
        this.cameraSystem.setActiveCamera(followCamera);
    }

    private setupBasicBackgrounds() {
        const columns = 18;
        const rows = 3;
        const width = this.viewport.worldWidth / columns;
        const height = this.viewport.worldHeight / rows;
        for (let i = 0; i < columns; ++i) {
            for (let j = 0; j < rows; ++j) {
                const background = new Sprite(Texture.WHITE);
                background.tint = [Math.random(), Math.random(), Math.random()];
                background.width = width;
                background.height = height;
                background.position.x = i * background.width;
                background.position.y = j * background.height;
                this.viewport.addChild(background);
            }
        }
    }

    public test() {
        this.moveTimeline.kill();
        this.moveTimeline.clear();
    }
}
