# Architecture Plan: Autism Screening Research App

This document outlines the architecture for the Autism screening research app.

## 1. Core Technologies

### Unified Frontend (Mobile & Web)
- **Framework:** **[Expo (React Native)](https://expo.dev/)** with TypeScript. This single application will contain both the child's game and the researcher dashboard.
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) will manage navigation between the game and dashboard sections.
- **Styling:** [React Native Paper](https://reactnativepaper.com/) for UI components.
- **Animation & Gestures:** [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) & [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/).

### Backend API Server
- **Framework:** **[Next.js](https://nextjs.org/)** with TypeScript, used purely as a backend API endpoint.
- **API:** **[tRPC](https://trpc.io/)** for end-to-end typesafe APIs between the Expo app and the Next.js server.
- **Database:** **[NeonDB](https://neon.tech/)** (PostgreSQL).
- **ORM:** **[PrismaJS](https://www.prisma.io/)**.
- **Authentication:** **[Supabase](https://supabase.com/)** for researcher authentication, managed by the backend.

### Monorepo
- **Package Manager:** **[pnpm](https://pnpm.io/)** with workspaces.

## 2. System Architecture

The application will be a monorepo containing two main packages:

1.  `apps/expo`: The unified frontend application. It includes the game for mobile and a web-based researcher dashboard. Researchers will access their tools via the web deployment of this app.
2.  `apps/next`: The backend tRPC server. This application will **not** serve any significant UI. Its sole purpose is to provide the API for the Expo app to consume.

A `packages/trpc` directory will be used to share the tRPC router definition between the frontend and backend.

### 2.1. Frontend (`apps/expo`)
The Expo app will handle all user interaction.
- **Game:** A full-screen, interactive experience for children on mobile devices.
- **Researcher Dashboard:** A secure, password-protected web interface for researchers, built using React Native web components.
- **Data Sync:** The app will communicate with the Next.js backend via tRPC to send and receive all participant and trial data.

### 2.2. Backend (`apps/next`)
The Next.js application will serve as the data and authentication hub.
- **tRPC API:** Exposes all the methods needed for the Expo app to function (e.g., `createParticipant`, `saveTrial`, `exportData`).
- **Database Interaction:** All database operations will be handled by the backend through Prisma.

### 2.3. Database & Schema
The database will be a PostgreSQL database on NeonDB, managed by Prisma. The schema remains the same.

```prisma
// (The Prisma schema from the original plan remains here)
model Researcher {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
model Participant {
  id          String    @id @default(cuid())
  anonymousId String    @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sessions    Session[]
}
model Session {
  id            String     @id @default(cuid())
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id])
  createdAt     DateTime   @default(now())
  trials        Trial[]
}
model Trial {
  id           String   @id @default(cuid())
  sessionId    String
  session      Session  @relation(fields: [sessionId], references: [id])
  item         String
  correct      Boolean
  responseTime Int
  hintLevel    Int
  dragPath     Json
  createdAt    DateTime @default(now())
}
```

## 3. Project Structure (Monorepo)

```
.
├── apps/
│   ├── expo/
│   ��   ├── app/
│   │   │   ├── (game)/
│   │   │   └── (researcher)/
│   │   └── ...
│   └── next/
│       └── src/
│           └── server/
│               └── routers/
│                   └── ...
├── packages/
│   └── trpc/
│       ├── index.ts
│       └── package.json
├── prisma/
│   └── schema.prisma
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## 4. Deployment

- **Frontend (Web Dashboard):** The web version of the Expo app will be deployed to Vercel.
- **Backend API:** The Next.js tRPC server will be deployed to Vercel as a serverless backend.
- **Database:** Hosted on NeonDB.
- **Authentication:** Handled by Supabase.