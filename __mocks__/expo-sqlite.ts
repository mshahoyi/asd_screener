// Mock for expo-sqlite
export const openDatabaseSync = jest.fn(() => ({
  prepareSync: jest.fn(() => ({
    executeSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 1 })),
    finalizeSync: jest.fn(),
  })),
  closeSync: jest.fn(),
  runSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 1 })),
}));

export const deleteDatabaseSync = jest.fn();

export const SQLiteDatabase = jest.fn();
