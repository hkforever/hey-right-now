import { Slug, ExtendedBodyPart } from 'react-muscle-highlighter';
import { WorkoutLog, Exercise } from '../types';

export const MUSCLE_HIERARCHY = [
  {
    name: '胸部',
    muscles: [
      { name: '胸肌', slug: 'chest' as Slug },
    ]
  },
  {
    name: '背部',
    muscles: [
      { name: '背阔肌', slug: 'upper-back' as Slug },
      { name: '斜方肌', slug: 'trapezius' as Slug },
      { name: '上背部', slug: 'upper-back' as Slug },
      { name: '下背部', slug: 'lower-back' as Slug },
    ]
  },
  {
    name: '肩部',
    muscles: [
      { name: '三角肌', slug: 'deltoids' as Slug },
    ]
  },
  {
    name: '手臂',
    muscles: [
      { name: '肱二头肌', slug: 'biceps' as Slug },
      { name: '肱三头肌', slug: 'triceps' as Slug },
      { name: '前臂', slug: 'forearm' as Slug },
    ]
  },
  {
    name: '核心',
    muscles: [
      { name: '腹肌', slug: 'abs' as Slug },
      { name: '腹斜肌', slug: 'obliques' as Slug },
    ]
  },
  {
    name: '臀部',
    muscles: [
      { name: '臀大肌', slug: 'gluteal' as Slug },
    ]
  },
  {
    name: '腿部',
    muscles: [
      { name: '股四头肌', slug: 'quadriceps' as Slug },
      { name: '腘绳肌', slug: 'hamstring' as Slug },
      { name: '内收肌', slug: 'adductors' as Slug },
      { name: '小腿', slug: 'calves' as Slug },
    ]
  },
  {
    name: '其他',
    muscles: [
      { name: '颈部', slug: 'neck' as Slug },
      { name: '全身', slug: 'abs' as Slug }, // Fallback for Highlighter
    ]
  }
];

export const muscleMapping: Record<string, Slug> = {
  '胸部': 'chest',
  '胸肌': 'chest',
  '背部': 'upper-back',
  '背阔肌': 'upper-back',
  '二头肌': 'biceps',
  '肱二头肌': 'biceps',
  '腹肌': 'abs',
  '核心': 'abs',
  '股四头肌': 'quadriceps',
  '腘绳肌': 'hamstring',
  '肩部': 'deltoids',
  '三角肌': 'deltoids',
  '颈部': 'neck',
  '内收肌': 'adductors',
  '前臂': 'forearm',
  '三头肌': 'triceps',
  '肱三头肌': 'triceps',
  '上背部': 'upper-back',
  '下背部': 'lower-back',
  '小腿': 'calves',
  '斜方肌': 'trapezius',
  '臀大肌': 'gluteal',
  '臀部': 'gluteal',
  '外展肌': 'adductors',
  '腹斜肌': 'obliques',
};

export const muscleDisplayOrder = [
  '胸肌', '三角肌', '肱二头肌', '肱三头肌', '前臂', '腹肌', '背阔肌', '上背部', '下背部', '斜方肌', '臀大肌', '股四头肌', '腘绳肌', '小腿'
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
