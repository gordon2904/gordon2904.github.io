import {
    StateMachine,
    type IStateMachineTransition
} from '~/application/systems/state-machine';
import { FELLA_ANIMATIONS } from './consts';

export type FellaState = (typeof FELLA_ANIMATIONS)[number];

export class FellaStateMachine extends StateMachine<FellaState> {
    //attacks
    public readonly attemptAttack1: IStateMachineTransition;
    public readonly attemptAttack2: IStateMachineTransition;
    public readonly attemptAttack3: IStateMachineTransition;

    //movement
    public readonly attemptIdle: IStateMachineTransition;
    public readonly attemptRun: IStateMachineTransition;
    public readonly attemptRoll: IStateMachineTransition;
    public readonly attemptJump: IStateMachineTransition;
    public readonly attemptFall: IStateMachineTransition;

    public constructor() {
        super('idle');
        Object.assign(this, this.setupAttackMethods());
        Object.assign(this, this.setupMovementMethods());
    }

    private allButXStates(states: FellaState[]) {
        return [...FELLA_ANIMATIONS].filter((state) => !states.includes(state));
    }

    private setupMovementMethods() {
        return {
            attemptIdle: this.createTransition(
                'idle',
                this.allButXStates(['idle', 'death', 'death-no-blood'])
            ),
            attemptRun: this.createTransition(
                'run',
                this.allButXStates(['run', 'death', 'death-no-blood'])
            ),
            attemptRoll: this.createTransition(
                'roll',
                this.allButXStates(['roll', 'death', 'death-no-blood'])
            ),
            attemptJump: this.createTransition(
                'jump',
                this.allButXStates(['death', 'death-no-blood'])
            ),
            attemptFall: this.createTransition(
                'fall',
                this.allButXStates(['fall', 'death', 'death-no-blood'])
            )
        };
    }

    private setupAttackMethods() {
        const attackFromStates: FellaState[] = [
            'idle',
            'run',
            'roll',
            'jump',
            'fall',
            'block-idle'
        ];
        return {
            attemptAttack1: this.createTransition('attack-1', attackFromStates),
            attemptAttack2: this.createTransition('attack-2', attackFromStates),
            attemptAttack3: this.createTransition('attack-3', attackFromStates)
        };
    }
}
