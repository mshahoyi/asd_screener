import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import GameScreen from "./game";
import { GameProvider } from "@/src/GameContext";
import { createActor } from "xstate";
import { gameMachine } from "@/scripts/gameState";

// Mock the useRouter and useLocalSearchParams hooks
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useLocalSearchParams: () => ({ participant: "test-participant" }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

// Custom render function to wrap components with GameProvider and expose the machine actor
const renderWithGameContext = (ui: React.ReactElement) => {
  const gameActor = createActor(gameMachine).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GameProvider machine={gameActor}>{children}</GameProvider>
  );
  return {
    ...render(ui, { wrapper: Wrapper }),
    gameActor, // Expose the actor for direct interaction in tests
  };
};

describe("GameScreen UI with Assets", () => {
  // Mock Math.random to control correct item assignment for tests
  let mockMathRandom: jest.SpyInstance;

  beforeEach(() => {
    // Default mock for Math.random to return a value that results in 'left' for DL1
    mockMathRandom = jest.spyOn(Math, "random").mockReturnValue(0.1);
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  it("should display the neutral character in introduction state initially", async () => {
    renderWithGameContext(<GameScreen />);
    // Initially in introduction state, only neutral character should be visible
    await waitFor(() => {
      expect(screen.getByText("@/assets/neutral.png")).toBeTruthy();
      expect(screen.queryAllByTestId("game-item-left").length).toBe(0); // No items in introduction
    });
  });

  it("should transition to gaze and items after START_GAME event", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));

    await waitFor(() => {
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy(); // Correct item is 'left' due to mock
      expect(screen.getAllByTestId("game-item-left").length).toBe(1);
      expect(screen.getAllByTestId("game-item-right").length).toBe(1);
    });
  });

  it("should display the character with head turn for CL2", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    fireEvent.press(screen.getByTestId("game-item-right")); // Incorrect selection to get to CL2
    await waitFor(() => {
      expect(screen.getByText("@/assets/face-right.png")).toBeTruthy();
    });
  });

  it("should display the character pointing for CL3", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    fireEvent.press(screen.getByTestId("game-item-right")); // CL2
    fireEvent.press(screen.getByTestId("game-item-right")); // CL3
    await waitFor(() => {
      expect(screen.getByText("@/assets/point-right.png")).toBeTruthy();
    });
  });

  it("should display the character with open hands when awaiting drag", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    fireEvent.press(screen.getByTestId("game-item-left")); // Correct selection
    await waitFor(() => {
      expect(screen.getByText("@/assets/open-hands.png")).toBeTruthy();
    });
  });

  it("should display four items for difficulty level 2", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    fireEvent.press(screen.getByTestId("game-item-left"));
    fireEvent.press(screen.getByTestId("drag-successful-button")); // This should transition to DL2
    await waitFor(() => {
      expect(screen.getAllByTestId("game-item-top-left").length).toBe(1);
      expect(screen.getAllByTestId("game-item-top-right").length).toBe(1);
      expect(screen.getAllByTestId("game-item-bottom-left").length).toBe(1);
      expect(screen.getAllByTestId("game-item-bottom-right").length).toBe(1);
    });
  });

  it("should display the correct item with a glow for CL4", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    fireEvent.press(screen.getByTestId("game-item-right")); // CL2
    fireEvent.press(screen.getByTestId("game-item-right")); // CL3
    fireEvent.press(screen.getByTestId("game-item-right")); // CL4
    await waitFor(() => {
      expect(screen.getByTestId("game-item-left")).toHaveStyle({
        borderColor: "gold",
      }); // Correct item is 'left' due to mock
    });
  });

  it("should still have the End Session button", async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: "START_GAME" }));
    await waitFor(() =>
      expect(screen.getByText("@/assets/gaze-left.png")).toBeTruthy()
    ); // Wait for initial transition
    expect(screen.getByText("End Session")).toBeTruthy();
  });
});
