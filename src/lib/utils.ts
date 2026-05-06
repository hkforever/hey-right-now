import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const MUSCLE_TRANSLATIONS: Record<string, string> = {
  'Chest': '胸部',
  'Back': '背部',
  'Legs': '腿部',
  'Shoulders': '肩部',
  'Core': '核心',
  'Arms': '手臂',
  'Biceps': '二头肌',
  'Triceps': '三头肌',
  'Quads': '股四头肌',
  'Hamstrings': '腘绳肌',
  'Glutes': '臀大肌',
  'Calves': '小腿',
  'Forearms': '前臂',
  'Abs': '腹肌',
  'Traps': '斜方肌',
  'Upper Back': '上背部',
  'Lower Back': '下背部',
  'Lats': '背阔肌',
  'Other': '其他'
};

const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  'Barbell': '杠铃',
  'Dumbbell': '哑铃',
  'Bodyweight': '徒手',
  'Machine': '器械',
  'Kettlebell': '壶铃',
  'Cable': '拉力器',
  'Band': '阻力带',
  'Plate': '杠铃片',
  'None': '无',
  'Other': '其他'
};

export function translateMuscle(muscle: string): string {
  return MUSCLE_TRANSLATIONS[muscle] || muscle;
}

export function translateEquipment(equipment: string): string {
  return EQUIPMENT_TRANSLATIONS[equipment] || equipment;
}

export function isVideo(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith('.mp4') || 
    lowerUrl.endsWith('.mov') || 
    lowerUrl.endsWith('.webm') ||
    url.startsWith('data:video/') || 
    url.startsWith('blob:') // Blob URLs are used for local file previews
  );
}

export function calculateVolume(items: { sets: { type?: string, weight?: string | number, reps?: string | number, completed?: boolean }[] }[]): number {
  let volume = 0;
  items.forEach(item => {
    item.sets.forEach(set => {
      if (set.completed && set.weight && set.reps) {
        volume += Number(set.weight) * Number(set.reps);
      }
    });
  });
  return volume;
}

export function calculateExercisePRs(history: any[], exerciseId: string) {
  let maxWeight = 0;
  let maxSetVolume = 0;
  let maxTotalVolume = 0;
  let max1RM = 0;

  history.forEach(log => {
    let workoutTotalVolume = 0;
    log.items?.forEach((item: any) => {
      if (item.exerciseId === exerciseId) {
        let itemTotalVolume = 0;
        item.sets?.forEach((set: any) => {
          if (set.completed) {
            const weight = Number(set.weight) || 0;
            const reps = Number(set.reps) || 0;
            const setVol = weight * reps;
            const oneRM = weight * (36 / (37 - Math.min(reps, 36)));
            
            if (weight > maxWeight) maxWeight = weight;
            if (setVol > maxSetVolume) maxSetVolume = setVol;
            if (oneRM > max1RM) max1RM = oneRM;
            
            itemTotalVolume += setVol;
          }
        });
        workoutTotalVolume += itemTotalVolume;
      }
    });
    if (workoutTotalVolume > maxTotalVolume) maxTotalVolume = workoutTotalVolume;
  });

  return { maxWeight, maxSetVolume, maxTotalVolume, max1RM };
}
export function formatRestTime(seconds: number): string {
  if (seconds === 0 || isNaN(seconds)) return '关闭';
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}分 ${s}秒` : `${m}分`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0分钟";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (h > 0) {
    return `${h}小时 ${m}分钟`;
  }
  return `${m}分钟`;
}
