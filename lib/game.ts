import { createMachine, assign, setup } from 'xstate';

export const gameMachine = setup({
  actions: {
    updateDifficulty: assign({
      difficultyLevel: ({ context }) => {
        if (context.cueLevel === 1) {
          return 2;
        }
        if (context.consecutiveCorrectAtCL2 === 2) {
          return 2;
        }
        return context.difficultyLevel;
      },
    }),
  },
}).createMachine({
  id: 'game',
  initial: 'presentingTrial',
  context: {
    difficultyLevel: 1,
    cueLevel: 1,
    trialCount: 1,
    consecutiveCorrectAtCL2: 0,
  },
  states: {
    presentingTrial: {
      on: {
        CORRECT_SELECTION: {
          target: 'awaitingDrag',
        },
        INCORRECT_SELECTION: {
          actions: assign({
            cueLevel: ({ context }) => Math.min(context.cueLevel + 1, 4),
            consecutiveCorrectAtCL2: 0,
          }),
        },
        TIMEOUT: {
          actions: assign({
            cueLevel: ({ context }) => Math.min(context.cueLevel + 1, 4),
            consecutiveCorrectAtCL2: 0,
          }),
        },
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
            assign({
              trialCount: ({ context }) => context.trialCount + 1,
              consecutiveCorrectAtCL2: ({ context }) => {
                if (context.cueLevel === 2) {
                  return context.consecutiveCorrectAtCL2 + 1;
                }
                return 0;
              },
              cueLevel: 1,
            }),
            'updateDifficulty',
          ],
        },
        DRAG_FAILED: {
          target: 'presentingTrial',
        },
      },
    },
    sessionEnded: {
      type: 'final',
    },
  },
});