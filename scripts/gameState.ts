import { createMachine, assign, setup, emit } from 'xstate';

// Define possible positions for items based on difficulty level
const difficulty1Positions = ['left', 'right'];
const difficulty2Positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export type GameStateEmittedEvent<T extends 'SELECTION' | 'DRAG_SUCCESSFUL'> = {
  type: T;
} & {
  SELECTION: { selectedPosition: string; correctItem: string };
  DRAG_SUCCESSFUL: {};
}[T];

export const gameMachine = setup({
  types: {
    emitted: {} as GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL'>,
  },
  actions: {
    updateDifficulty: assign(({ context }) => {
      let newDifficulty = context.difficultyLevel;
      if (context.cueLevel === 1) {
        newDifficulty = 2;
      }
      // Only upgrade if consecutiveCorrectAtCL2 is 2 AND current difficulty is 1
      if (context.cueLevel === 2 && context.consecutiveCorrectAtCL2 === 2 && context.difficultyLevel === 1) {
        newDifficulty = 2;
      }
      return { difficultyLevel: newDifficulty };
    }),
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
  },
}).createMachine({
  id: 'game',
  initial: 'introduction',
  context: {
    difficultyLevel: 1,
    cueLevel: 1,
    trialCount: 1,
    consecutiveCorrectAtCL2: 0,
    correctItem: 'left',
    selectedPosition: '',
  },
  states: {
    introduction: {
      on: {
        START_GAME: {
          target: 'presentingTrial',
          actions: 'assignCorrectItem',
        },
      },
    },
    presentingTrial: {
      on: {
        SELECTION: [
          {
            guard: ({ context, event }) => event.selectedPosition === context.correctItem,
            target: 'awaitingDrag',
            actions: ['resetCueLevel', 'saveSelectedPosition', 'emitSelectionEvent'],
          },
          {
            guard: ({ context, event }) => event.selectedPosition !== context.correctItem,
            actions: ['escalateCueLevel', 'resetConsecutiveCorrectAtCL2', 'saveSelectedPosition', 'emitSelectionEvent'],
          },
        ],
        TIMEOUT: [
          {
            guard: ({ context }) => context.cueLevel === 4,
            target: 'awaitingDrag',
            actions: ['resetConsecutiveCorrectAtCL2'],
          },
          {
            actions: ['escalateCueLevel', 'resetConsecutiveCorrectAtCL2'],
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
          target: 'presentingTrial',
          actions: [
            'incrementTrialCount',
            'incrementConsecutiveCorrectAtCL2',
            'updateDifficulty',
            'resetCueLevel',
            'assignCorrectItem', // Assign new item for next trial
            'emitDragSuccessfulEvent',
          ],
        },
        DRAG_FAILED: {
          target: 'presentingTrial',
          actions: ['resetCueLevel', 'assignCorrectItem'], // Assign new item for next trial
        },
        SESSION_TIMER_ELAPSED: {
          target: 'sessionEnded',
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
