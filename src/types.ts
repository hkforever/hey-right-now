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
  primaryMuscle: string;
  secondaryMuscles: string[];
  isCustom?: boolean;
  media?: string; // This will remain as the thumbnail/primary image
  videoUrl?: string; // Legacy single video
  videos?: { url: string; title?: string }[]; // New multiple videos
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

export const defaultExercises: Exercise[] = [
  { id: 'preset_foam_rolling', name: "泡沫轴滚动", type: "time", equipment: "泡沫轴", primaryMuscle: "全身", secondaryMuscles: [] },
  { id: 'preset_90_90_breathing', name: "90/90呼吸训练", type: "reps_only", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
  { id: 'preset_cat_cow', name: "猫牛式屈伸", type: "reps_only", equipment: "徒手", primaryMuscle: "下背部", secondaryMuscles: ["腹肌"] },
  { id: 'preset_deadbug', name: "死虫式", type: "reps_only", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
  { id: 'preset_thoracic_rotation', name: "胸椎旋转", type: "reps_only", equipment: "徒手", primaryMuscle: "上背部", secondaryMuscles: [] },
  { id: 'preset_palof_press', name: "帕洛夫抗旋推举", type: "reps_only", equipment: "阻力带", primaryMuscle: "腹肌", secondaryMuscles: ["肩部"] },
  { id: 'preset_dead_hang', name: "双臂悬挂", type: "time", equipment: "悬挂带", primaryMuscle: "前臂", secondaryMuscles: ["背阔肌"] },
  { id: 'preset_squat_barbell', name: "深蹲（杠铃）", type: "weight_reps", equipment: "杠铃", primaryMuscle: "股四头肌", secondaryMuscles: ["臀大肌", "腘绳肌"] },
  { id: 'preset_bench_press_dumbbell', name: "卧推（哑铃）", type: "weight_reps", equipment: "哑铃", primaryMuscle: "胸部", secondaryMuscles: ["三头肌", "肩部"] },
  { id: 'preset_bent_over_row_barbell', name: "俯身划船（杠铃）", type: "weight_reps", equipment: "杠铃", primaryMuscle: "背阔肌", secondaryMuscles: ["上背部", "二头肌"] },
  { id: 'preset_lateral_raise_dumbbell', name: "侧平举（哑铃）", type: "weight_reps", equipment: "哑铃", primaryMuscle: "肩部", secondaryMuscles: [] },
  { id: 'preset_cable_crunch', name: "滑轮卷腹", type: "weight_reps", equipment: "器械", primaryMuscle: "腹肌", secondaryMuscles: [] },
  { id: 'preset_psoas_stretch', name: "髂腰肌拉伸", type: "time", equipment: "徒手", primaryMuscle: "其他", secondaryMuscles: [] },
  { id: 'preset_chest_stretch', name: "门框/墙角扩胸", type: "time", equipment: "徒手", primaryMuscle: "胸部", secondaryMuscles: [] },
  { id: 'preset_stomach_vacuum', name: "真空腹练习", type: "time", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
  { id: 'preset_kegel_cool', name: "静态凯格尔冷却", type: "reps_only", equipment: "徒手", primaryMuscle: "其他", secondaryMuscles: [] }
];
