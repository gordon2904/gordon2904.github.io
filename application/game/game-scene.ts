import { EventSystem, Ticker } from 'pixi.js';
import { Scene } from '../components/scene';
import { Fella } from './fella';
import { gsap } from 'gsap';
import { FollowCamera } from '../components/camera-system/follow-camera';
import { KeyboardInputManager } from '../keyboard-input-manager';
import { Wall } from '../components/colliders/wall';
import { ParallaxBackground } from './background.ts/parallax';
import { Floor } from '../components/colliders/floor';

const sceneHeight = 8;

export class GameScene extends Scene {
    private background: ParallaxBackground;

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
        this.background = new ParallaxBackground(this);
        this.addChildAt(this.background, 0);
        this.physicsWorld.gravity.y = 4 * -9.81;
        this.enableSceneMask();
        this.createSceneStaticColliders();
        const fella = new Fella(this);
        const followCamera = new FollowCamera(this, fella);
        followCamera.hardBounds = {
            left: 1,
            right: 1,
            top: 1,
            bottom: 1
        };
        this.cameraSystem.setActiveCamera(followCamera);
        this.pauseListener();
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
        leftWall.position.x = -1;
        leftWall.position.y = 1;
        const floor = new Floor(this, { x: 400, y: 2 });
        floor.position.y = -1;
        const rightWall = new Wall(this, { x: 2, y: 150 });
        rightWall.position.x = 400;
        const test = new Floor(this, { x: 2, y: 2 });
        test.position.set(5, 5);
    }

    public test() {
        this.moveTimeline.kill();
        this.moveTimeline.clear();
    }
}
