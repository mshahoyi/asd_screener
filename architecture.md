# Architecture Plan: On-Device Autism Screening App

This document outlines the architecture for the Autism screening research app, designed as a fully on-device, offline-first application.

## 1. Core Technology

- **Framework:** **[Expo (React Native)](https://expo.dev/)** with TypeScript. This will be a universal app that runs on mobile (iOS, Android) and web. It will contain both the child's game and the researcher dashboard.
- **Local Database:** **[WatermelonDB](https://github.com/Nozbe/WatermelonDB)**. A high-performance reactive database framework built for React Native. It will handle all data logging and querying locally on the device.
- **Routing:** **[Expo Router](https://docs.expo.dev/router/introduction/)** will manage the stack-based navigation flow.
- **Styling:** **[React Native Paper](https://reactnativepaper.com/)** for UI components.
- **Animation & Gestures:** **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** & **[React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)**.
- **Data Export:** The app will use Expo's `FileSystem` API to generate and share CSV or JSON files of the collected data.
- **State Management:** **[XState](https://xstate.js.org/)** for managing the complex game state logic in a predictable and testable way.

## 2. System Architecture

The entire application will be a single Expo project using a stack-based navigation model.

- **The Researcher Dashboard:** The app's entry point. It will display a list of participants and provide access to creating new participants and exporting data.
- **The Game:** A full-screen, interactive experience for children, launched from the researcher dashboard for a specific participant.
- **Local Data Management:** All data (participants, sessions, trials) will be stored in the local WatermelonDB database on the device.

## 3. Game Architecture: An Event-Driven Approach

To ensure a clean separation of concerns, the game screen follows an event-driven architecture that decouples UI rendering from business logic and side effects.

- **`GameScreen.tsx` (UI Layer):** This component is responsible *only* for rendering the user interface based on the current state of the game. It listens for user interactions (e.g., taps, drags) and dispatches corresponding events to the `GameEventManager`. It does not contain any game logic or side-effect-handling code.

- **`GameEventManager.tsx` (Side Effect Layer):** This component acts as the central hub for all side effects. It subscribes to the state machine and, upon detecting a state change, triggers the appropriate actions, such as:
    - **Playing Sounds:** Using a `useSound` hook to manage audio playback. It can also dispatch events back to the state machine when a sound completes (e.g., starting the game after the intro audio finishes).
    - **Logging Interactions:** Capturing and storing every user interaction and system event.
    - **Haptic Feedback:** Triggering device vibrations for a more engaging experience.

- **`gameState.ts` (State Logic Layer):** This is an **XState state machine** that represents the core logic of the game. It receives events from the `GameEventManager`, determines the next state, and updates its context accordingly. It is a pure function, making it highly predictable and testable in isolation.

- **`useSound.ts` (Sound Service):** A custom React hook that encapsulates the `expo-av` library to load, play, and unload sounds. It provides a simple interface to the `GameEventManager` and handles the complexities of audio lifecycle management.

This architecture ensures that each part of the system has a single responsibility, making the codebase easier to understand, test, and maintain.

## 4. Data Model (WatermelonDB)

```javascript
// db/models/Participant.js
import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export default class Participant extends Model {
  static table = 'participants'
  static associations = {
    sessions: { type: 'has_many', foreignKey: 'participant_id' },
  }
  @field('anonymous_id') anonymousId
  @field('age') age
  @field('gender') gender
  @field('condition') condition
  @field('note') note
  @relation('session', 'participant_id') sessions
}

// db/models/Session.js
import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export default class Session extends Model {
  static table = 'sessions'
  static associations = {
    trials: { type: 'has_many', foreignKey: 'session_id' },
  }
  @field('participant_id') participantId
  @relation('trial', 'session_id') trials
}

// db/models/Trial.js
import { Model } from '@nozbe/watermelondb'
import { field } from '@nozbe/watermelondb/decorators'

export default class Trial extends Model {
  static table = 'trials'
  @field('item') item
  @field('correct') correct
  @field('response_time') responseTime
  @field('hint_level') hintLevel
  @field('drag_path') dragPath // Stored as a JSON string
}
```


