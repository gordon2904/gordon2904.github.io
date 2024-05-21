import {
    Container,
    Ticker,
    Renderer,
    UPDATE_PRIORITY,
    Assets,
    DisplayObject
} from 'pixi.js';
import type { Scene } from './components/scene';
import { GameScene } from './game/game-scene';
import { assetConfig } from './assets';
import { Viewport } from 'pixi-viewport';
import './pixi-plugin';
import { gsap } from 'gsap';
import { InitRapier } from './rapier';

let lastPerformance: number;
function calculateDeltaFromTick(tick: number) {
    const dtInMS = tick / Ticker.targetFPMS;
    return dtInMS * 0.001;
}
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
    private activeScene?: Scene;

    public constructor(htmlElement: HTMLElement) {
        this.init(htmlElement);
    }

    private async init(htmlElement: HTMLElement) {
        this.mRenderer = new Renderer({
            clearBeforeRender: false,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x222222
        });
        htmlElement.appendChild(this.renderer.view as any);
        this.setupTickers();
        window.addEventListener('resize', this.resize.bind(this));
        await InitRapier();
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

    private traverseChildren(
        parent: Container | DisplayObject,
        emitMethod: string,
        ...args: any[]
    ) {
        parent.emit(emitMethod, ...args);
        if (!(parent instanceof Container)) {
            return;
        }
        for (let i = 0; i < parent.children.length; ++i) {
            this.traverseChildren(parent.children[i], emitMethod, ...args);
        }
    }

    private update(tick: number) {
        if (!this.activeScene) {
            return;
        }
        const dt = calculateDeltaFromTick(tick);
        this.traverseChildren(
            this.activeScene,
            'realUpdate',
            calculateRealDeltaTime()
        );
        this.traverseChildren(this.activeScene, 'update', dt);
    }

    private lateUpdate(tick: number) {
        if (!this.activeScene) {
            return;
        }
        const dt = calculateDeltaFromTick(tick);
        gsap.updateRoot(Ticker.shared.lastTime * 0.001);
        this.traverseChildren(this.activeScene, 'lateUpdate', dt);
    }

    private renderStage() {
        this.renderer.clear();
        if (!this.activeScene) {
            return;
        }
        this.renderer.render(this.activeScene);
    }

    public start() {
        this.resize();
        Ticker.shared.start();
        lastPerformance = performance.now();
    }
}
