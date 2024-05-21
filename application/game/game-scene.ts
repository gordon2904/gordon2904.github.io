import { EventSystem, Sprite, Texture } from 'pixi.js';
import { Scene } from '../components/scene';
import { Fella } from './fella';
import { Linear, gsap } from 'gsap';
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
        followCamera.clampToWorld = false;
        // followCamera.scale.set(2);
        followCamera.softBounds = {
            left: 95,
            right: 95,
            top: 20,
            bottom: 5
        };
        this.cameraSystem.setActiveCamera(followCamera);
        gsap.timeline().fromTo(
            followCamera,
            { pixi: { scale: 0.5 } },
            {
                pixi: { scale: 1.2 },
                duration: 2,
                yoyo: true,
                yoyoEase: Linear.easeNone,
                repeat: -1
            }
        );
    }

    private setupBasicBackgrounds() {
        const columns = 18;
        const rows = 3;
        const width = this.viewport.worldWidth / columns;
        const height = this.viewport.worldHeight / rows;
        for (let i = 0; i < columns; ++i) {
            for (let j = 0; j < rows; ++j) {
                const background = new Sprite(Texture.WHITE);
                background.tint = [0, 0, Math.random()];
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
