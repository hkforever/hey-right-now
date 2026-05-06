import React, { createContext, useContext, useState, useEffect } from 'react';
import { Plan, WorkoutLog, Exercise, defaultExercises, WorkoutItem, MediaItem, WorkoutSet, UserStats } from './types';
import { auth, db, isCloudBaseConfigured } from './lib/cloudbase';

interface AppState {
  user: any | null; // CloudBase user object
  isLoaded: boolean;
  isAuthReady: boolean;
  plans: Plan[];
  history: WorkoutLog[];
  customExercises: Exercise[];
  equipments: string[];
  muscles: string[];
  activeWorkout: WorkoutLog | null;
  isWorkoutMinimized: boolean;
  setIsWorkoutMinimized: (minimized: boolean) => void;
  previewLogId: string | null;
  setPreviewLogId: (logId: string | null) => void;
  previewExerciseId: string | null;
  setPreviewExerciseId: (exerciseId: string | null) => void;
  userStats: UserStats | null;
  updateUserStats: (stats: UserStats) => void;
  loginError: string | null;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  refreshData: () => Promise<void>;
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  addPlan: (plan: Plan) => void;
  updatePlan: (plan: Plan) => void;
  deletePlan: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  updateWorkoutLog: (log: WorkoutLog) => void;
  deleteWorkoutLog: (id: string) => void;
  startWorkout: (plan?: Plan) => void;
  updateActiveWorkout: (workout: WorkoutLog) => void;
  endActiveWorkout: (summary?: { title: string, notes: string, mediaItems: MediaItem[] }) => void;
  cancelActiveWorkout: () => void;
  addCustomExercise: (exercise: Exercise) => void;
  updateCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
  setEquipments: (equipments: string[]) => void;
  addEquipment: (name: string) => void;
  updateEquipment: (oldName: string, newName: string) => void;
  deleteEquipment: (name: string) => void;
  setMuscles: (muscles: string[]) => void;
  addMuscle: (name: string) => void;
  updateMuscle: (oldName: string, newName: string) => void;
  deleteMuscle: (name: string) => void;
}

const DEFAULT_EQUIPMENTS = [
  '徒手', '杠铃', '杠铃片', '壶铃', '器械', '悬挂带', '哑铃', '阻力带', '其他'
];

const DEFAULT_MUSCLES = [
  '背阔肌', '二头肌', '腹肌', '股四头肌', '腘绳肌', '肩部', '颈部', '内收肌', '前臂', '全身', '三头肌', '上背部', '臀大肌', '外展肌', '下背部', '小腿', '斜方肌', '胸部', '有氧运动', '其他'
];

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [equipments, setEquipmentsState] = useState<string[]>(DEFAULT_EQUIPMENTS);
  const [muscles, setMusclesState] = useState<string[]>(DEFAULT_MUSCLES);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [previewLogId, setPreviewLogId] = useState<string | null>(null);
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const HISTORY_LIMIT = 20;

  // --- LocalStorage Persistence Layer ---
  useEffect(() => {
    // Initial load from local storage
    const savedPlans = localStorage.getItem('workout_plans');
    const savedHistory = localStorage.getItem('workout_history');
    const savedExercises = localStorage.getItem('workout_custom_exercises');
    const savedSettings = localStorage.getItem('workout_settings');

    if (savedPlans) setPlans(JSON.parse(savedPlans));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedExercises) setCustomExercises(JSON.parse(savedExercises));
    if (savedSettings) {
      const s = JSON.parse(savedSettings);
      if (s.muscles) setMusclesState(s.muscles);
      if (s.equipments) setEquipmentsState(s.equipments);
      if (s.activeWorkout) setActiveWorkout(s.activeWorkout);
      if (s.userStats) setUserStats(s.userStats);
    }
    
    // Only set as loaded if CloudBase is NOT configured
    // If it IS configured, we wait for the auth listener to run refreshData
    if (!isCloudBaseConfigured) {
      setIsLoaded(true);
    }
  }, []);

  // Sync to local storage on changes
  useEffect(() => {
    if (plans.length > 0) localStorage.setItem('workout_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    if (history.length > 0) localStorage.setItem('workout_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (customExercises.length > 0) localStorage.setItem('workout_custom_exercises', JSON.stringify(customExercises));
  }, [customExercises]);

  useEffect(() => {
    localStorage.setItem('workout_settings', JSON.stringify({
      muscles,
      equipments,
      activeWorkout,
      userStats
    }));
  }, [muscles, equipments, activeWorkout, userStats]);
  // --- End Persistence Layer ---

  // --- CloudBase Sync Utilities ---
  // A robust wrapper to retry TCB operations on transient network failures
  const withRetry = async <T,>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '').toLowerCase();
        // Only retry on network/timeout related errors
        if (errMsg.includes('timeout') || errMsg.includes('timedout') || errMsg.includes('wsclient') || errMsg.includes('network')) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential-ish backoff
          continue;
        }
        throw err; // For non-network errors (e.g. permissions), throw immediately
      }
    }
    throw lastError;
  };

  const refreshData = async () => {
    if (!isCloudBaseConfigured) return;
    if (!user || !user.uid) return;
    const targetUid = String(user.uid);
    
    try {
      const [plansRes, historyRes, exercisesRes, settingsRes] = await Promise.all([
        db.collection('plans').where({ userId: targetUid }).get(),
        db.collection('history').where({ userId: targetUid }).orderBy('startTime', 'desc').limit(HISTORY_LIMIT).get(),
        db.collection('customExercises').where({ userId: targetUid }).get(),
        db.collection('settings').doc(targetUid).get()
      ]);

      if (plansRes.data) {
        const data = plansRes.data.map((doc: any) => ({ ...doc, id: doc._id || doc.id } as unknown as Plan));
        setPlans(data.sort((a, b) => b.createdAt - a.createdAt));
      }
      
      if (historyRes.data) {
        const data = historyRes.data.map((doc: any) => ({ ...doc, id: doc._id } as unknown as WorkoutLog));
        setHistory(data);
        setHasMoreHistory(data.length === HISTORY_LIMIT);
      }

      if (exercisesRes.data) {
        const data = exercisesRes.data.map((doc: any) => ({ ...doc, id: doc._id || doc.id } as unknown as Exercise));
        setCustomExercises(data);
      }

      const settingsData = settingsRes.data && Array.isArray(settingsRes.data) ? settingsRes.data[0] : settingsRes.data;
      if (settingsData) {
        if (settingsData.activeWorkout !== undefined) setActiveWorkout(settingsData.activeWorkout);
        if (settingsData.muscles) setMusclesState(settingsData.muscles);
        if (settingsData.equipments) setEquipmentsState(settingsData.equipments);
        if (settingsData.userStats) setUserStats(settingsData.userStats);
      }
    } catch (err) {
      if (isCloudBaseConfigured) {
        console.error('[TCB] Manual refresh failed:', err);
      }
    }
  };

  const loadMoreHistory = async () => {
    if (!isCloudBaseConfigured || !user || !user.uid || !hasMoreHistory) return;
    const targetUid = String(user.uid);
    const lastLog = history[history.length - 1];
    if (!lastLog) return;

    try {
      const res = await db.collection('history')
        .where({ 
          userId: targetUid,
          startTime: db.command.lt(lastLog.startTime)
        })
        .orderBy('startTime', 'desc')
        .limit(HISTORY_LIMIT)
        .get();

      if (res.data) {
        const newData = res.data.map((doc: any) => ({ ...doc, id: doc._id } as unknown as WorkoutLog));
        setHistory(prev => [...prev, ...newData]);
        setHasMoreHistory(newData.length === HISTORY_LIMIT);
      }
    } catch (err) {
      console.error('[TCB] Load more history failed:', err);
    }
  };

    // Monitor Auth State
  useEffect(() => {
    if (!isCloudBaseConfigured) {
      setIsAuthReady(true);
      setIsLoaded(true);
      return;
    }
    // TCB Auth listener
    auth.onLoginStateChanged((loginState) => {
      if (loginState) {
        // 兼容多种返回结构，确保 uid 始终存在
        const rUser = (loginState.user || loginState) as any;
        const loggedUser = {
          ...rUser,
          uid: rUser.uid || rUser.userId || rUser.uuid
        };
        setUser(loggedUser);
      } else {
        setUser(null);
        // Clear state on logout
        setPlans([]);
        setHistory([]);
        setCustomExercises([]);
        setEquipmentsState(DEFAULT_EQUIPMENTS);
        setMusclesState(DEFAULT_MUSCLES);
        setActiveWorkout(null);
      }
      setIsAuthReady(true);
      setIsLoaded(true);
    });
  }, []);

  // Sync Data when logged in
  useEffect(() => {
    if (!user || !user.uid || !isCloudBaseConfigured) return;
    
    const targetUid = String(user.uid);
    let watchers: any[] = [];
    let retryTimer: any = null;
    let failCount = 0;

    const startSync = async () => {
      const handleWatchError = (err?: any) => {
        failCount++;
        const errMsg = String(err?.message || err || '').toLowerCase();
        
        // Suppress timeout/wsclient errors from logs entirely
        const isTimeout = errMsg.includes('timeout') || errMsg.includes('timedout') || errMsg.includes('wsclient.send') || errMsg.includes('websocket');
        
        if (failCount > 3 && !isTimeout) {
           console.warn('[TCB] Connection issue, recovering...', errMsg);
        }
        
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (user && user.uid) startSync();
        }, Math.min(30000 * failCount, 120000)); // Increase backoff
      };

      // Always perform an initial fetch to ensure data is there even if watch fails
      try {
        await refreshData();
      } catch (e) {
        // Initial fetch failure is ok
      }

      try {
        if (failCount > 10) {
          // If too many failures, fallback to periodic polling instead of watch
          console.warn('[TCB] Switching to fallback polling mode');
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setInterval(() => {
            if (user && user.uid) refreshData();
          }, 60000);
          return;
        }

        // Cleanup existing watchers
        watchers.forEach(w => { try { w.close(); } catch(e) {} });
        watchers = [];

        const configs = [
          {
            name: 'plans',
            query: db.collection('plans').where({ userId: targetUid }),
            onChange: (snapshot: any) => {
              if (snapshot.docs) {
                const data = snapshot.docs.map((doc: any) => ({ ...doc, id: doc._id || doc.id } as unknown as Plan));
                setPlans(data.sort((a, b) => b.createdAt - a.createdAt));
                failCount = 0;
              }
            }
          },
          {
            name: 'history',
            query: db.collection('history').where({ userId: targetUid }).orderBy('startTime', 'desc').limit(HISTORY_LIMIT),
            onChange: (snapshot: any) => {
              if (snapshot.docs) {
                const data = snapshot.docs.map((doc: any) => ({ ...doc, id: doc._id } as unknown as WorkoutLog));
                setHistory(prev => {
                  const merged = [...data];
                  prev.forEach(p => {
                    if (!merged.find(m => m.id === p.id)) {
                      merged.push(p);
                    }
                  });
                  return merged.sort((a, b) => b.startTime - a.startTime);
                });
                failCount = 0;
              }
            }
          },
          {
            name: 'customExercises',
            query: db.collection('customExercises').where({ userId: targetUid }),
            onChange: (snapshot: any) => {
              if (snapshot.docs) {
                const data = snapshot.docs.map((doc: any) => ({ ...doc, id: doc._id || doc.id } as unknown as Exercise));
                setCustomExercises(data);
                failCount = 0;
              }
            }
          },
          {
            name: 'settings',
            query: db.collection('settings').doc(targetUid),
            onChange: (snapshot: any) => {
              const doc = snapshot.doc || (Array.isArray(snapshot.docs) ? snapshot.docs[0] : snapshot.doc);
              if (doc) {
                if (doc.activeWorkout !== undefined) setActiveWorkout(doc.activeWorkout);
                if (doc.muscles) setMusclesState(doc.muscles);
                if (doc.equipments) setEquipmentsState(doc.equipments);
                failCount = 0;
              }
            }
          }
        ];

        for (const cfg of configs) {
          try {
            const w = cfg.query.watch({
              onChange: cfg.onChange,
              onError: (err: any) => {
                // If it's a timeout error, we don't necessarily want to restart everything immediately
                // but we let handleWatchError decide based on failCount
                handleWatchError(err);
              }
            });
            watchers.push(w);
            // Stagger connections even more (5s) to reduce burst pressure on WebSocket
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (e) {
            handleWatchError(e);
          }
        }

      } catch (err) {
        handleWatchError(err);
      }
    };

    startSync();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      watchers.forEach(w => {
        try { w.close(); } catch(e) {}
      });
    };
  }, [user]);

  // Helper to remove undefined values and ensure critical types
  const cleanData = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.filter(item => item !== undefined).map(item => cleanData(item));
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        // Force userId to string if it exists in data
        if (key === 'userId' && value !== null) {
          newObj[key] = String(value);
        } else if (!['_id', '_openid', '_createTime', '_updateTime'].includes(key)) {
          // Strip TCB system fields at all levels, or at least we know we won't send them
          newObj[key] = cleanData(value);
        }
      }
    }
    return newObj;
  };

  // Auth actions
  const login = async (username?: string, password?: string) => {
    try {
      const trimmedUsername = username?.trim();
      const trimmedPassword = password?.trim();

      if (!trimmedUsername || !trimmedPassword) throw new Error("请输入用户名和密码");
      
      // Username format validation based on TCB regex: ^[0-9a-zA-Z-_.:+ @]{2,48}$
      const usernameRegex = /^[0-9a-zA-Z-_.:+ @]{2,48}$/;
      if (!usernameRegex.test(trimmedUsername)) {
        throw new Error("用户名格式不正确：需为2-48位字母、数字或常用符号，且不支持中文");
      }

      setLoginError(null);
      
      const res = await auth.signInWithPassword({ 
        username: trimmedUsername, 
        password: trimmedPassword 
      }) as any;
      
      // 关键修复：腾讯云验证失败可能返回包含 error 的对象，或者 category 为 INVALID_CREDENTIALS
      if (res && (res.error || res.category === 'INVALID_CREDENTIALS')) {
        throw res.error || res;
      }
      
      // 兼容多种返回结构：res.user, res.loginState.user, 或者 res 本身就是用户信息
      const rawUser = res.user || (res.loginState && res.loginState.user) || (res.uid || res.userId ? res : null);
      
      if (!rawUser) {
        // 如果响应中没有，尝试从 auth 实例直接获取当前状态
        const currentUser = await auth.getLoginState();
        if (currentUser && currentUser.user) {
          const u = currentUser.user as any;
          setUser({ ...u, uid: u.uid || u.userId });
          return;
        }
        throw new Error("登录成功但无法获取用户信息，请刷新页面重试");
      }
      
      const rUser = rawUser as any;
      const loggedUser = {
        ...rUser,
        uid: rUser.uid || rUser.userId || rUser.uuid
      };
      
      setUser(loggedUser);
    } catch (err: any) {
      console.error("[TCB] 登录异常:", err?.message || err);
      let msg = '登录失败，请检查账号密码';
      
      const errorCode = err.code || err.status || '';
      const errMsg = err.message || '';

      if (errMsg.includes('SignInRequest.Username')) {
        msg = '用户名格式不符合要求（需为2-48位且不支持中文）';
      } else if (errorCode === 'AUTH_USER_NOT_EXIST' || errorCode === 'INVALID_CREDENTIALS' || errorCode === 4043 ||
          errMsg.includes('未通过') || errMsg.includes('验证失败')) {
        msg = '用户名或密码错误。如果是新用户，请先“去注册”。';
      } else if (errorCode === 'AUTH_INVALID_PASSWORD') {
        msg = '密码错误，请重新输入';
      } else if (errorCode === 'AUTH_FORBIDDEN') {
        msg = '登录方式未开启，请在控制台开启“用户名密码登录”';
      } else if (errMsg) {
        msg = `登录失败: ${errMsg}`;
      }
      
      setLoginError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setPlans([]);
      setHistory([]);
      setCustomExercises([]);
      // Force page reload to ensure all states are reset and it returns to login screen
      window.location.href = '/';
    } catch (err) {
      console.error("Logout failed", err);
      // Even if signOut fails, try to force a reload to clean up
      window.location.href = '/';
    }
  };

  const ensureUser = () => {
    if (!user) throw new Error("User must be logged in to modify data");
    return user.uid;
  };

  const updateUserStats = async (stats: UserStats) => {
    setUserStats(stats);
    if (!user || user.isAnonymous) return;
    try {
      const settingsData = {
        muscles,
        equipments,
        activeWorkout,
        userStats: stats,
        updatedAt: Date.now()
      };
      await withRetry(() => db.collection('settings').doc(user.uid).set(settingsData));
    } catch (err) {
      console.error('[TCB] updateUserStats failed:', err);
    }
  };

  const addPlan = async (plan: Plan) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(plan) as any;
    const data = { ...cleanObj, userId: uid };
    setPlans(prev => [plan, ...prev]); // Local update
    try {
      await withRetry(() => db.collection('plans').doc(plan.id).set(data));
    } catch (err) {
      console.error('[TCB] addPlan failed after retries:', err);
      throw err;
    }
  };

  const updatePlan = async (plan: Plan) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(plan) as any;
    const data = { ...cleanObj, userId: uid };
    setPlans(prev => prev.map(p => p.id === plan.id ? plan : p)); // Local update
    try {
      await withRetry(() => db.collection('plans').doc(plan.id).update(data));
    } catch (err) {
      console.error('[TCB] updatePlan failed after retries:', err);
      throw err;
    }
  };

  const deletePlan = async (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id)); // Local update
    try {
      await withRetry(() => db.collection('plans').doc(id).remove());
    } catch (err) {
      console.error('[TCB] deletePlan failed after retries:', err);
      throw err;
    }
  };
  
  const deleteWorkoutLog = async (id: string) => {
    setHistory(prev => prev.filter(l => l.id !== id)); // Local update
    try {
      await withRetry(() => db.collection('history').doc(id).remove());
    } catch (err) {
      console.error('[TCB] deleteWorkoutLog failed after retries:', err);
      throw err;
    }
  };

  const updateWorkoutLog = async (log: WorkoutLog) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(log) as any;
    const data = { ...cleanObj, userId: uid };
    setHistory(prev => prev.map(l => l.id === log.id ? log : l)); // Local update
    try {
      await withRetry(() => db.collection('history').doc(log.id).update(data));
    } catch (err) {
      console.error('[TCB] updateWorkoutLog failed after retries:', err);
      throw err;
    }
  };
  
  const addWorkoutLog = async (log: WorkoutLog) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(log) as any;
    const data = { ...cleanObj, userId: uid };
    setHistory(prev => [log, ...prev]); // Local update
    try {
      await withRetry(() => db.collection('history').doc(log.id).set(data));
    } catch (err) {
      console.error('[TCB] addWorkoutLog failed after retries:', err);
      throw err;
    }
  };

  const syncSettings = async (overrides: any = {}) => {
    if (!user) return;
    const uid = String(ensureUser());
    const settingsData = {
      ...cleanData({
        activeWorkout,
        muscles,
        equipments,
        userStats,
        ...overrides
      }),
      userId: uid
    };
    
    try {
      await withRetry(() => db.collection('settings').doc(uid).set(settingsData));
    } catch (err) {
      console.error('[TCB] Settings sync failed after retries:', err);
    }
  };

  const startWorkout = (plan?: Plan) => {
    const newWorkout: WorkoutLog = {
      id: crypto.randomUUID(),
      planId: plan?.id,
      title: plan ? plan.title : '空训练',
      startTime: Date.now(),
      volume: 0,
      sections: plan?.sections,
      items: plan ? plan.items.map(item => {
        let previousSets: WorkoutSet[] = [];
        if (history.length > 0) {
          const lastLogWithExercise = history.find(log => 
            log.planId === plan.id && 
            log.endTime && 
            log.items.some(i => i.exerciseId === item.exerciseId)
          );
          if (lastLogWithExercise) {
            const previousExerciseItem = lastLogWithExercise.items.find(i => i.exerciseId === item.exerciseId);
            if (previousExerciseItem && previousExerciseItem.sets) {
              previousSets = previousExerciseItem.sets;
            }
          }
        }

          let sets = item.targetSets.map((set, index) => {
            const prevSet = previousSets[index] || previousSets[previousSets.length - 1];
            if (prevSet) {
              return {
                ...set,
                id: crypto.randomUUID(),
                completed: false,
                weight: prevSet.weight !== undefined ? prevSet.weight : set.weight,
                reps: prevSet.reps !== undefined ? prevSet.reps : set.reps,
                time: prevSet.time !== undefined ? prevSet.time : set.time,
                distance: prevSet.distance !== undefined ? prevSet.distance : set.distance,
              };
            }
            return { ...set, id: crypto.randomUUID(), completed: false };
          });

          // If the user performed more sets in the previous workout than what's in the template, 
          // append those extra sets so the initial set count matches the actual history exactly.
          if (previousSets.length > item.targetSets.length) {
            for (let i = item.targetSets.length; i < previousSets.length; i++) {
              const prevSet = previousSets[i];
              sets.push({
                ...item.targetSets[item.targetSets.length - 1], // Copy template for fields like type/restTime
                id: crypto.randomUUID(),
                completed: false,
                weight: prevSet.weight,
                reps: prevSet.reps,
                time: prevSet.time,
                distance: prevSet.distance,
              });
            }
          } else if (previousSets.length > 0 && previousSets.length < item.targetSets.length) {
             // If they did FEWER sets last time, we should still just give them the template length, 
             // but maybe they explicitly want exactly the same number of sets. However, usually plans dictate a minimum.
             // We'll leave the extra sets from the template as they are (handled by the map with fallback above).
          }

          return {
            id: crypto.randomUUID(),
            exerciseId: item.exerciseId,
            notes: item.notes,
            restTime: item.restTime,
            sectionId: item.sectionId,
            sets
          };
      }) : []
    };
    setActiveWorkout(newWorkout);
    syncSettings({ activeWorkout: newWorkout });
  };

  const updateActiveWorkout = (workout: WorkoutLog) => {
    setActiveWorkout(workout);
    syncSettings({ activeWorkout: workout });
  };

  const endActiveWorkout = (summary?: { title: string, notes: string, mediaItems: MediaItem[] }) => {
    if (activeWorkout) {
      const completedWorkout = { 
        ...activeWorkout, 
        endTime: Date.now(),
        title: summary?.title || activeWorkout.title,
        notes: summary?.notes,
        mediaItems: summary?.mediaItems
      };
      addWorkoutLog(completedWorkout);
      setActiveWorkout(null);
      syncSettings({ activeWorkout: null });
    }
  };

  const cancelActiveWorkout = () => {
    setActiveWorkout(null);
    syncSettings({ activeWorkout: null });
  };

  const addCustomExercise = async (exercise: Exercise) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(exercise) as any;
    const data = { ...cleanObj, userId: uid };
    setCustomExercises(prev => [...prev, exercise]); // Local update
    try {
      await withRetry(() => db.collection('customExercises').doc(exercise.id).set(data));
    } catch (err) {
      console.error('[TCB] addCustomExercise failed after retries:', err);
      throw err;
    }
  };

  const updateCustomExercise = async (exercise: Exercise) => {
    const uid = String(ensureUser());
    const { id, _id, ...cleanObj } = cleanData(exercise) as any;
    const data = { ...cleanObj, userId: uid };
    setCustomExercises(prev => prev.map(ex => ex.id === exercise.id ? exercise : ex)); // Local update
    try {
      await withRetry(() => db.collection('customExercises').doc(exercise.id).update(data));
    } catch (err) {
      console.error('[TCB] updateCustomExercise failed after retries:', err);
      throw err;
    }
  };

  const deleteCustomExercise = async (id: string) => {
    setCustomExercises(prev => prev.filter(ex => ex.id !== id)); // Local update
    try {
      await withRetry(() => db.collection('customExercises').doc(id).remove());
    } catch (err) {
      console.error('[TCB] deleteCustomExercise failed after retries:', err);
      throw err;
    }
  };

  const setEquipments = (eqs: string[]) => {
    setEquipmentsState(eqs);
    syncSettings({ equipments: eqs });
  };
  const addEquipment = (name: string) => {
    const next = [...equipments, name];
    setEquipmentsState(next);
    syncSettings({ equipments: next });
  };
  const updateEquipment = (oldName: string, newName: string) => {
    const next = equipments.map(e => e === oldName ? newName : e);
    setEquipmentsState(next);
    syncSettings({ equipments: next });
  };
  const deleteEquipment = (name: string) => {
    const next = equipments.filter(e => e !== name);
    setEquipmentsState(next);
    syncSettings({ equipments: next });
  };

  const setMuscles = (ms: string[]) => {
    setMusclesState(ms);
    syncSettings({ muscles: ms });
  };
  const addMuscle = (name: string) => {
    const next = [...muscles, name];
    setMusclesState(next);
    syncSettings({ muscles: next });
  };
  const updateMuscle = (oldName: string, newName: string) => {
    const next = muscles.map(e => e === oldName ? newName : e);
    setMusclesState(next);
    syncSettings({ muscles: next });
  };
  const deleteMuscle = (name: string) => {
    const next = muscles.filter(e => e !== name);
    setMusclesState(next);
    syncSettings({ muscles: next });
  };

  return (
    <AppContext.Provider value={{
      user, isLoaded, isAuthReady,
      plans, history, customExercises, equipments, muscles, activeWorkout,
      isWorkoutMinimized, setIsWorkoutMinimized,
      previewLogId, setPreviewLogId,
      previewExerciseId, setPreviewExerciseId,
      userStats, updateUserStats,
      loginError, hasMoreHistory, loadMoreHistory, refreshData,
      login, logout,
      addPlan, updatePlan, deletePlan, addWorkoutLog, updateWorkoutLog, deleteWorkoutLog,
      startWorkout, updateActiveWorkout, endActiveWorkout, cancelActiveWorkout,
      addCustomExercise, updateCustomExercise, deleteCustomExercise, setEquipments, addEquipment, updateEquipment, deleteEquipment,
      setMuscles, addMuscle, updateMuscle, deleteMuscle
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within an AppProvider");
  return context;
}

export function useAppData() {
  const { customExercises, history } = useAppStore();
  
  // Merge: prefer custom exercises with same name + equipment
  const mergedExercisesMap = new Map<string, Exercise>();
  
  // First add all defaults
  defaultExercises.forEach(ex => {
    const key = `${ex.name}_${ex.equipment}`;
    mergedExercisesMap.set(key, ex);
  });
  
  // Then overwrite with custom ones if they match by name+equipment
  // or add them if they are unique
  customExercises.forEach(ex => {
    const key = `${ex.name}_${ex.equipment}`;
    mergedExercisesMap.set(key, ex);
  });
  
  const allExercises = Array.from(mergedExercisesMap.values());
  
  const getExercise = (id: string) => {
    // Search in merged list (covers case where ID changed due to customization)
    const found = allExercises.find(e => e.id === id);
    if (found) return found;
    
    // Fallback: if we are looking for a standard ID but it has been overridden
    // Find if any custom exercise "inherited" from it (same name+equipment)
    const standard = defaultExercises.find(e => e.id === id);
    if (standard) {
      const key = `${standard.name}_${standard.equipment}`;
      return mergedExercisesMap.get(key) || standard;
    }
    
    return undefined;
  };
  
  const getLastWorkoutItemForExercise = (exerciseId: string): WorkoutItem | null => {
    for (const log of history) {
      const item = log.items.find(i => i.exerciseId === exerciseId);
      if (item) return item;
    }
    return null;
  };

  return { allExercises, getExercise, getLastWorkoutItemForExercise };
}
