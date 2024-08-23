import { EventSystem, Sprite, Texture, Ticker } from 'pixi.js';
import { Scene } from '../components/scene';
import { Fella } from './fella';
import { gsap } from 'gsap';
import { FollowCamera } from '../components/camera-system/follow-camera';
import { KeyboardInputManager } from '../keyboard-input-manager';
import { Wall } from '../components/colliders/wall';

const sceneHeight = 8;

export class GameScene extends Scene {
    private moveTimeline: gsap.core.Timeline = new gsap.core.Timeline({
        paused: true
    });

    public constructor(events: EventSystem) {
        super({
            cameraSize: { x: (16 / 9) * sceneHeight, y: sceneHeight },
            screenSize: { x: window.innerWidth, y: window.innerHeight },
            worldSize: { x: 400, y: 150 },
            events
        });
        this.enableSceneMask();
        this.setupBasicBackgrounds();
        this.createSceneStaticColliders();
        const fella = new Fella(this);
        const followCamera = new FollowCamera(this, fella);
        // followCamera.clampToWorld = false;
        // followCamera.scale.set(2);
        followCamera.hardBounds = {
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        this.cameraSystem.setActiveCamera(followCamera);
        this.pauseListener();
        // Ticker.shared.speed = 0.2;
    }

    private get pause() {
        return !Ticker.shared.started;
    }
    private set pause(value: boolean) {
        if (value) {
            Ticker.shared.stop();
        } else {
            Ticker.shared.start();
        }
    }

    private pauseListener() {
        KeyboardInputManager.instance.on('onKeyDown', (event) => {
            if (event.code === 'Escape') {
                this.pause = !this.pause;
            }
        });
    }

    private createSceneStaticColliders() {
        const leftWall = new Wall(this, { x: 2, y: 150 });
        leftWall.position.x = -2;
        const floor = new Wall(this, { x: 400, y: 2 });
        floor.position.y = -2;
        const rightWall = new Wall(this, { x: 2, y: 150 });
        rightWall.position.x = 400;
        const test = new Wall(this, { x: 2, y: 2 });
        test.position.set(5, 5);
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
