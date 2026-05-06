import React, { useState, useEffect } from 'react';
import { db as firebaseDb, auth as firebaseAuth } from '../lib/firebase';
import { db } from '../lib/cloudbase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAppStore } from '../store';
import { migrateData, exportFirebaseData, importData } from '../lib/migration';
import { Database, ArrowRight, Loader2, CheckCircle2, AlertCircle, LogIn, Search, X, RotateCw, Download, FileJson, Upload, Plus } from 'lucide-react';

export default function MigrationTool({ onClose }: { onClose: () => void }) {
  const { user: tcbUser, refreshData } = useAppStore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [diagLog, setDiagLog] = useState<string[]>([]);
  const [showDiag, setShowDiag] = useState(false);

  const diagEndRef = React.useRef<HTMLDivElement>(null);

  const logDiag = (msg: string) => {
    setDiagLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    console.log(`[Diagnostic] ${msg}`);
  };

  useEffect(() => {
    if (diagEndRef.current) {
      diagEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [diagLog]);

  const runTcbDiagnostic = async () => {
    if (!tcbUser) {
      setError("未登录 CloudBase");
      return;
    }
    setDiagLog([]);
    setShowDiag(true);
    setLoading(true);
    const { plans: storePlans, history: storeHistory, customExercises: storeExercises } = useAppStore();
    setDiagLog([]);
    setShowDiag(true);
    setLoading(true);

    const rawUid = tcbUser.uid || tcbUser.userId;
    const uid = String(rawUid);
    logDiag(`开始诊断 CloudBase 账号: ${uid} (类型: ${typeof rawUid})`);
    logDiag(`[本地Store状态]: Plans=${storePlans.length}, History=${storeHistory.length}, Exercises=${storeExercises.length}`);

    try {
      // 1. 测试连接和基本读取
      logDiag("正在测试 CloudBase 连接...");
      const colls = ['plans', 'history', 'customExercises', 'settings'];
      
      // 2. 模拟写入测试 (核心步骤)
      logDiag("正在执行写入连接测试...");
      const testId = `diag_test_${Date.now()}`;
      try {
        await db.collection('customExercises').doc(testId).set({
          userId: uid,
          name: 'DIAG_TEST',
          isTest: true,
          createdAt: Date.now()
        });
        logDiag("✅ 写入测试：成功");
        
        // 校验读取
        const check = await db.collection('customExercises').doc(testId).get();
        if (check.data && (Array.isArray(check.data) ? check.data.length > 0 : true)) {
          logDiag("✅ 读取校验：成功 (确认能存入并读取)");
          // 删除测试数据
          await db.collection('customExercises').doc(testId).remove();
          logDiag("✅ 资源清理：完成");
        } else {
          logDiag("❌ 读取校验：失败 (写入后无法查到数据，请检查数据库权限)");
        }
      } catch (e: any) {
        logDiag(`❌ 写入测试失败: ${e.message}`);
        if (e.message.includes('permission denied')) {
          logDiag("提示: 可能是 CloudBase 安全规则禁止了您的写入操作。");
        }
      }

      // 3. 统计现有数据
      for (const coll of colls) {
        logDiag(`正在统计现有数据 [${coll}] ...`);
        const queryUid = uid; 
        logDiag(`   查询条件: userId == "${queryUid}" (类型: ${typeof queryUid})`);
        
        const res = await (coll === 'settings' 
          ? db.collection(coll).doc(queryUid).get()
          : db.collection(coll).where({ userId: queryUid }).get());
        
        const data = res.data;
        const count = data ? (Array.isArray(data) ? data.length : 1) : 0;
        logDiag(`${coll}: 远程库中发现 ${count} 条记录`);
        if (count > 0) {
          const first = Array.isArray(data) ? data[0] : data;
          const remoteUserId = first.userId;
          logDiag(`   [数据详情]: 名称="${first.name || first.title || '未命名'}", userId="${remoteUserId}" (类型: ${typeof remoteUserId}), ID="${first._id}"`);
          if (String(remoteUserId) !== uid) {
             logDiag(`   ⚠️ 警告: 远程字段 userId("${remoteUserId}") 与输入 UID("${uid}") 不匹配! 这会导致查询为空。`);
          }
        } else {
          // 兜底检查：如果不按 String UID 查不到，看看该集合里有没有任何数据
          try {
            const anySnap = await db.collection(coll).limit(1).get();
            if (anySnap.data && anySnap.data.length > 0) {
              const anyDoc = Array.isArray(anySnap.data) ? anySnap.data[0] : anySnap.data;
              logDiag(`   [发现其他数据]: 该集合有记录但 userId 不符, 样例 userId="${anyDoc.userId}" (类型: ${typeof anyDoc.userId})`);
            }
          } catch (e) {}
        }
      }
      
      logDiag("CloudBase 诊断流程结束。");
    } catch (err: any) {
      logDiag(`❌ 诊断中断: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    if (!firebaseAuth.currentUser) {
      setError("请先登录 Firebase");
      return;
    }
    setDiagLog([]);
    setShowDiag(true);
    setLoading(true);
    const uid = firebaseAuth.currentUser.uid;
    logDiag(`开始诊断 Firebase 用户 UID: ${uid}`);

    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const collectionsToTry = [
        'plans', 'WorkoutPlans', 'templates', 'history', 'WorkoutLog', 'workouts', 'logs', 
        'customExercises', 'exercises', 'Exercise', 'settings'
      ];

      let foundCount = 0;
      for (const collName of collectionsToTry) {
        // Try nested
        try {
          const nestedSnap = await getDocs(collection(firebaseDb, `users/${uid}/${collName}`));
          if (!nestedSnap.empty) {
            logDiag(`✅ 发现 Firebase 数据: 路径 users/${uid}/${collName} (共 ${nestedSnap.size} 条)`);
            const sample = nestedSnap.docs[0].data();
            logDiag(`   [样本字段]: ${Object.keys(sample).slice(0, 5).join(', ')}...`);
            foundCount += nestedSnap.size;
          }
        } catch (e: any) {}

        // Try top-level
        try {
          const q = query(collection(firebaseDb, collName), where('userId', '==', uid));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            logDiag(`✅ 发现 Firebase 数据: 集合 ${collName} (共 ${qSnap.size} 条)`);
            const sample = qSnap.docs[0].data();
            logDiag(`   [样本字段]: ${Object.keys(sample).slice(0, 5).join(', ')}...`);
            foundCount += qSnap.size;
          }
        } catch (e: any) {}
      }
      
      if (foundCount === 0) {
        logDiag("❌ 结论：Firebase 中没有发现该账号的数据。");
      } else {
        logDiag(`✅ 结论：Firebase 中存有数据 (共计约 ${foundCount} 条)，可以开始同步。`);
      }
    } catch (err: any) {
      logDiag(`❌ 诊断失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
    });
    return unsubscribe;
  }, []);

  const loginFirebase = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
    } catch (err: any) {
      console.error('Firebase login error:', err);
      let msg = err.message || '登录 Firebase 失败';
      if (msg.includes('cross-origin') || msg.includes('Blocked a frame')) {
        msg = '安全策略限制：请点击右上角的“在新标签页打开”图标，在独立页面中进行迁移。';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommonExercises = async () => {
    if (!tcbUser) return;
    setLoading(true);
    setShowDiag(true);
    setDiagLog([]);
    setStatus('migrating');
    const uid = String(tcbUser.uid || tcbUser.userId);

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

    try {
      logDiag(`🚀 开始批量添加 ${exercises.length} 个常用运动...`);
      let count = 0;
      for (const ex of exercises) {
        const docId = `batch_ex_${ex.name}`; // Stable ID based on name to prevent duplicates
        await db.collection('customExercises').doc(docId).set({
          ...ex,
          id: docId,
          userId: uid,
          isCustom: true,
          createdAt: Date.now()
        });
        count++;
        if (count % 4 === 0) logDiag(`   已添加 ${count}/${exercises.length}...`);
      }
      setStats({ exercises: count });
      setStatus('success');
      logDiag(`✅ 成功添加 ${count} 个运动！请刷新生效。`);
    } catch (e: any) {
      logDiag(`❌ 批量添加失败: ${e.message}`);
      setError(e.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tcbUser) return;

    setLoading(true);
    setShowDiag(true);
    setDiagLog([]);
    setStatus('migrating');

    try {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const dump = JSON.parse(content);
      const results = await importData(dump, tcbUser.uid || tcbUser.userId, db, logDiag);
      setStats(results);
      setStatus('success');
      logDiag("✅ 导入成功！请点击 [刷新生效] 同步本地界面。");
    } catch (e: any) {
      logDiag(`❌ 导入过程出错: ${e.message}`);
      setError(e.message);
      setStatus('error');
    } finally {
      setLoading(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setShowDiag(true);
    setDiagLog([]);
    setStatus('migrating');
    try {
      const data = await exportFirebaseData(logDiag);
      const jsonStr = JSON.stringify(data, null, 2);
      logDiag("--- RAW DATA START ---");
      logDiag(jsonStr);
      logDiag("--- RAW DATA END ---");
      
      // Browser download
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `firebase_export_${new Date().getTime()}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Save to project directory (server-side)
      try {
        logDiag("正在同步至项目目录...");
        const saveRes = await fetch('/api/save-dump', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, data })
        });
        const saveResult = await saveRes.json();
        if (saveResult.success) {
          logDiag(`✅ 数据已成功保存至项目目录: ${filename}`);
        } else {
          logDiag(`⚠️ 保存至项目目录失败: ${saveResult.error}`);
        }
      } catch (e: any) {
        logDiag(`⚠️ 保存至项目目录异常: ${e.message}`);
      }
      
      logDiag("✅ 数据处理完成。");
      setStatus('idle');
    } catch (e: any) {
      logDiag(`❌ 导出失败: ${e.message}`);
      setError(e.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!tcbUser) {
      setError("未检测到有效的 CloudBase 登录状态");
      return;
    }
    const targetUid = tcbUser.uid || tcbUser.userId;
    if (!targetUid) {
      console.error('Migration failed: tcbUser has no uid');
      setError("无法获取 CloudBase 用户 ID");
      return;
    }

    setStatus('migrating');
    setError(null);
    setShowDiag(true);
    setDiagLog([]);
    try {
      logDiag(`[Migration] Starting with target UID: ${targetUid}`);
      const results = await migrateData(targetUid, logDiag);
      
      logDiag("✅ 迁移任务已完成，数据正在自动同步至本地应用...");

      setStats(results);
      const total = Object.values(results).reduce((a, b) => a + (b as number), 0);
      if (total === 0) {
        setStatus('idle');
        setError('未在 Firebase 中找到可迁移的数据，请确保您的数据库中有对应的记录。');
      } else {
        setStatus('success');
      }
    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || '迁移失败');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Decorative corner */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />
        
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 rotate-3">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight pt-2">Firebase 数据迁移</h3>
          <p className="text-sm text-gray-400 font-bold tracking-tight">将您的计划和历史记录迁移到 CloudBase</p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${firebaseUser ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">源数据库</span>
                  <span className="text-sm font-black text-gray-800">{firebaseUser ? (firebaseUser.displayName || firebaseUser.email) : '未连接 Firebase'}</span>
                </div>
              </div>
              {!firebaseUser && (
                <button 
                  onClick={loginFirebase}
                  disabled={loading}
                  className="px-4 py-2 bg-white border border-gray-200 text-blue-500 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-transform flex items-center space-x-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>连接</span>
                </button>
              )}
            </div>

            <div className="flex justify-center py-2 text-gray-300">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">目标数据库</span>
                <span className="text-sm font-black text-gray-800">{tcbUser?.displayName || tcbUser?.username || '当前 CloudBase 用户'}</span>
              </div>
            </div>
          </div>

          {status === 'idle' && firebaseUser && (
            <div className="space-y-3">
              <button 
                onClick={handleMigrate}
                className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center space-x-3"
              >
                <span>开始迁移数据</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={runDiagnostic}
                disabled={loading}
                className="w-full py-3 bg-white border border-gray-100 text-gray-500 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>诊断 Firebase 数据</span>
              </button>

              <button 
                onClick={runTcbDiagnostic}
                disabled={loading}
                className="w-full py-3 bg-white border border-gray-100 text-gray-500 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Database className="w-4 h-4" />
                <span>诊断 CloudBase 数据</span>
              </button>

              <button 
                onClick={handleAddCommonExercises}
                disabled={loading}
                className="w-full py-3 bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-100 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>添加常用自定义运动</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleExport}
                  disabled={loading}
                  className="py-3 bg-orange-50 border border-orange-100 text-orange-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-orange-100 active:scale-95 transition-all"
                >
                  <FileJson className="w-4 h-4" />
                  <span>导出 JSON</span>
                </button>
                <label className={`py-3 bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>导入 JSON</span>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {showDiag && (
            <div className="flex flex-col p-4 bg-gray-900 rounded-2xl font-mono text-[10px] text-green-400 animate-in slide-in-from-bottom border border-gray-800">
              <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1 shrink-0">
                <span className="text-gray-500 font-bold uppercase tracking-wider">诊断日志</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDiagLog([])} className="text-gray-500 hover:text-white transition-colors">清空</button>
                  <button onClick={() => setShowDiag(false)} className="text-gray-500 hover:text-white transition-colors"><X size={14} /></button>
                </div>
              </div>
              <div id="diag-container" className="max-h-60 overflow-y-auto scroll-smooth">
                {diagLog.map((log, i) => (
                  <div key={i} className="mb-0.5 leading-relaxed break-all">{log}</div>
                ))}
                {loading && <div className="text-gray-500 animate-pulse mt-2">{status === 'migrating' ? '数据同步中...' : '诊断中...'}</div>}
                <div ref={diagEndRef} />
              </div>
            </div>
          )}

          {status === 'migrating' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-bold text-blue-500 animate-pulse">正在迁移中，请勿关闭窗口...</p>
            </div>
          )}

          {status === 'success' && stats && (
            <div className="bg-green-50 rounded-2xl p-5 border border-green-100 text-center space-y-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-black text-green-900 tracking-tight">迁移成功！</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {Object.entries(stats || {}).filter(([_, val]) => (val as number) > 0).map(([key, val]) => (
                    <div key={key} className="bg-white p-2 rounded-xl text-center border border-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{key === 'customExercises' ? 'exercises' : key}</p>
                      <p className="text-lg font-black text-gray-900">{val as number}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={async () => {
                    setLoading(true);
                    await refreshData();
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="py-3 bg-white border border-green-200 text-green-600 font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  手动同步
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="py-3 bg-green-500 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  刷新生效
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 rounded-2xl p-5 border border-red-100 text-center space-y-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto text-white">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-black text-red-900 tracking-tight">迁移出现错误</p>
                <p className="text-xs font-bold text-red-400 mt-1 uppercase leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-transform"
              >
                重试
              </button>
            </div>
          )}

          {status === 'idle' && (
            <button 
              onClick={onClose}
              className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
            >
              以后再说
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
