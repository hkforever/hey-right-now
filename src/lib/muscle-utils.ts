import { Slug, ExtendedBodyPart } from 'react-muscle-highlighter';
import { WorkoutLog, Exercise } from '../types';

export const muscleMapping: Record<string, Slug> = {
  '胸部': 'chest',
  '背阔肌': 'upper-back',
  '二头肌': 'biceps',
  '腹肌': 'abs',
  '股四头肌': 'quadriceps',
  '腘绳肌': 'hamstring',
  '肩部': 'deltoids',
  '颈部': 'neck',
  '内收肌': 'adductors',
  '前臂': 'forearm',
  '三头肌': 'triceps',
  '上背部': 'upper-back',
  '下背部': 'lower-back',
  '小腿': 'calves',
  '斜方肌': 'trapezius',
  '臀大肌': 'gluteal',
  '外展肌': 'adductors',
};

export const muscleDisplayOrder = [
  '腹肌', '肩部', '二头肌', '三头肌', '前臂', '股四头肌', '腘绳肌', '小腿', '背阔肌', '上背部', '下背部', '斜方肌', '臀大肌'
];

export const allSlugs: Slug[] = [
  "abs", "adductors", "ankles", "biceps", "calves", "chest", "deltoids", "feet", 
  "forearm", "gluteal", "hamstring", "hands", "hair", "head", "knees", 
  "lower-back", "neck", "obliques", "quadriceps", "tibialis", "trapezius", "triceps", "upper-back"
];

export function getMuscleData(workout: WorkoutLog | null, allExercises: Exercise[]): ExtendedBodyPart[] {
  const muscleGroups: Record<string, number> = {};
  
  if (workout) {
    workout.items.forEach(item => {
      const exercise = allExercises.find(e => e.id === item.exerciseId);
      if (!exercise) return;

      const completedSets = item.sets.filter(s => s.completed).length;
      if (completedSets === 0) return;

      const muscle = exercise.primaryMuscle;
      muscleGroups[muscle] = (muscleGroups[muscle] || 0) + completedSets;
    });
  }

  return allSlugs.map(slug => {
    const trainedEntry = Object.entries(muscleGroups).find(([muscle]) => muscleMapping[muscle] === slug);
    
    if (trainedEntry) {
      const [, count] = trainedEntry;
      const opacity = Math.min(0.2 + (count / 10) * 0.8, 1);
      const color = `rgba(59, 130, 246, ${opacity})`;
      return {
        slug,
        color,
        intensity: count,
      } as ExtendedBodyPart;
    }

    return {
      slug,
      color: '#E5E7EB', // 浅灰色底色
    } as ExtendedBodyPart;
  });
}
