import { gameMachine } from "@/scripts/gameState";
import { GameProvider } from "@/src/GameContext";
import { Stack } from "expo-router";

export default function ParticipantLayout() {
  return (
    <GameProvider machine={gameMachine}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Participant Details" }} />
        <Stack.Screen name="game" options={{ title: "Game" }} />
      </Stack>
    </GameProvider>
  );
}
