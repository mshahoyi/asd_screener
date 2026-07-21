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
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().value).toBe('presentingTrial');
    expect(actor.getSnapshot().context.trialCount).toBe(2);
  });

  it('should treat a drag timeout as a successful drag for difficulty progression (DL1 + correct at CL1 -> DL2)', () => {
    const actor = createAndStartGameActor();

    // Correct selection at CL1 -> awaitingDrag with lastCorrectCueLevel=1
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    expect(actor.getSnapshot().value).toBe('awaitingDrag');

    // Drag times out: should behave like DRAG_SUCCESSFUL
    actor.send({ type: 'DRAG_TIMEOUT' });
    expect(actor.getSnapshot().value).toBe('positiveFeedbackForDragSuccess');
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
    expect(actor.getSnapshot().context.trialCount).toBe(2);
  });

  it('should treat a drag timeout as a successful drag for difficulty progression (DL1 + correct at CL4 -> stay DL1)', () => {
    const actor = createAndStartGameActor();

    // Escalate to CL4
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL4
    expect(actor.getSnapshot().context.cueLevel).toBe(4);

    // Correct selection at CL4 -> awaitingDrag with lastCorrectCueLevel=4
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    expect(actor.getSnapshot().value).toBe('awaitingDrag');

    // Drag times out: should behave like DRAG_SUCCESSFUL, but not upgrade to DL2 because CL4
    actor.send({ type: 'DRAG_TIMEOUT' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
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

  it('should upgrade to difficulty level 2 after one correct response at CL2 and successful drag', () => {
    const actor = createAndStartGameActor();
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // Incorrect -> CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // Correct at CL2 -> awaitingDrag
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    // A single tap at <= CL-II upgrades immediately (no consecutive requirement).
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should not upgrade to difficulty level 2 from DL1 without interaction (times out to CL4, then drag times out)', () => {
    const actor = createAndStartGameActor();

    actor.send({ type: 'TIMEOUT' }); // CL2
    actor.send({ type: 'TIMEOUT' }); // CL3
    actor.send({ type: 'TIMEOUT' }); // CL4
    actor.send({ type: 'TIMEOUT' }); // -> awaitingDrag
    actor.send({ type: 'DRAG_TIMEOUT' });

    // No target tap means no upgrade.
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
  });

  it('should not upgrade to difficulty level 2 from DL1 if the first correct response is at CL3', () => {
    const actor = createAndStartGameActor();

    // Escalate to CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL3
    expect(actor.getSnapshot().context.cueLevel).toBe(3);

    // Correct at CL3, then drag successfully
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
  });

  it('should not upgrade to difficulty level 2 from DL1 if the first correct response is at CL4', () => {
    const actor = createAndStartGameActor();

    // Escalate to CL4
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'right' }); // CL4
    expect(actor.getSnapshot().context.cueLevel).toBe(4);

    // Correct at CL4, then drag successfully
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
  });

  it('should keep DL2 when the first DL2 trial is solved easily (<= CL2)', () => {
    const actor = createAndStartGameActor();

    // Upgrade to DL2 via correct at CL1 + drag success, then start the first (probationary) DL2 trial.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);

    // Solve the first DL2 trial at CL2 -> probation passed, DL2 locks in.
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // incorrect (correctItem is top-left given Math.random=0.1) -> CL2
    expect(actor.getSnapshot().context.cueLevel).toBe(2);
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL2
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should regress to DL1 when the first DL2 trial needs CL3+ to succeed (probation)', () => {
    const actor = createAndStartGameActor();

    // Upgrade to DL2, then start the first (probationary) DL2 trial.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);

    // Needs CL3 to succeed on the first DL2 trial -> probation failed, regress to DL1.
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL3
    expect(actor.getSnapshot().context.cueLevel).toBe(3);
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL3
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
  });

  it('should regress to DL1 when the first DL2 trial has no interaction (drag times out)', () => {
    const actor = createAndStartGameActor();

    // Upgrade to DL2, then start the first (probationary) DL2 trial.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);

    // No interaction: time out to CL4 then drag times out -> probation failed, regress to DL1.
    actor.send({ type: 'TIMEOUT' }); // CL2
    actor.send({ type: 'TIMEOUT' }); // CL3
    actor.send({ type: 'TIMEOUT' }); // CL4
    actor.send({ type: 'TIMEOUT' }); // -> awaitingDrag
    actor.send({ type: 'DRAG_TIMEOUT' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
  });

  it('should never regress from DL2 again after the first DL2 trial is passed, even at CL3+', () => {
    const actor = createAndStartGameActor();

    // Upgrade to DL2 and pass the first DL2 trial at CL1.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL1 -> probation passed
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);

    // A later DL2 trial solved at CL3 must NOT regress.
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL3
    actor.send({ type: 'DRAG_SUCCESSFUL' });

    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it('should not regress on a later climb back to DL2 after the first DL2 trial already regressed', () => {
    const actor = createAndStartGameActor();

    // Upgrade to DL2, then FAIL the first DL2 trial at CL3 -> regress to DL1.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL3
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);

    // Climb back to DL2 via a CL1 tap (correct item is 'left' again at DL1).
    actor.send({ type: 'SELECTION', selectedPosition: 'left' }); // correct at CL1 -> DL2
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);

    // This later DL2 is permanent: solving at CL3 must NOT regress.
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL2
    actor.send({ type: 'SELECTION', selectedPosition: 'top-right' }); // -> CL3
    actor.send({ type: 'SELECTION', selectedPosition: 'top-left' }); // correct at CL3
    actor.send({ type: 'DRAG_SUCCESSFUL' });

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

  it('should return to introduction on RESET after the session has ended (so the next game starts fresh)', () => {
    const actor = createAndStartGameActor();
    // Progress into the game a bit so context is dirtied, then end the session.
    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_SUCCESSFUL' });
    actor.send({ type: 'NEXT_TRIAL' });
    actor.send({ type: 'SESSION_TIMER_ELAPSED' });
    expect(actor.getSnapshot().value).toBe('sessionEnded');

    // sessionEnded must NOT stop the actor: RESET should still be processed and start a new game.
    actor.send({ type: 'RESET' });
    expect(actor.getSnapshot().value).toBe('introduction');
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
    expect(actor.getSnapshot().context.cueLevel).toBe(1);
    expect(actor.getSnapshot().context.trialCount).toBe(1);
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

  it('should emit a drag unsuccessful event when the drag times out', (done) => {
    const actor = createAndStartGameActor();

    actor.on('DRAG_UNSUCCESSFUL', (event) => {
      expect(event.type).toBe('DRAG_UNSUCCESSFUL');
      done();
    });

    actor.send({ type: 'SELECTION', selectedPosition: 'left' });
    actor.send({ type: 'DRAG_TIMEOUT' });
  });

  it('should transition to awaitingDrag on TIMEOUT when cueLevel is 4', () => {
    const actor = createAndStartGameActor();
    // Escalate to cue level 4
    actor.send({ type: 'TIMEOUT' }); // CL2
    actor.send({ type: 'TIMEOUT' }); // CL3
    actor.send({ type: 'TIMEOUT' }); // CL4
    expect(actor.getSnapshot().context.cueLevel).toBe(4);

    // Timeout at CL4
    actor.send({ type: 'TIMEOUT' });
    expect(actor.getSnapshot().value).toBe('awaitingDrag');
    expect(actor.getSnapshot().context.cueLevel).toBe(4);
  });
});
