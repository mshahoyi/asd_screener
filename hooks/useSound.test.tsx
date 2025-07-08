import { renderHook, act } from "@testing-library/react-native";
import { useSound } from "@/hooks/useSound";
import { Audio } from "expo-av";
import { createActor } from "xstate";
import { gameMachine } from "@/scripts/gameState";
import { GameProvider } from "@/scripts/GameContext";

// Mock expo-av
jest.mock("expo-av");

// Custom render function to wrap components with GameProvider and expose the machine actor
const renderWithGameContext = (
  hookFunction: Parameters<typeof renderHook>[0]
) => {
  const gameActor = createActor(gameMachine).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GameProvider machine={gameActor}>{children}</GameProvider>
  );
  return {
    ...renderHook(hookFunction, { wrapper: Wrapper }),
    gameActor, // Expose the actor for direct interaction in tests
  };
};

describe("useSound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call setAudioModeAsync on initial render", () => {
    renderWithGameContext(() => useSound());
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  });

  it.todo("plays the intro sound when mounted");

  it.todo(
    "dispatches the START_GAME event when the intro sound finishes playing"
  );
});
