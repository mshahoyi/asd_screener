# Architecture Plan: On-Device Autism Screening App

This document outlines the architecture for the Autism screening research app, designed as a fully on-device, offline-first application.

## 1. Core Technology

- **Framework:** **[Expo (React Native)](https://expo.dev/)** with TypeScript. This will be a universal app that runs on mobile (iOS, Android) and web. It will contain both the child's game and the researcher dashboard.
- **Local Database:** **[Expo-SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)** with **[Drizzle ORM](https://orm.drizzle.team/)**. This combination provides a robust, type-safe, and Expo Go-compatible solution for all local data storage and querying.
- **Routing:** **[Expo Router](https://docs.expo.dev/router/introduction/)** will manage the stack-based navigation flow.
- **Styling:** **[React Native Paper](https://reactnativepaper.com/)** for UI components.
- **Animation & Gestures:** **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** & **[React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)**.
- **Data Export:** The app will use Expo's `FileSystem` API to generate and share CSV or JSON files of the collected data.
- **State Management:** **[XState](https://xstate.js.org/)** for managing the complex game state logic in a predictable and testable way.

## 2. System Architecture

The entire application will be a single Expo project using a stack-based navigation model.

- **The Researcher Dashboard:** The app's entry point. It will display a list of participants and provide access to creating new participants and exporting data.
- **The Game:** A full-screen, interactive experience for children, launched from the researcher dashboard for a specific participant.
- **Local Data Management:** All data (participants, sessions, trials, events) will be stored in a local SQLite database, managed by Drizzle ORM.

## 3. Data Model

The database schema is defined using Drizzle ORM in the `/db/schema.ts` file. It includes tables for participants, sessions, trials, and events, with appropriate relations. Drizzle Kit is used to manage database migrations.
