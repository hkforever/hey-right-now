export interface UserStats {
  gender: 'male' | 'female';
  bodyweight: number;
  age?: number;
  height?: number; // cm
  bodyFat?: number; // %
  neck?: number; // cm
  shoulder?: number; // cm
  chest?: number; // cm
  waist?: number; // cm
  hip?: number; // cm
  arm?: number; // cm
  leftArm?: number; // cm
  rightArm?: number; // cm
  forearm?: number; // cm
  leftForearm?: number; // cm
  rightForearm?: number; // cm
  thigh?: number; // cm
  leftThigh?: number; // cm
  rightThigh?: number; // cm
  calf?: number; // cm
  leftCalf?: number; // cm
  rightCalf?: number; // cm
}

export type ExerciseType = 
  | 'weight_reps' 
  | 'reps_only' 
  | 'weighted_bodyweight' 
  | 'assisted_bodyweight' 
  | 'time' 
  | 'time_weight' 
  | 'distance_time' 
  | 'weight_distance'
  | 'bodyweight'; // Keeping 'bodyweight' for backward compatibility if any data uses it

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  equipment: string;
  category: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  isCustom?: boolean;
  isStandardOverride?: boolean;
  media?: string; // This will remain as the thumbnail/primary image
  videoUrl?: string; // Legacy single video
  videos?: { url: string; title?: string }[]; // New multiple videos
  videos_zh?: { url: string; title?: string }[]; // Optional Chinese titles
  instruction_steps?: {
    en?: string[];
    zh?: string[];
  };
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  setType: SetType;
  weight?: number | string; // Use string so we can have empty inputs '' instead of 0
  reps?: number | string;
  time?: number | string;
  distance?: number | string;
  rpe?: number | string;
  completed: boolean;
  achievements?: string[]; // e.g., 'max_weight', 'max_set_volume'
}

export interface PlanItem {
  id: string;
  exerciseId: string;
  type?: ExerciseType; // Override exercise type
  notes: string;
  restTime: number; // in seconds
  targetSets: WorkoutSet[];
  sectionId?: string;
}

export interface PlanSection {
  id: string;
  title: string;
}

export interface Plan {
  id: string;
  title: string;
  createdAt: number;
  items: PlanItem[];
  sections?: PlanSection[];
}

export interface WorkoutItem {
  id: string;
  exerciseId: string;
  type?: ExerciseType; // Override exercise type
  notes: string;
  restTime: number;
  sets: WorkoutSet[];
  sectionId?: string;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface WorkoutLog {
  id: string;
  planId?: string; 
  title: string;
  startTime: number;
  endTime?: number;
  volume: number; 
  items: WorkoutItem[];
  sections?: PlanSection[];
  notes?: string;
  mediaItems?: MediaItem[];
}

export const defaultExercises: Exercise[] = [];
