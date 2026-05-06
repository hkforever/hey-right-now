import { db as firebaseDb, auth as firebaseAuth } from './firebase';
import { db as tcbDb } from './cloudbase';
import { collection, getDocs } from 'firebase/firestore';

// Helper to remove undefined values and convert Firebase Timestamps
const cleanData = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle Firebase Timestamps
  if (obj && typeof obj.toMillis === 'function') {
    return obj.toMillis();
  }
  if (obj && obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return obj.seconds * 1000 + Math.floor(obj.nanoseconds / 1000000);
  }

  if (Array.isArray(obj)) return obj.filter(item => item !== undefined).map(item => cleanData(item));
  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      // Don't duplicate IDs inside the document data
      if (key === 'id' || key === '_id') continue;
      newObj[key] = cleanData(value);
    }
  }
  return newObj;
};

// Helper to migrate a specific collection with multiple path/name candidates
const migrateCollection = async (
  firebaseDb: any,
  tcbDb: any,
  firebaseUid: string,
  tcbUserId: string | number,
  tcbCollName: string,
  candidates: string[],
  isNested: boolean = true,
  onLog?: (msg: string) => void
): Promise<number> => {
  let count = 0;
  const { query, where, collection, getDocs } = await import('firebase/firestore');

  // CRITICAL: Always use String to avoid precision loss (> 2^53) for large UIDs
  const targetUserId = String(tcbUserId);

  for (const name of candidates) {
    try {
      let snap: any;
      if (isNested) {
        const path = `users/${firebaseUid}/${name}`;
        onLog?.(`检查 Firebase 路径: ${path}`);
        snap = await getDocs(collection(firebaseDb, path));
      } else {
        onLog?.(`检查 Firebase 集合: ${name} (userId == UID)`);
        snap = await getDocs(query(collection(firebaseDb, name), where('userId', '==', firebaseUid)));
      }

      if (snap && !snap.empty) {
        onLog?.(`✅ Firebase [${name}] 中发现 ${snap.size} 条数据`);
        for (const d of snap.docs) {
          const docData = d.data();
          const docId = d.id;
          const rawData = cleanData(docData);
          
          const payload = {
            ...rawData,
            userId: targetUserId,
            _id: docId,
            // Ensure fields required for sorting/logic exist
            createdAt: rawData.createdAt || rawData.createTime || Date.now(),
            updatedAt: Date.now(),
            // History specific: ensure startTime is a number
            startTime: Number(rawData.startTime || rawData.startTimeMillis || rawData.createdAt || Date.now()),
            // Plan specific
            items: rawData.items || rawData.exercises || [],
            // Exercise specific
            isCustom: tcbCollName === 'customExercises' ? true : (rawData.isCustom ?? false),
          };
          
          try {
            onLog?.(`正在写入 [${tcbCollName}]: ${docId} (UserId: ${typeof targetUserId})`);
            await tcbDb.collection(tcbCollName).doc(docId).set(payload);
            
            // Verify
            const check = await tcbDb.collection(tcbCollName).doc(docId).get();
            if (check.data) {
              onLog?.(`   ✅ 校验成功: ${payload.title || payload.name || docId}`);
              count++;
            } else {
              onLog?.(`   ❌ 校验失败: 数据未成功持久化`);
            }
          } catch (e: any) {
            onLog?.(`❌ 写入异常 [${docId}]: ${e.message}`);
            throw e;
          }
        }
        break; 
      }
    } catch (err: any) {
      onLog?.(`⚠️ 检查 ${name} 时出错: ${err.message}`);
    }
  }
  return count;
};

export async function migrateData(tcbUserId: string | number, onLog?: (msg: string) => void) {
  const firebaseUser = firebaseAuth.currentUser;
  if (!firebaseUser) throw new Error("请先登录 Firebase");

  const results = {
    plans: 0,
    history: 0,
    exercises: 0,
    settings: 0
  };

  const firebaseUid = firebaseUser.uid;
  onLog?.(`🚀 开始迁移任务: ${firebaseUid} -> ${tcbUserId} (TCB UID 类型: ${typeof tcbUserId})`);

  // 1. Plans
  results.plans += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'plans', ['plans', 'WorkoutPlans', 'templates'], true, onLog);
  if (results.plans === 0) {
    results.plans += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'plans', ['plans', 'WorkoutPlans'], false, onLog);
  }

  // 2. History
  results.history += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'history', ['history', 'WorkoutLog', 'workouts', 'logs'], true, onLog);
  if (results.history === 0) {
    results.history += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'history', ['history', 'workouts', 'logs'], false, onLog);
  }

  // 3. Exercises
  results.exercises += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'customExercises', ['customExercises', 'exercises', 'Exercise'], true, onLog);
  if (results.exercises === 0) {
    results.exercises += await migrateCollection(firebaseDb, tcbDb, firebaseUid, tcbUserId, 'customExercises', ['customExercises', 'exercises'], false, onLog);
  }

  // 4. Settings
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    onLog?.(`正在同步设置...`);
    const targetTcbUserId = String(tcbUserId);
    // Nested settings
    const settingsSnap = await getDocs(collection(firebaseDb, `users/${firebaseUid}/settings`));
    if (!settingsSnap.empty) {
      const data = settingsSnap.docs[0].data();
      await tcbDb.collection('settings').doc(targetTcbUserId).set({
        ...cleanData(data),
        _id: targetTcbUserId
      });
      results.settings = 1;
      onLog?.(`✅ 设置同步完成 (嵌套)`);
    } else {
      // Doc by ID
      const userSettingsSnap = await getDocs(collection(firebaseDb, 'settings'));
      const found = userSettingsSnap.docs.find(d => d.id === firebaseUid);
      if (found) {
        await tcbDb.collection('settings').doc(targetTcbUserId).set({
          ...cleanData(found.data()),
          _id: targetTcbUserId
        });
        results.settings = 1;
        onLog?.(`✅ 设置同步完成 (根集合)`);
      }
    }
  } catch (err: any) {
    onLog?.(`⚠️ 设置同步失败: ${err.message}`);
  }

  onLog?.(`🏁 迁移任务结束: ${JSON.stringify(results)}`);
  return results;
}

export async function exportFirebaseData(onLog?: (msg: string) => void) {
  const firebaseUser = firebaseAuth.currentUser;
  if (!firebaseUser) throw new Error("请先登录 Firebase");

  const firebaseUid = firebaseUser.uid;
  const dump: any = {
    uid: firebaseUid,
    exportedAt: new Date().toISOString(),
    collections: {}
  };

  const { query, where, collection, getDocs } = await import('firebase/firestore');

  const configs = [
    { key: 'plans', paths: ['plans', 'WorkoutPlans', 'templates'], nested: true },
    { key: 'history', paths: ['history', 'WorkoutLog', 'workouts', 'logs'], nested: true },
    { key: 'exercises', paths: ['customExercises', 'exercises', 'Exercise'], nested: true },
    { key: 'settings', paths: ['settings'], nested: true }
  ];

  onLog?.(`📦 开始导出 [${firebaseUid}] 的所有原始数据...`);

  for (const cfg of configs) {
    dump.collections[cfg.key] = [];
    for (const pathName of cfg.paths) {
      try {
        const path = `users/${firebaseUid}/${pathName}`;
        onLog?.(`正在尝试路径: ${path}`);
        const snap = await getDocs(collection(firebaseDb, path));
        if (!snap.empty) {
          onLog?.(`✅ 在 ${path} 发现 ${snap.size} 条数据`);
          snap.docs.forEach(d => {
            dump.collections[cfg.key].push({
              ...d.data(),
              _id: d.id,
              _sourcePath: path
            });
          });
        }
      } catch (e: any) {
        onLog?.(`❌ 路径 ${pathName} 失败: ${e.message}`);
      }

      // Check top level too
      try {
        onLog?.(`正在尝试根集合: ${pathName} (userId == UID)`);
        const q = query(collection(firebaseDb, pathName), where('userId', '==', firebaseUid));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
           onLog?.(`✅ 在根集合 ${pathName} 发现 ${qSnap.size} 条数据`);
           qSnap.docs.forEach(d => {
            dump.collections[cfg.key].push({
              ...d.data(),
              _id: d.id,
              _sourcePath: `root/${pathName}`
            });
          });
        }
      } catch (e: any) {
         onLog?.(`❌ 根集合 ${pathName} 失败: ${e.message}`);
      }
    }
  }

  onLog?.(`🎉 数据抓取完成，共计 ${Object.values(dump.collections).flat().length} 条记录`);
  return dump;
}

export async function importData(dump: any, tcbUserId: string | number, tcbDb: any, onLog?: (msg: string) => void) {
  // CRITICAL: Force use string to prevent precision loss for large IDs
  const targetUid = String(tcbUserId);
  const results = { plans: 0, history: 0, exercises: 0, settings: 0 };
  
  onLog?.(`📥 开始尝试解析输入 JSON...`);

  if (!dump) {
    onLog?.(`❌ 错误: JSON 内容为空`);
    throw new Error("JSON 内容为空");
  }

  // Detect and extract collection data
  let collections = dump.collections;
  if (!collections) {
    if (Array.isArray(dump)) {
      onLog?.(`💡 检测到数组格式，尝试自动识别内容类型...`);
      const first = dump[0];
      if (first && (first.startTime || first.workoutId)) collections = { history: dump };
      else if (first && first.exercises) collections = { plans: dump };
      else collections = { exercises: dump };
    } else if (dump.plans || dump.history || dump.exercises || dump.settings) {
      collections = dump;
    } else {
      // Single object case (maybe settings)
      if (dump.equipments || dump.muscles) {
        collections = { settings: [dump] };
      } else {
        onLog?.(`❌ 错误: 无法识别的 JSON 结构`);
        throw new Error("无法识别的 JSON 结构");
      }
    }
  }

  const mapping = {
    plans: 'plans',
    history: 'history',
    exercises: 'customExercises',
    customExercises: 'customExercises',
    settings: 'settings',
    plan: 'plans',
    workout: 'history',
    exercise: 'customExercises'
  };

  onLog?.(`找到集合: ${Object.keys(collections).join(', ')}`);
  onLog?.(`📥 正在导入至用户: "${targetUid}" (确保为字符串类型)`);

  for (const [jsonKey, collName] of Object.entries(mapping)) {
    const rawItems = (collections as any)[jsonKey];
    if (!rawItems) continue;
    
    const itemsArray = Array.isArray(rawItems) 
      ? rawItems 
      : Object.entries(rawItems).map(([id, val]) => ({ ...(val as any), _id: id }));

    if (itemsArray.length === 0) continue;

    onLog?.(`正在处理 [${collName}] (${jsonKey}), 共 ${itemsArray.length} 条记录...`);

    for (const item of itemsArray) {
      try {
        if (collName === 'settings') {
          const payload = { ...cleanData(item), userId: targetUid, _id: targetUid };
          await tcbDb.collection('settings').doc(targetUid).set(payload);
          results.settings = 1;
          continue;
        }

        const docId = String(item._id || item.id || `imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
        const rawData = cleanData(item);
        
        // Build payload with forced string userId
        const payload: any = {
          ...rawData,
          userId: targetUid,
          _id: docId,
          createdAt: Number(rawData.createdAt || rawData.createTime || Date.now()),
          updatedAt: Date.now(),
          startTime: Number(rawData.startTime || rawData.startTimeMillis || rawData.createdAt || Date.now()),
          items: rawData.items || rawData.exercises || [],
          isCustom: collName === 'customExercises' ? true : (rawData.isCustom ?? false)
        };

        // Explicitly remove any existing userId from rawData to ensure our string UID wins
        if (rawData.userId) delete payload.userId;
        payload.userId = targetUid; 

        await tcbDb.collection(collName).doc(docId).set(payload);
        
        const index = itemsArray.indexOf(item);
        if (index % 10 === 0 || index === itemsArray.length - 1) {
           onLog?.(`   进度: ${index + 1}/${itemsArray.length} (${payload.title || payload.name || docId})`);
        }
        
        if (collName === 'plans') results.plans++;
        else if (collName === 'history') results.history++;
        else if (collName === 'customExercises') results.exercises++;
      } catch (e: any) {
        onLog?.(`   ❌ 导入记录失败 [${item._id || 'unknown'}]: ${e.message}`);
      }
    }
  }

  onLog?.(`🎉 导入任务完成: ${JSON.stringify(results)}`);
  return results;
}
