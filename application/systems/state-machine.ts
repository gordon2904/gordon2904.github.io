import EventEmitter from 'eventemitter3';

interface IStateMachineEvents<TState extends string> {
    onStateChange(from: TState, to: TState): void;
    onRepeatState(to: TState): void;
}

export class StateMachine<TState extends string> extends EventEmitter<
    IStateMachineEvents<TState>
> {
    private isChanging: boolean = false;
    private DEBUG_prevState: TState;
    private mState: TState;
    private set state(value: TState) {
        if (this.state === value) {
            this.emit('onRepeatState', value);
            return;
        }
        if (this.isChanging) {
            console.warn(
                `STATEMACHINE: attempt to change state to "${value}" whilst state was already changing to "${this.state}" from "${this.DEBUG_prevState}"`
            );
        }
        this.isChanging = true;
        const prevState = this.mState;
        this.DEBUG_prevState = prevState;
        this.mState = value;
        this.emit('onStateChange', prevState, value);
        this.isChanging = false;
    }
    public get state() {
        return this.mState;
    }

    public constructor(initialState: TState) {
        super();
        this.mState = initialState;
    }

    public createTransition(
        toState: TState,
        fromStates: TState[]
    ): IStateMachineTransition {
        return () => {
            const includesState = fromStates.includes(this.state);
            if (includesState) {
                this.goTo(toState);
            }
            return includesState;
        };
    }

    public goTo(state: TState) {
        this.state = state;
    }
}

export type IStateMachineTransition = () => boolean;
