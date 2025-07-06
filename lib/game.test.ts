import { createMachine } from 'xstate';

// This is a placeholder for our actual machine
const gameMachine = createMachine({});

describe('gameMachine', () => {
  it('should start at difficulty level 1', () => {
    const initialState = gameMachine.initialState;
    expect(initialState.context.difficultyLevel).toBe(1);
  });
});
