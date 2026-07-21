import { createMachine, assign, setup, emit } from 'xstate';

// Define possible positions for items based on difficulty level
const difficulty1Positions = ['left', 'right'];
const difficulty2Positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export type GameStateEmittedEvent<T extends 'SELECTION' | 'DRAG_SUCCESSFUL' | 'DRAG_UNSUCCESSFUL' | 'TRIAL_TIMEOUT' | 'GAME_STARTED'> = {
  type: T;
} & {
  GAME_STARTED: {};
  SELECTION: { selectedPosition: string; correctItem: string };
  DRAG_SUCCESSFUL: {};
  DRAG_UNSUCCESSFUL: {};
  TRIAL_TIMEOUT: { currentCueLevel: number };
}[T];

export const itemOrder = [
  'ball-football',
  'book-yellow',
  'kettle-blue', // order the items appear
  'lamp-dark',
  'socks-stripes',
  'bowl-blue',
  'ball-colorfull',
  'kettle-red',
  'lamp-light',
  'bowl-yellow',
  'socks-orange',
];

function getInitialGameContext() {
  return {
    difficultyLevel: 1,
    cueLevel: 1,
    trialCount: 1,
    // Whether the player has already completed their first-ever DL-II trial. The first DL-II trial is
    // probationary (can regress to DL-I); once it's done, DL-II never regresses again.
    firstDL2TrialDone: false,
    lastCorrectCueLevel: null as number | null,
    correctItem: 'left',
    selectedPosition: '',
    currentItemIndex: 0,
  };
}

export const gameMachine = setup({
  types: {
    emitted: {} as GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL' | 'DRAG_UNSUCCESSFUL' | 'TRIAL_TIMEOUT' | 'GAME_STARTED'>,
  },
  actions: {
    updateDifficulty: assign(({ context }) => {
      // "Tapped easily" = the target was tapped at CL-I or CL-II (little/no prompting).
      // A missing lastCorrectCueLevel means no interaction (timed out to CL-IV), which is not easy.
      const tappedEasily = context.lastCorrectCueLevel != null && context.lastCorrectCueLevel <= 2;

      // DL-I: upgrade to DL-II as soon as the target is tapped at CL-I or CL-II.
      // Tapping at CL-III+ or no interaction keeps the player at DL-I.
      if (context.difficultyLevel === 1) {
        return { difficultyLevel: tappedEasily ? 2 : 1 };
      }

      // DL-II: the very first DL-II trial is probationary — if it isn't solved easily (>= CL-III or no
      // interaction), the player regresses to DL-I. Every DL-II trial after that first one is permanent
      // (no regression). Either way, the probation is spent once the first DL-II trial completes.
      const isFirstDL2Trial = !context.firstDL2TrialDone;
      const newDifficulty = isFirstDL2Trial && !tappedEasily ? 1 : 2;
      return { difficultyLevel: newDifficulty, firstDL2TrialDone: true };
    }),
    recordCorrectCueLevel: assign(({ context }) => ({ lastCorrectCueLevel: context.cueLevel })),
    clearCorrectCueLevel: assign({ lastCorrectCueLevel: null }),
    resetGameContext: assign(() => getInitialGameContext()),
    assignCorrectItem: assign(({ context }) => {
      const availablePositions = context.difficultyLevel === 1 ? difficulty1Positions : difficulty2Positions;
      const randomIndex = getRandomItemIndex(availablePositions.length);
      return { correctItem: availablePositions[randomIndex] };
    }),
    saveSelectedPosition: assign(({ event }) => {
      return { selectedPosition: event.selectedPosition };
    }),
    incrementTrialCount: assign({ trialCount: ({ context }) => context.trialCount + 1 }),
    escalateCueLevel: assign({ cueLevel: ({ context }) => Math.min(context.cueLevel + 1, 4) }),
    resetCueLevel: assign({ cueLevel: 1 }),
    emitSelectionEvent: emit(({ event, context }) => ({
      type: 'SELECTION' as const,
      selectedPosition: context.selectedPosition,
      correctItem: context.correctItem,
    })),
    emitDragSuccessfulEvent: emit(() => ({ type: 'DRAG_SUCCESSFUL' as const })),
    emitDragUnsuccessfulEvent: emit(() => ({ type: 'DRAG_UNSUCCESSFUL' as const })),
    incrementCurrentItemIndex: assign({ currentItemIndex: ({ context }) => (context.currentItemIndex + 1) % itemOrder.length }),
    emitTimeoutEvent: emit(({ context }) => ({
      type: 'TRIAL_TIMEOUT' as const,
      currentCueLevel: context.cueLevel,
    })),
    emitGameStartedEvent: emit(() => ({ type: 'GAME_STARTED' as const })),
  },
}).createMachine({
  id: 'game',
  initial: 'introduction',
  context: getInitialGameContext(),
  on: {
    // Ensure we can always return to a clean slate when GameScreen unmounts.
    RESET: {
      target: '.introduction',
      actions: ['resetGameContext'],
    },
  },
  states: {
    introduction: {
      on: {
        START_GAME: {
          target: 'presentingTrial',
          actions: ['assignCorrectItem', 'emitGameStartedEvent'],
        },
      },
    },
    presentingTrial: {
      on: {
        SELECTION: [
          {
            guard: ({ context, event }) => event.selectedPosition === context.correctItem,
            target: 'awaitingDrag',
            actions: ['recordCorrectCueLevel', 'resetCueLevel', 'saveSelectedPosition', 'emitSelectionEvent'],
          },
          {
            guard: ({ context, event }) => event.selectedPosition !== context.correctItem,
            actions: ['escalateCueLevel', 'clearCorrectCueLevel', 'saveSelectedPosition', 'emitSelectionEvent'],
          },
        ],
        TIMEOUT: [
          {
            guard: ({ context }) => context.cueLevel === 4,
            target: 'awaitingDrag',
            actions: ['clearCorrectCueLevel', 'emitTimeoutEvent'],
          },
          {
            actions: ['escalateCueLevel', 'clearCorrectCueLevel', 'emitTimeoutEvent'],
          },
        ],
        SESSION_TIMER_ELAPSED: {
          target: 'sessionEnded',
        },
        EXIT: {
          target: 'sessionEnded',
        },
      },
    },
    awaitingDrag: {
      on: {
        DRAG_SUCCESSFUL: {
          target: 'positiveFeedbackForDragSuccess',
          actions: [
            'incrementTrialCount',
            'updateDifficulty',
            'resetCueLevel',
            'clearCorrectCueLevel',
            'assignCorrectItem', // Assign new item for next trial
            'incrementCurrentItemIndex',
            'emitDragSuccessfulEvent',
          ],
        },
        // If the child can't drag in time, progress through the game exactly as if the drag
        // had succeeded, but emit a DRAG_UNSUCCESSFUL event so the failure clip plays instead
        // of the success clip.
        DRAG_TIMEOUT: {
          target: 'positiveFeedbackForDragSuccess',
          actions: [
            'incrementTrialCount',
            'updateDifficulty',
            'resetCueLevel',
            'clearCorrectCueLevel',
            'assignCorrectItem', // Assign new item for next trial
            'incrementCurrentItemIndex',
            'emitDragUnsuccessfulEvent',
          ],
        },
        DRAG_FAILED: {
          target: 'presentingTrial',
          actions: ['resetCueLevel', 'clearCorrectCueLevel', 'assignCorrectItem'], // Assign new item for next trial
        },
        SESSION_TIMER_ELAPSED: {
          target: 'sessionEnded',
        },
      },
    },
    positiveFeedbackForDragSuccess: {
      on: {
        NEXT_TRIAL: {
          target: 'presentingTrial',
        },
      },
    },
    // Intentionally NOT a top-level `final` state. A final state stops the root actor, after which
    // it ignores all events — including the root-level RESET used to start a fresh game. Because the
    // actor is shared across game sessions (GameProvider lives at the participant layout), a final
    // state here would strand it in sessionEnded until the participant stack unmounts. Keeping it a
    // normal state lets RESET return the machine to `introduction` for the next game.
    sessionEnded: {},
  },
});

function getRandomItemIndex(positionsLength: number) {
  return Math.floor(Math.random() * positionsLength);
}
