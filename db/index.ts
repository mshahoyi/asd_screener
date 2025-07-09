import { drizzle } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseSync, openDatabaseSync } from 'expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';

deleteDatabaseSync('database.db');

const expoDb = openDatabaseSync('database.db');
export const db = drizzle(expoDb);

// This will run the migrations on every app startup
migrate(db, migrations);
