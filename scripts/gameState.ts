import { createMachine, assign, setup, emit } from 'xstate';

// Define possible positions for items based on difficulty level
const difficulty1Positions = ['left', 'right'];
const difficulty2Positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export type GameStateEmittedEvent<T extends 'SELECTION' | 'DRAG_SUCCESSFUL' | 'TRIAL_TIMEOUT' | 'GAME_STARTED'> = {
  type: T;
} & {
  GAME_STARTED: {};
  SELECTION: { selectedPosition: string; correctItem: string };
  DRAG_SUCCESSFUL: {};
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
    consecutiveCorrectAtCL2: 0,
    lastCorrectCueLevel: null as number | null,
    trialEndCueLevel: null as number | null,
    correctItem: 'left',
    selectedPosition: '',
    currentItemIndex: 0,
  };
}

export const gameMachine = setup({
  types: {
    emitted: {} as GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL' | 'TRIAL_TIMEOUT' | 'GAME_STARTED'>,
  },
  actions: {
    updateDifficulty: assign(({ context }) => {
      let newDifficulty = context.difficultyLevel;
      // Only upgrade from DL1 -> DL2 if the child succeeded with cue level 1 or 2.
      // (If the child needs cue level 3+, do NOT increase difficulty.)
      if (context.difficultyLevel === 1 && (context.lastCorrectCueLevel === 1 || context.lastCorrectCueLevel === 2)) {
        newDifficulty = 2;
      }
      // Downgrade from DL2 -> DL1 if the child could not proceed by cue levels 1 and 2
      // (i.e. the trial reached cue level 3+), even if the trial ended via drag timeout.
      if (context.difficultyLevel === 2 && context.trialEndCueLevel != null && context.trialEndCueLevel >= 3) {
        newDifficulty = 1;
      }
      return { difficultyLevel: newDifficulty };
    }),
    recordCorrectCueLevel: assign(({ context }) => ({ lastCorrectCueLevel: context.cueLevel })),
    recordTrialEndCueLevel: assign(({ context }) => ({ trialEndCueLevel: context.cueLevel })),
    clearCorrectCueLevel: assign({ lastCorrectCueLevel: null }),
    clearTrialEndCueLevel: assign({ trialEndCueLevel: null }),
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
    resetConsecutiveCorrectAtCL2: assign({ consecutiveCorrectAtCL2: 0 }),
    incrementConsecutiveCorrectAtCL2: assign({ consecutiveCorrectAtCL2: ({ context }) => context.consecutiveCorrectAtCL2 + 1 }),
    escalateCueLevel: assign({ cueLevel: ({ context }) => Math.min(context.cueLevel + 1, 4) }),
    resetCueLevel: assign({ cueLevel: 1 }),
    emitSelectionEvent: emit(({ event, context }) => ({
      type: 'SELECTION' as const,
      selectedPosition: context.selectedPosition,
      correctItem: context.correctItem,
    })),
    emitDragSuccessfulEvent: emit(() => ({ type: 'DRAG_SUCCESSFUL' as const })),
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
            actions: ['recordTrialEndCueLevel', 'recordCorrectCueLevel', 'resetCueLevel', 'saveSelectedPosition', 'emitSelectionEvent'],
          },
          {
            guard: ({ context, event }) => event.selectedPosition !== context.correctItem,
            actions: [
              'escalateCueLevel',
              'resetConsecutiveCorrectAtCL2',
              'clearCorrectCueLevel',
              'saveSelectedPosition',
              'emitSelectionEvent',
            ],
          },
        ],
        TIMEOUT: [
          {
            guard: ({ context }) => context.cueLevel === 4,
            target: 'awaitingDrag',
            actions: ['recordTrialEndCueLevel', 'resetConsecutiveCorrectAtCL2', 'clearCorrectCueLevel', 'emitTimeoutEvent'],
          },
          {
            actions: ['escalateCueLevel', 'resetConsecutiveCorrectAtCL2', 'clearCorrectCueLevel', 'emitTimeoutEvent'],
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
            'incrementConsecutiveCorrectAtCL2',
            'updateDifficulty',
            'resetCueLevel',
            'clearCorrectCueLevel',
            'clearTrialEndCueLevel',
            'assignCorrectItem', // Assign new item for next trial
            'incrementCurrentItemIndex',
            'emitDragSuccessfulEvent',
          ],
        },
        // If the child can't drag in time, proceed exactly as if the drag had succeeded.
        DRAG_TIMEOUT: {
          target: 'positiveFeedbackForDragSuccess',
          actions: [
            'incrementTrialCount',
            'incrementConsecutiveCorrectAtCL2',
            'updateDifficulty',
            'resetCueLevel',
            'clearCorrectCueLevel',
            'clearTrialEndCueLevel',
            'assignCorrectItem', // Assign new item for next trial
            'incrementCurrentItemIndex',
            'emitDragSuccessfulEvent',
          ],
        },
        DRAG_FAILED: {
          target: 'presentingTrial',
          actions: ['resetCueLevel', 'clearCorrectCueLevel', 'clearTrialEndCueLevel', 'assignCorrectItem'], // Assign new item for next trial
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
    sessionEnded: {
      type: 'final',
    },
  },
});

function getRandomItemIndex(positionsLength: number) {
  return Math.floor(Math.random() * positionsLength);
}
