import { db } from './cloudbase';

export async function importTuesdayPlan(userId: string) {
  const uid = String(userId);
  
  // 1. Define Exercises
  const exercises = [
    { name: "泡沫轴滚动", type: "time", equipment: "泡沫轴", primaryMuscle: "全身", secondaryMuscles: [] },
    { name: "90/90呼吸训练", type: "reps_only", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
    { name: "猫牛式屈伸", type: "reps_only", equipment: "徒手", primaryMuscle: "下背部", secondaryMuscles: ["腹肌"] },
    { name: "死虫式", type: "reps_only", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
    { name: "胸椎旋转", type: "reps_only", equipment: "徒手", primaryMuscle: "上背部", secondaryMuscles: [] },
    { name: "帕洛夫抗旋推举", type: "reps_only", equipment: "阻力带", primaryMuscle: "腹肌", secondaryMuscles: ["肩部"] },
    { name: "双臂悬挂", type: "time", equipment: "悬挂带", primaryMuscle: "前臂", secondaryMuscles: ["背阔肌"] },
    { name: "深蹲（杠铃）", type: "weight_reps", equipment: "杠铃", primaryMuscle: "股四头肌", secondaryMuscles: ["臀大肌", "腘绳肌"] },
    { name: "卧推（哑铃）", type: "weight_reps", equipment: "哑铃", primaryMuscle: "胸部", secondaryMuscles: ["三头肌", "肩部"] },
    { name: "俯身划船（杠铃）", type: "weight_reps", equipment: "杠铃", primaryMuscle: "背阔肌", secondaryMuscles: ["上背部", "二头肌"] },
    { name: "侧平举（哑铃）", type: "weight_reps", equipment: "哑铃", primaryMuscle: "肩部", secondaryMuscles: [] },
    { name: "滑轮卷腹", type: "weight_reps", equipment: "器械", primaryMuscle: "腹肌", secondaryMuscles: [] },
    { name: "髂腰肌拉伸", type: "time", equipment: "徒手", primaryMuscle: "其他", secondaryMuscles: [] },
    { name: "门框/墙角扩胸", type: "time", equipment: "徒手", primaryMuscle: "胸部", secondaryMuscles: [] },
    { name: "真空腹练习", type: "time", equipment: "徒手", primaryMuscle: "腹肌", secondaryMuscles: [] },
    { name: "静态凯格尔冷却", type: "reps_only", equipment: "徒手", primaryMuscle: "其他", secondaryMuscles: [] }
  ];

  console.log('Importing exercises...');
  for (const ex of exercises) {
    const id = `preset_${ex.name}`;
    await db.collection('customExercises').doc(id).set({
      ...ex,
      id,
      userId: uid,
      isCustom: true,
      createdAt: Date.now()
    });
  }

  // 2. Define Plan
  const plan = {
    userId: uid,
    title: "周二基础力量训练计划",
    createdAt: Date.now(),
    sections: [
      { id: "warmup", title: "练前热身" },
      { id: "main", title: "正式训练" },
      { id: "stretch", title: "练后拉伸" }
    ],
    items: [
      // Warmup
      { id: "item_1", exerciseId: "preset_泡沫轴滚动", sectionId: "warmup", targetSets: [{ id: "s1", time: 300, setType: "normal", completed: false }] },
      { id: "item_2", exerciseId: "preset_90/90呼吸训练", sectionId: "warmup", targetSets: [{ id: "s2", reps: 20, setType: "normal", completed: false }] },
      { id: "item_3", exerciseId: "preset_猫牛式屈伸", sectionId: "warmup", targetSets: [{ id: "s3", reps: 20, setType: "normal", completed: false }] },
      { id: "item_4", exerciseId: "preset_死虫式", sectionId: "warmup", targetSets: [{ id: "s4", reps: 20, setType: "normal", completed: false }] },
      { id: "item_5", exerciseId: "preset_胸椎旋转", sectionId: "warmup", targetSets: [{ id: "s5", reps: 20, setType: "normal", completed: false }] },
      { id: "item_6", exerciseId: "preset_帕洛夫抗旋推举", sectionId: "warmup", restTime: 30, targetSets: [
        { id: "s6_1", reps: 15, setType: "normal", completed: false },
        { id: "s6_2", reps: 15, setType: "normal", completed: false }
      ]},
      { id: "item_7", exerciseId: "preset_双臂悬挂", sectionId: "warmup", targetSets: [{ id: "s7", time: 60, setType: "normal", completed: false }] },
      
      // Main
      { id: "item_8", exerciseId: "preset_深蹲（杠铃）", sectionId: "main", restTime: 90, targetSets: Array(4).fill(0).map((_, i) => ({ id: `s8_${i}`, weight: 50, reps: 10, setType: "normal", completed: false })) },
      { id: "item_9", exerciseId: "preset_卧推（哑铃）", sectionId: "main", restTime: 90, targetSets: Array(4).fill(0).map((_, i) => ({ id: `s9_${i}`, weight: 40, reps: 10, setType: "normal", completed: false })) },
      { id: "item_10", exerciseId: "preset_俯身划船（杠铃）", sectionId: "main", restTime: 90, targetSets: Array(4).fill(0).map((_, i) => ({ id: `s10_${i}`, weight: 50, reps: 10, setType: "normal", completed: false })) },
      { id: "item_11", exerciseId: "preset_侧平举（哑铃）", sectionId: "main", restTime: 60, targetSets: Array(4).fill(0).map((_, i) => ({ id: `s11_${i}`, weight: 16, reps: 12, setType: "normal", completed: false })) },
      { id: "item_12", exerciseId: "preset_滑轮卷腹", sectionId: "main", restTime: 60, targetSets: Array(4).fill(0).map((_, i) => ({ id: `s12_${i}`, weight: 25, reps: 12, setType: "normal", completed: false })) },
      
      // Stretch
      { id: "item_13", exerciseId: "preset_髂腰肌拉伸", sectionId: "stretch", targetSets: [{ id: "s13", time: 120, setType: "normal", completed: false }] },
      { id: "item_14", exerciseId: "preset_门框/墙角扩胸", sectionId: "stretch", targetSets: [{ id: "s14", time: 120, setType: "normal", completed: false }] },
      { id: "item_15", exerciseId: "preset_真空腹练习", sectionId: "stretch", targetSets: [
        { id: "s15_1", time: 30, setType: "normal", completed: false },
        { id: "s15_2", time: 30, setType: "normal", completed: false },
        { id: "s15_3", time: 30, setType: "normal", completed: false }
      ]},
      { id: "item_16", exerciseId: "preset_静态凯格尔冷却", sectionId: "stretch", targetSets: [{ id: "s16", reps: 20, setType: "normal", completed: false }] }
    ]
  };

  console.log('Importing plan...');
  const { id: newId } = await db.collection('plans').add({
    ...plan,
    createdAt: Date.now()
  });
  console.log('Plan imported with ID:', newId);
  
  return true;
}
