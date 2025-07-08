import { gameMachine, GameStateEmittedEvent } from './gameState';
import { createActor } from 'xstate';

describe('gameMachine', () => {
  // Mock Math.random to control correct item assignment for tests
  let mockMathRandom: jest.SpyInstance;

  beforeEach(() => {
    // Default mock for Math.random to return a value that results in 'left' for DL1
    mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  // Helper to create and start an actor, sending START_GAME to bypass introduction for most tests
  const createAndStartGameActor = () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: 'START_GAME' });
    return actor;
  };

  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  it('should start in the introduction state', () => {
    const actor = createActor(gameMachine).start();
    expect(actor.getSnapshot().value).toBe('introduction');
    expect(actor.getSnapshot().context.correctItem).toBe('left');
  });

  it('should transition from introduction to presentingTrial on START_GAME event', () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: 'START_GAME' });
    expect(actor.getSnapshot().value).toBe('presentingTrial');
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
    expect(actor.getSnapshot().context.cueLevel).toBe(1);
    expect(actor.getSnapshot().context.correctItem).toBe('left'); // Based on mockMathRandom
  });

  it('should assign a correct item position for difficulty level 2 after upgrading', () => {
    const actor = createAndStartGameActor();

    // Simulate correct selection at CL1 and successful drag to upgrade to DL2
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    const snapshot = actor.getSnapshot();
    const dl2Positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    expect(snapshot.context.difficultyLevel).toBe(2);
    expect(dl2Positions).toContain(snapshot.context.correctItem);
  });

  it('should transition to awaitingDrag on correct SELECTION', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // 'left' is correct due to mock
    expect(actor.getSnapshot().value).toBe('awaitingDrag');
    expect(actor.getSnapshot().context.cueLevel).toBe(1); // Cue level should reset on correct selection
  });

  it('should escalate cue level on incorrect SELECTION', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // 'right' is incorrect due to mock
    expect(actor.getSnapshot().context.cueLevel).toBe(2);
  });

  it('should transition to the next trial on successful drag', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    expect(actor.getSnapshot().value).toBe('presentingTrial');
    expect(actor.getSnapshot().context.trialCount).toBe(2);
  });

  it('should return to presentingTrial and reset cue on drag failure', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_FAILED' });
    expect(actor.getSnapshot().value).toBe('presentingTrial');
    expect(actor.getSnapshot().context.cueLevel).toBe(1); // Cue level should reset
    expect(actor.getSnapshot().context.trialCount).toBe(1); // Trial count should not increment
  });

  it('should ignore incorrect selections while awaiting drag', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // Correct selection, now awaiting drag
    expect(actor.getSnapshot().value).toBe('awaitingDrag');
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // Incorrect selection while awaiting drag
    expect(actor.getSnapshot().value).toBe('awaitingDrag'); // Should still be awaiting drag
    expect(actor.getSnapshot().context.cueLevel).toBe(1); // Cue level should not change
  });

  it('should escalate cue level on timeout', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'TIMEOUT' });
    expect(actor.getSnapshot().context.cueLevel).toBe(2);
  });

  it('should not escalate cue level beyond 4', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // cueLevel: 2
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // cueLevel: 3
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // cueLevel: 4
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // cueLevel should still be 4
    expect(actor.getSnapshot().context.cueLevel).toBe(4);
  });

  it('should upgrade to difficulty level 2 after one correct response at CL1 and successful drag', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should upgrade to difficulty level 2 after two consecutive correct responses at CL2 and successful drags', () => {
    const actor = createAndStartGameActor();
    // First CL2 correct response
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // Incorrect to get to CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // Correct at CL2
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    // Second CL2 correct response
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // Incorrect to get to CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // Correct at CL2
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should not downgrade difficulty level', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' }); // difficultyLevel: 2
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // Incorrect
    actor.send({ type: 'SELECTION', selectedPosition: 'bottom-left' }); // Incorrect
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should end the session after the time limit is reached', () => {
    const actor = createAndStartGameActor();
    // Simulate time passing
    actor.send({ type: 'SESSION_TIMER_ELAPSED' });
    expect(actor.getSnapshot().value).toBe('sessionEnded');
  });

  it('should end the session when the researcher exits', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'EXIT' });
    expect(actor.getSnapshot().value).toBe('sessionEnded');
  });

  it('should save the selected position in the context on SELECTION', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'right' });
    expect(actor.getSnapshot().context.selectedPosition).toBe('right');

    // Test with a different position
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    expect(actor.getSnapshot().context.selectedPosition).toBe('left');
  });

  it('should emit a selection event when a selection is made', (done) => {
    const actor = createAndStartGameActor();

    actor.on('SELECTION', (event) => {
      expect(event.type).toBe('SELECTION');
      expect((event as GameStateEmittedEvent<'SELECTION'>).selectedPosition).toBe('right');
      expect((event as GameStateEmittedEvent<'SELECTION'>).correctItem).toBe('left');
      expect(actor.getSnapshot().context.selectedPosition).toBe('right');
      done();
    });

    actor.send({ type: 'SELECTION', selectedPosition: 'right' });
  });

  it('should emit a drag successful event when a drag is successful', (done) => {
    const actor = createAndStartGameActor();

    actor.on('DRAG_SUCCESSFUL', (event) => {
      expect(event.type).toBe('DRAG_SUCCESSFUL');
      done();
    });

    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
  });
});
