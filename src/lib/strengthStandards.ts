export interface StrengthStandard {
  male: [number, number, number, number]; // [Novice, Intermediate, Advanced, Elite] - multiplier of bodyweight
  female: [number, number, number, number];
}

// These are approximate Symmetric Strength standards (1RM / Bodyweight)
const STANDARDS: Record<string, StrengthStandard> = {
  // 杠铃及基础复合动作
  squat: { male: [1.0, 1.3, 1.7, 2.1], female: [0.6, 0.9, 1.2, 1.5] },
  front_squat: { male: [0.75, 1.05, 1.35, 1.7], female: [0.45, 0.7, 1.0, 1.2] },
  bench: { male: [0.7, 1.0, 1.3, 1.6], female: [0.4, 0.6, 0.8, 1.1] },
  incline_bench: { male: [0.55, 0.8, 1.05, 1.3], female: [0.3, 0.5, 0.7, 0.9] },
  deadlift: { male: [1.2, 1.5, 2.0, 2.5], female: [0.7, 1.1, 1.5, 1.9] },
  rdl: { male: [1.0, 1.2, 1.6, 2.0], female: [0.6, 0.9, 1.2, 1.5] },
  press: { male: [0.5, 0.7, 0.9, 1.1], female: [0.3, 0.4, 0.6, 0.8] },
  row: { male: [0.6, 0.9, 1.2, 1.5], female: [0.4, 0.6, 0.8, 1.1] },
  
  // 臀腿器械及其他
  hip_thrust: { male: [1.0, 1.4, 1.9, 2.4], female: [0.8, 1.2, 1.7, 2.2] },
  leg_press: { male: [1.5, 2.2, 3.0, 3.8], female: [1.0, 1.6, 2.2, 2.8] },
  lat_pulldown: { male: [0.6, 0.85, 1.1, 1.4], female: [0.4, 0.6, 0.8, 1.0] },
  curl: { male: [0.25, 0.35, 0.5, 0.65], female: [0.15, 0.25, 0.35, 0.45] },

  // 哑铃动作 (基于双手哑铃重量总和，约为杠铃的80%左右)
  db_bench: { male: [0.55, 0.8, 1.05, 1.3], female: [0.3, 0.5, 0.65, 0.9] },
  db_incline_bench: { male: [0.45, 0.65, 0.85, 1.05], female: [0.25, 0.4, 0.55, 0.75] },
  db_press: { male: [0.35, 0.5, 0.7, 0.9], female: [0.2, 0.3, 0.45, 0.6] },
  db_row: { male: [0.5, 0.7, 1.0, 1.2], female: [0.3, 0.5, 0.7, 0.9] },
  db_curl: { male: [0.2, 0.3, 0.4, 0.55], female: [0.1, 0.2, 0.3, 0.4] }
};

export const LEVEL_NAMES = ['新手', '中级', '高级', '精英'];
export const LEVEL_PERCENTS = [31, 65, 88, 98];

export function determineExerciseStandard(exerciseName: string): StrengthStandard | null {
  const name = exerciseName.toLowerCase();
  
  // 优先匹配哑铃类动作
  if (name.includes('哑铃')) {
    if (name.includes('上斜') && name.includes('推')) return STANDARDS.db_incline_bench;
    if (name.includes('卧推') || name.includes('推胸')) return STANDARDS.db_bench;
    if (name.includes('推举') || name.includes('肩推')) return STANDARDS.db_press;
    if (name.includes('划船')) return STANDARDS.db_row;
    if (name.includes('弯举')) return STANDARDS.db_curl;
    // 默认推类
    if (name.includes('推')) return STANDARDS.db_bench;
  }
  
  // 杠铃及器械类动作
  if (name.includes('罗马尼亚')) return STANDARDS.rdl;
  if (name.includes('前蹲')) return STANDARDS.front_squat;
  if (name.includes('深蹲') && !name.includes('高脚杯') && !name.includes('保加利亚')) return STANDARDS.squat;
  
  if (name.includes('上斜') && name.includes('推')) return STANDARDS.incline_bench;
  if (name.includes('卧推') && !name.includes('下斜')) return STANDARDS.bench;
  
  if (name.includes('硬拉')) return STANDARDS.deadlift;
  if ((name.includes('推举') || name.includes('肩推')) && !name.includes('腿')) return STANDARDS.press;
  if (name.includes('划船')) return STANDARDS.row;
  
  if (name.includes('臀推') || name.includes('臀桥')) return STANDARDS.hip_thrust;
  if (name.includes('腿举') || name.includes('倒蹬')) return STANDARDS.leg_press;
  if (name.includes('下拉')) return STANDARDS.lat_pulldown;
  if (name.includes('弯举')) return STANDARDS.curl;
  
  // 其他如果不匹配，则不提供评级
  return null;
}

export function getStrengthThresholds(
  bodyweight: number,
  gender: 'male' | 'female',
  exerciseName: string,
  age?: number
) {
  const standard = determineExerciseStandard(exerciseName);
  if (!standard) return null;

  let limits = standard[gender];
  if (age && age > 0) {
    const ageFactor = getAgeAdjustment(age);
    limits = limits.map(v => v * ageFactor) as [number, number, number, number];
  }

  return limits.map(multiplier => multiplier * bodyweight);
}

export function getAgeAdjustment(age: number): number {
  if (age < 14) return 0.7;
  if (age < 16) return 0.85;
  if (age < 18) return 0.95;
  if (age <= 35) return 1.0;
  if (age <= 40) return 0.95;
  if (age <= 45) return 0.9;
  if (age <= 50) return 0.85;
  if (age <= 55) return 0.8;
  if (age <= 60) return 0.75;
  if (age <= 65) return 0.7;
  if (age <= 70) return 0.65;
  if (age <= 75) return 0.6;
  return 0.5;
}

export function evaluateStrengthLevel(
  oneRepMax: number, 
  bodyweight: number, 
  gender: 'male' | 'female', 
  exerciseName: string,
  age?: number
) {
  const standard = determineExerciseStandard(exerciseName);
  if (!standard) return null;

  const ratio = oneRepMax / bodyweight;
  let limits = standard[gender];
  
  if (age && age > 0) {
    const ageFactor = getAgeAdjustment(age);
    limits = limits.map(v => v * ageFactor) as [number, number, number, number];
  }

  let levelIndex = 0;
  if (ratio >= limits[3]) levelIndex = 3;
  else if (ratio >= limits[2]) levelIndex = 2;
  else if (ratio >= limits[1]) levelIndex = 1;
  else if (ratio >= limits[0]) levelIndex = 0;
  if (ratio < limits[0]) {
    return { 
      levelIndex: 0, 
      currentLevel: '新手', 
      percent: 10, 
      isBelowNovice: true,
      nextLevelWeight: limits[0] * bodyweight,
      nextLevelName: LEVEL_NAMES[0]
    };
  }

  return {
    levelIndex,
    currentLevel: LEVEL_NAMES[levelIndex],
    percent: LEVEL_PERCENTS[levelIndex],
    isBelowNovice: false,
    nextLevelWeight: ratio >= limits[3] ? undefined : limits[levelIndex + 1] * bodyweight,
    nextLevelName: ratio >= limits[3] ? undefined : LEVEL_NAMES[levelIndex + 1]
  };
}
