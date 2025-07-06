import {gameMachine} from "./game";
import {createActor} from "xstate";

describe("gameMachine", () => {
  it("should start at difficulty level 1 and cue level 1", () => {
    const actor = createActor(gameMachine).start();
    const initialState = actor.getSnapshot();
    expect(initialState.context.difficultyLevel).toBe(1);
    expect(initialState.context.cueLevel).toBe(1);
  });

  it("should transition to awaitingDrag on correct selection", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    expect(actor.getSnapshot().value).toBe("awaitingDrag");
  });

  it("should transition to the next trial on successful drag", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "DRAG_SUCCESSFUL"});
    expect(actor.getSnapshot().value).toBe("presentingTrial");
    expect(actor.getSnapshot().context.trialCount).toBe(2);
  });

  it("should return to presentingTrial on drag failure", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "DRAG_FAILED"});
    expect(actor.getSnapshot().value).toBe("presentingTrial");
    expect(actor.getSnapshot().context.trialCount).toBe(1);
  });

  it("should ignore incorrect selections while awaiting drag", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "INCORRECT_SELECTION"});
    expect(actor.getSnapshot().value).toBe("awaitingDrag");
  });

  it("should escalate cue level on incorrect selection", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "INCORRECT_SELECTION"});
    expect(actor.getSnapshot().context.cueLevel).toBe(2);
  });

  it("should escalate cue level on timeout", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "TIMEOUT"});
    expect(actor.getSnapshot().context.cueLevel).toBe(2);
  });

  it("should not escalate cue level beyond 4", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel: 2
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel: 3
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel: 4
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel should still be 4
    expect(actor.getSnapshot().context.cueLevel).toBe(4);
  });

  it("should upgrade to difficulty level 2 after one correct response at CL1 and successful drag", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    expect(actor.getSnapshot().context.difficultyLevel).toBe(1);
    actor.send({type: "DRAG_SUCCESSFUL"});
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it("should upgrade to difficulty level 2 after two consecutive correct responses at CL2 and successful drags", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel: 2
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "DRAG_SUCCESSFUL"});
    actor.send({type: "INCORRECT_SELECTION"}); // cueLevel: 2
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "DRAG_SUCCESSFUL"});
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it("should not downgrade difficulty level", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "CORRECT_SELECTION"});
    actor.send({type: "DRAG_SUCCESSFUL"}); // difficultyLevel: 2
    actor.send({type: "INCORRECT_SELECTION"});
    actor.send({type: "INCORRECT_SELECTION"});
    expect(actor.getSnapshot().context.difficultyLevel).toBe(2);
  });

  it("should end the session after the time limit is reached", () => {
    const actor = createActor(gameMachine).start();
    // Simulate time passing
    actor.send({type: "SESSION_TIMER_ELAPSED"});
    expect(actor.getSnapshot().value).toBe("sessionEnded");
  });

  it("should end the session when the researcher exits", () => {
    const actor = createActor(gameMachine).start();
    actor.send({type: "EXIT"});
    expect(actor.getSnapshot().value).toBe("sessionEnded");
  });
});
