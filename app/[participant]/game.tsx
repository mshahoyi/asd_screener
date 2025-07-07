import React, { JSX } from "react";
import { View, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useGame } from "@/src/GameContext";

// Import all assets dynamically
type AssetKey = keyof typeof assets;

const assets = {
  neutral: "@/assets/neutral.png",
  openHands: "@/assets/open-hands.png",
  faceBottomLeft: "@/assets/face-bottom-left.png",
  faceBottomRight: "@/assets/face-bottom-right.png",
  faceLeft: "@/assets/face-left.png",
  faceRight: "@/assets/face-right.png",
  faceTopLeft: "@/assets/face-top-left.png",
  faceTopRight: "@/assets/face-top-right.png",
  gazeBottomLeft: "@/assets/gaze-bottom-left.png",
  gazeBottomRight: "@/assets/gaze-bottom-right.png",
  gazeLeft: "@/assets/gaze-left.png",
  gazeRight: "@/assets/gaze-right.png",
  gazeTopLeft: "@/assets/gaze-top-left.png",
  gazeTopRight: "@/assets/gaze-top-right.png",
  pointBottomLeft: "@/assets/point-bottom-left.png",
  pointBottomRight: "@/assets/point-bottom-right.png",
  pointLeft: "@/assets/point-left.png",
  pointRight: "@/assets/point-right.png",
  pointTopLeft: "@/assets/point-top-left.png",
  pointTopRight: "@/assets/point-top-right.png",
  itemKettleBlue: "@/assets/item-kettle-blue.png",
  itemKettleBronze: "@/assets/item-kettle-bronze.png",
  itemKettleGray: "@/assets/item-kettle-gray.png",
  itemKettleRed: "@/assets/item-kettle-red.png",
  itemSocksCat: "@/assets/item-socks-cat.png",
  itemSocksOrange: "@/assets/item-socks-orange.png",
  itemSocksPink: "@/assets/item-socks-pink.png",
  itemSocksStripes: "@/assets/item-socks-stripes.png",
};

// Helper to get character image based on state, cue level, and correct item position
const getCharacterImage = (
  stateValue: string,
  cueLevel: number,
  correctItem: string
) => {
  if (stateValue === "introduction") {
    return assets.neutral;
  }
  if (stateValue === "awaitingDrag") {
    return assets.openHands;
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  let directionToUse;
  if (cueLevel === 1) {
    // At CL1, character gazes at correct item
    directionToUse = correctItem;
  } else if (cueLevel === 2 || cueLevel === 3) {
    // At CL2 and CL3, character faces/points opposite direction for basic left/right
    if (correctItem === "left") {
      directionToUse = "right";
    } else if (correctItem === "right") {
      directionToUse = "left";
    } else {
      // For other positions, use the correct item direction
      directionToUse = correctItem;
    }
  } else {
    // For CL4 and others, use correct item direction
    directionToUse = correctItem;
  }

  const formattedDirection = directionToUse.split("-").map(capitalize).join("");

  switch (cueLevel) {
    case 1:
      return assets[`gaze${formattedDirection}` as AssetKey];
    case 2:
      return assets[`face${formattedDirection}` as AssetKey];
    case 3:
      return assets[`point${formattedDirection}` as AssetKey];
    case 4:
      return assets.neutral; // Glow is on the item, character is neutral
    default:
      return assets.neutral;
  }
};

// Helper to get game items based on difficulty and correct item
const getGameItems = (
  difficultyLevel: number,
  correctItem: string,
  cueLevel: number,
  send: Function
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const itemSource = assets.itemKettleBlue; // Using one item for simplicity for now

  const positions =
    difficultyLevel === 1
      ? ["left", "right"]
      : ["top-left", "top-right", "bottom-left", "bottom-right"];

  positions.forEach((position) => {
    const isCorrect = position === correctItem;
    const isGlowing = cueLevel === 4 && isCorrect;

    items.push(
      <TouchableOpacity
        key={position}
        onPress={() => send({ type: "SELECTION", selectedPosition: position })}
        style={[styles.gameItemContainer, isGlowing && styles.glowingItem]}
        testID={`game-item-${position}`}
      >
        <Image source={itemSource} style={styles.gameItem} />
      </TouchableOpacity>
    );
  });
  return items;
};

export default function GameScreen() {
  const router = useRouter();
  const { state, send } = useGame();

  const characterImage = getCharacterImage(
    state.value as string,
    state.context.cueLevel,
    state.context.correctItem
  );
  const gameItems = getGameItems(
    state.context.difficultyLevel,
    state.context.correctItem,
    state.context.cueLevel,
    send
  );

  return (
    <View style={styles.container}>
      <Text>Game Screen</Text>
      <Text>Difficulty: {state.context.difficultyLevel}</Text>
      <Text>Cue: {state.context.cueLevel}</Text>
      <Text>State: {state.value as string}</Text>

      <Image
        source={characterImage}
        style={styles.characterImage}
        testID="character-image"
      />

      {state.value !== "introduction" && ( // Conditionally render items and drag buttons
        <View style={styles.itemsContainer}>{gameItems}</View>
      )}

      {state.value !== "introduction" && ( // Conditionally render drag buttons
        <>
          <Button
            title="Drag Successful"
            testID="drag-successful-button"
            onPress={() => send({ type: "DRAG_SUCCESSFUL" })}
          />
          <Button
            title="Drag Failed"
            testID="drag-failed-button"
            onPress={() => send({ type: "DRAG_FAILED" })}
          />
        </>
      )}

      <Button title="End Session" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  characterImage: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginVertical: 20,
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 20,
  },
  gameItemContainer: {
    margin: 10,
  },
  gameItem: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  glowingItem: {
    borderWidth: 3,
    borderColor: "gold",
    borderRadius: 10,
  },
});
