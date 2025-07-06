# Architecture Plan: On-Device Autism Screening App

This document outlines the architecture for the Autism screening research app, designed as a fully on-device, offline-first application.

## 1. Core Technology

- **Framework:** **[Expo (React Native)](https://expo.dev/)** with TypeScript. This will be a universal app that runs on mobile (iOS, Android) and web. It will contain both the child's game and the researcher dashboard.
- **Local Database:** **[WatermelonDB](https://github.com/Nozbe/WatermelonDB)**. A high-performance reactive database framework built for React Native. It will handle all data logging and querying locally on the device.
- **Routing:** **[Expo Router](https://docs.expo.dev/router/introduction/)** will manage the stack-based navigation flow.
- **Styling:** **[React Native Paper](https://reactnativepaper.com/)** for UI components.
- **Animation & Gestures:** **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** & **[React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)**.
- **Data Export:** The app will use Expo's `FileSystem` API to generate and share CSV or JSON files of the collected data.

## 2. System Architecture

The entire application will be a single Expo project using a stack-based navigation model.

- **The Researcher Dashboard:** The app's entry point. It will display a list of participants and provide access to creating new participants and exporting data.
- **The Game:** A full-screen, interactive experience for children, launched from the researcher dashboard for a specific participant.
- **Local Data Management:** All data (participants, sessions, trials) will be stored in the local WatermelonDB database on the device.

## 3. Data Model (WatermelonDB)

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


