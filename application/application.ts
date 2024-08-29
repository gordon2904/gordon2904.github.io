import { Ticker, Renderer, UPDATE_PRIORITY, Assets } from 'pixi.js';
import type { Scene } from './components/scene';
import { GameScene } from './game/game-scene';
import { assetConfig } from './assets';
import { Viewport } from 'pixi-viewport';
import './pixi-plugin';
import { gsap } from 'gsap';
import { InitRapier } from './rapier';
import { calculateDeltaTimeFromPixiTick, traverseChildren } from './utils';
import { KeyboardInputManager } from './keyboard-input-manager';
import Stats from 'stats.js';
import { PointerInputManager } from './pointer-input-manager';

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

let rootTime = 0;
let lastPerformance: number;
function calculateRealDeltaTime() {
    const now = performance.now();
    const realDT = now - lastPerformance;
    lastPerformance = now;
    return realDT;
}

export class Application {
    private mRenderer!: Renderer;
    public get renderer() {
        return this.mRenderer;
    }
    public readonly stage: Viewport;

    private scenes: Scene[] = [];
    private mActiveScene?: Scene;
    public get activeScene(): Scene | undefined {
        return this.mActiveScene;
    }
    public set activeScene(value: Scene | undefined) {
        this.mActiveScene = value;
        PointerInputManager.instance.setActiveScene(value);
    }

    public constructor(htmlElement: HTMLElement) {
        this.init(htmlElement);
        KeyboardInputManager.instance.on('onKeyDown', () => {});
    }

    private async init(htmlElement: HTMLElement) {
        await InitRapier();
        this.mRenderer = new Renderer({
            clearBeforeRender: false,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x222222,
            eventFeatures: {
                globalMove: true,
                click: true,
                move: true,
                wheel: true
            },
            antialias: false,
            eventMode: 'passive',
            resolution: 1
        });
        htmlElement.appendChild(
            this.renderer.view as unknown as HTMLCanvasElement
        );
        this.setupTickers();
        window.addEventListener('resize', this.resize.bind(this));
        await this.loadAssets();
        this.setupScenes();
        this.start();
    }

    private async loadAssets() {
        assetConfig.sheets.forEach((sheet) => Assets.add(sheet));
        const aliases = assetConfig.sheets.reduce((arr, sheet) => {
            const aliases =
                typeof sheet.alias === 'string'
                    ? [sheet.alias]
                    : (sheet.alias as string[]);
            return [...arr, ...aliases];
        }, [] as string[]);
        await Assets.load(aliases);
    }

    private setupScenes() {
        const gameScene = new GameScene(this.renderer.events);
        this.activeScene = gameScene;
        this.scenes.push(gameScene);
    }

    private setupTickers() {
        gsap.ticker.remove(gsap.updateRoot);
        Ticker.system.add(this.systemUpdate, this, UPDATE_PRIORITY.HIGH);
        Ticker.shared.add(this.update, this, UPDATE_PRIORITY.NORMAL + 2);
        Ticker.shared.add(this.lateUpdate, this, UPDATE_PRIORITY.NORMAL + 1);
        Ticker.shared.add(this.renderStage, this, UPDATE_PRIORITY.NORMAL);
    }

    private resize() {
        this.renderer.resize(window.innerWidth, window.innerHeight);
        if (!this.activeScene) {
            return;
        }
        this.activeScene.screenSize.set(window.innerWidth, window.innerHeight);
    }

    private systemUpdate() {
        if (!this.activeScene) {
            return;
        }
        traverseChildren(
            this.activeScene,
            'realUpdate',
            calculateRealDeltaTime()
        );
    }

    private update(tick: number) {
        if (!this.activeScene) {
            return;
        }
        const dt = calculateDeltaTimeFromPixiTick(tick);
        traverseChildren(this.activeScene, 'update', dt);
    }

    private lateUpdate(tick: number) {
        if (!this.activeScene) {
            return;
        }
        const dt = calculateDeltaTimeFromPixiTick(tick);
        rootTime += dt;
        gsap.updateRoot(rootTime);
        traverseChildren(this.activeScene, 'lateUpdate', dt);
    }

    private renderStage() {
        stats.begin();
        this.renderer.clear();
        if (!this.activeScene) {
            return;
        }
        this.renderer.render(this.activeScene);
        stats.end();
    }

    public start() {
        this.resize();
        Ticker.shared.start();
        Ticker.system.start();
        lastPerformance = performance.now();
    }
}
