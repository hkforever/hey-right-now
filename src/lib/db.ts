import { openDB, IDBPDatabase } from 'idb';
import { Exercise } from '../types';

const DB_NAME = 'workout_app_db_v2';
const STORE_NAME = 'standard_exercises';
const VERSION = 6;

interface WorkoutDB {
  [STORE_NAME]: {
    key: string;
    value: Exercise;
  };
}

let dbPromise: Promise<IDBPDatabase<WorkoutDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WorkoutDB>(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 6 && db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const cacheStandardExercises = async (exercises: Exercise[]) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Clear old data for a fresh start or simple update
  await store.clear();
  
  for (const ex of exercises) {
    await store.put(ex);
  }
  return tx.done;
};

export const getCachedStandardExercises = async (): Promise<Exercise[]> => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const clearExerciseCache = async () => {
  const db = await getDB();
  return db.clear(STORE_NAME);
};
