import { ExerciseType } from '../types';

export interface RoutineExercise {
  name: string;
  detail: string;
  image?: string;
  exerciseId?: string; // Optional reference to standard or custom exercise
  category?: '练前热身' | '正式训练' | '练后拉伸' | string;
  type?: ExerciseType;
  settings?: {
    sets?: number;
    reps?: number;
    weight?: number;
    time?: number;
    distance?: number;
    setList?: {
      reps?: number;
      weight?: number;
      time?: number;
      distance?: number;
    }[];
  };
}

export interface Routine {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  exercises: RoutineExercise[];
  createdAt?: number;
}

export interface TrainingPlan {
  _id?: string;
  title: string;
  scene?: string; // equipment or scene like '健身房'
  description?: string;
  coverImage?: string; // Cloudbase file ID
  routines: Routine[];
  createdAt?: number;
}
