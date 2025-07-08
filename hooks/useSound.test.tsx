import { renderHook, act } from "@testing-library/react-native";
import { useSound } from "@/hooks/useSound";
import { createActor, InspectionEvent, transition } from "xstate";
import { gameMachine } from "@/scripts/gameState";
import { GameProvider } from "@/scripts/GameContext";
import { AudioStatus, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

// Mock expo-av
jest.mock("expo-audio");

// Custom render function to wrap components with GameProvider and expose the machine actor
const renderWithGameContext = (
  hookFunction: Parameters<typeof renderHook>[0]
) => {
  const events: string[] = [];
  const gameActor = createActor(gameMachine, {
    inspect: (inspEvent) => {
      if (inspEvent.type === "@xstate.event") events.push(inspEvent.event.type);
    },
  }).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GameProvider machine={gameActor}>{children}</GameProvider>
  );
  return {
    ...renderHook(hookFunction, { wrapper: Wrapper }),
    gameActor, // Expose the actor for direct interaction in tests
    events,
  };
};

describe("useSound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("plays the intro sound when mounted", () => {
    const player = useAudioPlayer();

    renderWithGameContext(() => useSound());

    expect(player.play).toHaveBeenCalled();
  });

  it("dispatches the START_GAME event when the intro sound finishes playing", () => {
    const { events, rerender } = renderWithGameContext(() => useSound());

    jest.mocked(useAudioPlayerStatus).mockReturnValue({
      didJustFinish: true,
    } as AudioStatus);
    rerender(() => useSound());

    expect(events[events.length - 1]).toEqual("START_GAME");
  });

  it("stops other sounds when a new sound is played", () => {
    const player = useAudioPlayer();

    renderWithGameContext(() => useSound());

    expect(player.pause).toHaveBeenCalled();
  });
});
