import React, { useState, useEffect } from 'react';
import { auth, db, uploadFile } from '../lib/cloudbase';
import { Settings, Dumbbell, Plus, Trash2, Image as ImageIcon, LogOut, LayoutDashboard, Calendar, Menu, X } from 'lucide-react';
import { TrainingPlan, Routine, RoutineExercise } from './types';
import { ExerciseAutocomplete, ImportRoutineButton } from './AdminComponents';
import CloudMedia from '../components/CloudMedia';

export function ExerciseParameterEditor({ ex, onChange }: { ex: RoutineExercise, onChange: (ex: RoutineExercise) => void }) {
  const type = ex.type || 'weight_reps';
  
  // Initialize setList for backwards compatibility
  let setList = ex.settings?.setList;
  if (!setList || setList.length === 0) {
    const numSets = Math.max(1, ex.settings?.sets || 1);
    setList = Array.from({ length: numSets }).map(() => ({
      reps: ex.settings?.reps,
      weight: ex.settings?.weight,
      time: ex.settings?.time,
      distance: ex.settings?.distance,
    }));
  }

  const updateSetList = (newList: any[]) => {
    let detailStr = `${newList.length} 组`;
    const first = newList[0] || {};
    
    if (['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(type) && (first.reps !== undefined && first.reps !== null)) {
      detailStr += ` · ${first.reps} 次`;
    }
    if (['time', 'time_weight', 'distance_time'].includes(type) && (first.time !== undefined && first.time !== null)) {
      detailStr += ` · ${first.time} 秒`;
    }
    if (['distance_time', 'weight_distance'].includes(type) && (first.distance !== undefined && first.distance !== null)) {
      detailStr += ` · ${first.distance}公里`;
    }
    if (['weight_reps', 'time_weight', 'weight_distance'].includes(type) && (first.weight !== undefined && first.weight !== null)) {
      detailStr += ` · ${first.weight}KG`;
    }
    if (['weighted_bodyweight'].includes(type) && (first.weight !== undefined && first.weight !== null)) {
      detailStr += ` · +${first.weight}KG`;
    }
    if (['assisted_bodyweight'].includes(type) && (first.weight !== undefined && first.weight !== null)) {
      detailStr += ` · -${first.weight}KG`;
    }

    if (newList.length > 1 && newList.some(s => s.reps !== first.reps || s.weight !== first.weight || s.time !== first.time || s.distance !== first.distance)) {
      detailStr += '起';
    }

    onChange({ 
      ...ex, 
      detail: detailStr,
      settings: { 
        ...ex.settings, 
        sets: newList.length,
        reps: first.reps, // keep first for legacy
        weight: first.weight,
        time: first.time,
        distance: first.distance,
        setList: newList 
      } 
    });
  };

  const updateListField = (index: number, field: string, val: string | number | undefined) => {
    const num = val === '' || val === undefined ? undefined : Number(val);
    const newList = [...setList!];
    newList[index] = { ...newList[index], [field]: num };
    updateSetList(newList);
  };

  const addSet = () => {
    const lastSet = setList![setList!.length - 1] || {};
    updateSetList([...setList!, { ...lastSet }]);
  };

  const removeSet = (index: number) => {
    if (setList!.length <= 1) return;
    const newList = [...setList!];
    newList.splice(index, 1);
    updateSetList(newList);
  };

  const InputNode = ({ label, field, placeholder, setIndex }: { label: string, field: string, placeholder: string, setIndex: number }) => (
    <div className="flex items-center text-xs gap-1 border border-gray-200 rounded px-1.5 py-0.5 bg-white">
      <span className="text-gray-400 select-none whitespace-nowrap">{label}:</span>
      <input 
        type="number"
        value={(setList![setIndex] as any)[field] ?? ''}
        onChange={e => updateListField(setIndex, field, e.target.value)}
        className="w-10 outline-none text-gray-700 bg-transparent text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder={placeholder}
      />
    </div>
  );

  const handleTypeChange = (newType: any) => {
    // Convert sets to new type defaults
    const newList = setList.map((s) => {
      const resetSet: any = { reps: undefined, weight: undefined, time: undefined, distance: undefined };
      if (['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(newType)) {
        resetSet.reps = s.reps || 12;
      }
      if (['weight_reps', 'time_weight', 'weight_distance'].includes(newType)) {
        resetSet.weight = s.weight || undefined;
      }
      if (['weighted_bodyweight', 'assisted_bodyweight'].includes(newType)) {
        resetSet.weight = s.weight || undefined;
      }
      if (['time', 'time_weight', 'distance_time'].includes(newType)) {
        resetSet.time = s.time || 60;
      }
      if (['distance_time', 'weight_distance'].includes(newType)) {
        resetSet.distance = s.distance || undefined;
      }
      return resetSet;
    });

    let detailStr = `${newList.length} 组`;
    const first = newList[0] || {};
    if (['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(newType) && first.reps) detailStr += ` · ${first.reps} 次`;
    // Add other detailStr logic if needed or let the next update fix it...
    // Actually we can just call onChange directly with new type and let user update
    onChange({ 
      ...ex, 
      type: newType,
      detail: detailStr,
      settings: { 
        ...ex.settings, 
        sets: newList.length,
        setList: newList 
      } 
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {setList.map((setItem, index) => (
        <div key={index} className="flex flex-wrap gap-2 items-center bg-gray-50/50 p-1.5 rounded border border-transparent hover:border-gray-200">
          <div className="text-xs font-medium text-gray-400 w-8 text-center shrink-0">
            第 {index + 1} 组
          </div>
          
          {['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(type) && (
            <InputNode label="次数" field="reps" placeholder="12" setIndex={index} />
          )}
          {['weight_reps', 'time_weight', 'weight_distance'].includes(type) && (
            <InputNode label="重量" field="weight" placeholder="KG" setIndex={index} />
          )}
          {['weighted_bodyweight'].includes(type) && (
            <InputNode label="+重量" field="weight" placeholder="+KG" setIndex={index} />
          )}
          {['assisted_bodyweight'].includes(type) && (
            <InputNode label="-重量" field="weight" placeholder="-KG" setIndex={index} />
          )}
          {['time', 'time_weight', 'distance_time'].includes(type) && (
            <InputNode label="时间" field="time" placeholder="秒" setIndex={index} />
          )}
          {['distance_time', 'weight_distance'].includes(type) && (
            <InputNode label="距离" field="distance" placeholder="KM" setIndex={index} />
          )}
          
          {setList!.length > 1 && (
            <button 
              onClick={() => removeSet(index)}
              className="w-6 h-6 ml-auto flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 rounded"
              title="删除此组"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <select 
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white outline-none cursor-pointer hover:border-[#1677ff] min-w-[90px]"
        >
          <option value="weight_reps">重量 + 次数</option>
          <option value="reps_only">仅次数 (自重)</option>
          <option value="weighted_bodyweight">附重自重 (如：负重引体)</option>
          <option value="assisted_bodyweight">辅助自重 (如：弹力带引体)</option>
          <option value="time">按时间</option>
          <option value="time_weight">时间 + 重量</option>
          <option value="distance_time">距离 + 时间</option>
          <option value="weight_distance">重量 + 距离</option>
        </select>
        <button 
          onClick={addSet}
          className="text-xs text-[#1677ff] bg-blue-50/50 hover:bg-blue-50 border border-dashed border-[#1677ff]/30 hover:border-[#1677ff] rounded px-3 py-1 transition-colors"
        >
          + 添加一组
        </button>
        {!ex.type && (
          <input 
            value={ex.detail}
            onChange={e => onChange({ ...ex, detail: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#1677ff] text-gray-600 bg-white flex-1 min-w-[120px]"
            placeholder="自定义详情描述"
          />
        )}
      </div>
    </div>
  );
}

export function RoutineExercisesCategorizedEditor({ exercises, onChange, idPrefix }: { exercises: RoutineExercise[], onChange: (exercises: RoutineExercise[]) => void, idPrefix?: string }) {
  const CATEGORIES = ['练前热身', '正式训练', '练后拉伸', '未分类'];
  return (
    <div className="space-y-6 mt-4">
      {CATEGORIES.map(cat => {
        const isUnclassified = cat === '未分类';
        const hasUnclassified = exercises.some(ex => !ex.category || !CATEGORIES.includes(ex.category));
        if (isUnclassified && !hasUnclassified) return null;

        return (
          <div key={cat} className="space-y-3 pl-0 md:pl-4 border-l-0 md:border-l-2 border-gray-200">
            <div className="text-sm text-gray-800 font-bold mb-2 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[#1677ff]"></div>
               {cat}
            </div>
            {exercises.map((ex, exIdx) => {
              const exCat = ex.category || '未分类';
              if (isUnclassified ? CATEGORIES.includes(exCat) && exCat !== '未分类' : exCat !== cat) return null;

              return (
                <div key={exIdx} className="flex flex-col gap-3 bg-[#fafafa] p-3 rounded border border-gray-200 relative group hover:border-[#1677ff] text-sm transition-colors">
                  {/* Row 1: Image & Title */}
                  <div className="flex items-center gap-3">
                     <label className="w-12 h-12 shrink-0 rounded overflow-hidden bg-white border border-gray-200 flex items-center justify-center cursor-pointer relative group/img">
                      {ex.image ? (
                        <CloudMedia src={ex.image} alt={ex.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] scale-90">{ex.image ? '更换' : '上传图'}</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if(!file)return;
                        const path = `routines_ex/${Date.now()}_${file.name}`;
                        try {
                          const fid = await uploadFile(file, path);
                          const rx = [...exercises];
                          rx[exIdx].image = fid;
                          onChange(rx);
                        } catch(err){}
                      }} />
                    </label>

                    <input 
                      value={ex.name}
                      onChange={e => {
                        const rx = [...exercises];
                        rx[exIdx].name = e.target.value;
                        onChange(rx);
                      }}
                      className="border-b border-gray-300 flex-1 leading-8 outline-none focus:border-[#1677ff] bg-transparent text-base font-bold text-gray-800"
                      placeholder="动作名称"
                    />

                    <button onClick={() => {
                      const rx = [...exercises];
                      rx.splice(exIdx, 1);
                      onChange(rx);
                    }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-1.5 transition-colors" title="移除该动作">
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Row 2: Parameters */}
                  <div className="pl-[60px] w-full">
                    <ExerciseParameterEditor 
                      ex={ex}
                      onChange={(newEx) => {
                        const rx = [...exercises];
                        rx[exIdx] = newEx;
                        onChange(rx);
                      }}
                    />
                  </div>
                </div>
              );
            })}
            
            {!isUnclassified && (
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <button 
                  onClick={() => {
                     const rx = [...exercises, { name: '', detail: '', category: cat }];
                     onChange(rx);
                  }}
                  className="text-xs text-[#1677ff] border border-dashed border-[#1677ff] rounded px-3 py-1.5 bg-blue-50/50 hover:bg-blue-50 transition-colors h-[34px]"
                >
                  + 空白动作
                </button>
                <div className="flex-1 min-w-[200px]">
                  <ExerciseAutocomplete 
                    onSelect={(ex) => {
                       const initType = ex.type || 'weight_reps';
                       let detailStr = '1 组';
                       if (['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(initType)) {
                         detailStr += ' · 12 次';
                       }
                       const rx = [...exercises, { 
                         name: ex.name, 
                         detail: detailStr, 
                         image: ex.media, 
                         exerciseId: ex.id, 
                         category: cat,
                         type: initType,
                         settings: { 
                           sets: 1, 
                           reps: ['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(initType) ? 12 : undefined,
                           setList: [{
                             reps: ['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(initType) ? 12 : undefined
                           }]
                         }
                       }];
                       onChange(rx);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminApp() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const state = auth.hasLoginState();
    if (state) {
      setIsAdminAuth(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      await auth.signInWithPassword({ email: email, password: password });
      setIsAdminAuth(true);
    } catch (e: any) {
      setLoginError(e.message || '登录失败');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsAdminAuth(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (isChecking) {
    return <div className="flex bg-[#f0f2f5] h-screen items-center justify-center">检查登录状态...</div>;
  }

  if (!isAdminAuth) {
    return (
      <div className="flex bg-[#f0f2f5] h-[100dvh] items-center justify-center p-6 bg-cover bg-center" style={{ backgroundImage: 'url(https://gw.alipayobjects.com/zos/rmsportal/FfdJeJRQWjEeCwqAewk.png)' }}>
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">训练后台管理系统</h1>
            <p className="text-gray-500 text-sm">Fitness Admin Dashboard</p>
          </div>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
              <input 
                type="text" 
                placeholder="请输入管理员账号"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input 
                type="password" 
                placeholder="请输入密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
            <button 
              onClick={handleLogin}
              className="w-full py-2.5 bg-[#1677ff] hover:bg-[#4096ff] transition-colors text-white rounded-lg font-medium text-sm mt-4"
            >
              登录
            </button>
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          </div>
        </div>
      </div>
    );
  }

  return <AdminLayout onLogout={handleLogout} />;
}

function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const [activeMenu, setActiveMenu] = useState<'plans' | 'routines'>('plans');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Ant Design Style */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-[#001529] text-white flex flex-col shadow-xl z-50 shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 md:justify-center md:px-0 gap-2 border-b border-[#002140] bg-[#002140]">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#1677ff]" />
            <span className="text-lg font-bold tracking-wide">训练后台管理</span>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <MenuButton 
            active={activeMenu === 'plans'} 
            onClick={() => { setActiveMenu('plans'); setIsSidebarOpen(false); }}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="方案管理"
          />
          <MenuButton 
            active={activeMenu === 'routines'} 
            onClick={() => { setActiveMenu('routines'); setIsSidebarOpen(false); }}
            icon={<Calendar className="w-5 h-5" />}
            label="计划管理"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-medium text-gray-800">
              {activeMenu === 'plans' ? '方案管理' : '计划管理'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">欢迎，Administrator</span>
            <button 
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" /> 退出
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {activeMenu === 'plans' && <PlansManager />}
            {activeMenu === 'routines' && <RoutinesManager />}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3.5 my-1 mx-2 rounded-lg cursor-pointer transition-colors ${
        active 
          ? 'bg-[#1677ff] text-white' 
          : 'text-gray-300 hover:text-white hover:bg-[#ffffff14]'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function RoutinesManager() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("RoutinesManager rendering, loading:", loading, "routines:", routines);

  const fetchRoutines = async () => {
    try {
      const res = await db.collection('routines').limit(100).get();
      const data = (res.data || []) as Routine[];
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRoutines(data);
    } catch (e) {
      console.error('Fetch routines failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRoutine = async () => {
    console.log('handleAddRoutine clicked!');
    setErrorMsg('');
    setIsAdding(true);
    try {
      const newRoutine: Routine = {
        title: '新计划',
        description: '动作包含：',
        exercises: [],
        createdAt: Date.now()
      };
      
      console.log('Adding new routine to db:', newRoutine);
      const res = await db.collection('routines').add(newRoutine);
      console.log('Added new routine, res:', res);
      
      newRoutine._id = res.id || res.ids?.[0];
      setRoutines(prev => [newRoutine, ...prev]);

      console.log('Added new routine locally successfully.');
    } catch (e: any) {
      console.error('handleAddRoutine Error:', e);
      const msg = `添加失败: ${e.message || String(e)}`;
      setErrorMsg(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    setErrorMsg('');
    // Use an intuitive UI later, but for now just perform if we really wanted to, or skip confirm and just delete.
    // Actually, confirm might block, let's just use a simple state to confirm or just delete.
    try {
      await db.collection('routines').doc(id).remove();
      fetchRoutines();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`删除失败: ${e.message || String(e)}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-800">所有独立计划 ({routines.length})</h2>
        <div className="flex items-center gap-2">
           {errorMsg && <span className="text-red-500 text-sm mr-2">{errorMsg}</span>}
           <button 
             onClick={handleAddRoutine}
             disabled={isAdding}
             className={`transition-colors text-white px-4 py-2 rounded shadow-sm text-sm font-medium flex items-center gap-1.5 ${isAdding ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1677ff] hover:bg-[#4096ff]'}`}
           >
             <Plus className="w-4 h-4"/> {isAdding ? '添加中...' : '新建计划'}
           </button>
        </div>
      </div>

      <div className="space-y-6">
        {routines.map((routine, index) => (
          <RoutineStandaloneEditor key={routine._id || `rt-${index}`} routine={routine} onChange={fetchRoutines} onDelete={() => handleDeleteRoutine(routine._id!)} />
        ))}
        {routines.length === 0 && (
          <div className="text-gray-500 text-center py-20 bg-white rounded-lg border border-gray-100">暂无计划数据，请点击右上角新建</div>
        )}
      </div>
    </div>
  );
}

function RoutineStandaloneEditor({ routine, onChange, onDelete }: { key?: React.Key; routine: Routine; onChange: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(routine);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(routine);
  }, [routine]);

  const save = async () => {
    setSaving(true);
    try {
      const { _id, ...updateData } = editing;
      await db.collection('routines').doc(_id!).update(updateData);
      onChange();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateRoutine = (data: Routine) => setEditing(data);

  return (
    <div className="border border-gray-200 rounded p-6 bg-white shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <input 
          value={editing.title}
          onChange={e => updateRoutine({ ...editing, title: e.target.value })}
          className="font-bold text-lg border-b border-gray-300 bg-transparent px-1 py-1 w-64 focus:border-[#1677ff] outline-none"
          placeholder="训练名称 (如: 推举日)"
        />
        <div className="flex items-center gap-4">
          <button onClick={onDelete} className="text-red-500 hover:text-red-600 transition-colors text-sm flex items-center gap-1">
            <Trash2 className="w-4 h-4"/> 删除计划
          </button>
          <button onClick={save} disabled={saving} className="bg-[#1677ff] hover:bg-[#4096ff] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
      </div>
      <textarea 
        value={editing.description}
        onChange={e => updateRoutine({ ...editing, description: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1677ff] focus:border-[#1677ff] outline-none h-16 bg-[#fafafa]"
        placeholder="计划描述"
      />

      <RoutineExercisesCategorizedEditor 
        exercises={editing.exercises || []} 
        onChange={(newEx) => updateRoutine({ ...editing, exercises: newEx })} 
      />
    </div>
  );
}

function PlansManager() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const res = await db.collection('plans').limit(100).get();
      const data = (res.data || []) as TrainingPlan[];
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPlans(data);
    } catch (e) {
      console.error('Fetch plans failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddPlan = async () => {
    console.log('handleAddPlan clicked!');
    setErrorMsg('');
    setIsAdding(true);
    try {
      const newPlan: TrainingPlan = {
        title: '新方案',
        scene: '健身房',
        description: '方案描述',
        routines: [],
        createdAt: Date.now()
      };
      
      console.log('Adding new plan to db:', newPlan);
      const res = await db.collection('plans').add(newPlan);
      console.log('Added new plan, res:', res);
      
      newPlan._id = res.id || res.ids?.[0];
      setPlans(prev => [newPlan, ...prev]);

      console.log('Added new plan locally successfully.');
    } catch (e: any) {
      console.error('handleAddPlan Error:', e);
      const msg = `添加失败: ${e.message || String(e)}`;
      setErrorMsg(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    setErrorMsg('');
    // Remove window.confirm to avoid iframe blocks
    try {
      await db.collection('plans').doc(id).remove();
      fetchPlans();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`删除失败: ${e.message || String(e)}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-800">所有方案 ({plans.length})</h2>
        <div className="flex items-center gap-2">
           {errorMsg && <span className="text-red-500 text-sm mr-2">{errorMsg}</span>}
           <button 
             onClick={handleAddPlan}
             disabled={isAdding}
             className={`transition-colors text-white px-4 py-2 rounded shadow-sm text-sm font-medium flex items-center gap-1.5 ${isAdding ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1677ff] hover:bg-[#4096ff]'}`}
           >
             <Plus className="w-4 h-4"/> {isAdding ? '添加中...' : '新建方案'}
           </button>
        </div>
      </div>

      <div className="space-y-6">
        {plans.map((plan, index) => (
          <PlanEditor key={plan._id || `pl-${index}`} plan={plan} onChange={fetchPlans} onDelete={() => handleDeletePlan(plan._id!)} />
        ))}
        {plans.length === 0 && (
          <div className="text-gray-500 text-center py-20 bg-white rounded-lg border border-gray-100">暂无方案数据，请点击右上角新建</div>
        )}
      </div>
    </div>
  );
}

function PlanEditor({ plan, onChange, onDelete }: { key?: React.Key; plan: TrainingPlan; onChange: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(plan);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditing(plan);
  }, [plan]);

  const save = async () => {
    setSaving(true);
    try {
      const { _id, ...updateData } = editing;
      await db.collection('plans').doc(_id!).update(updateData);
      onChange();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const path = `plans/${Date.now()}_${file.name}`;
      const fileId = await uploadFile(file, path);
      setEditing({ ...editing, coverImage: fileId });
    } catch (err) {
      alert('图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const updateRoutine = (index: number, routine: Routine) => {
    const newRoutines = [...(editing.routines || [])];
    newRoutines[index] = routine;
    setEditing({ ...editing, routines: newRoutines });
  };

  const addRoutine = () => {
    setEditing({ 
      ...editing, 
      routines: [...(editing.routines || []), { id: Date.now().toString(), title: '新计划(如: 推)', description: '', exercises: [] }] 
    });
  };

  const removeRoutine = (index: number) => {
    if (!window.confirm('确定删除该天训练计划吗？')) return;
    const newRoutines = [...(editing.routines || [])];
    newRoutines.splice(index, 1);
    setEditing({ ...editing, routines: newRoutines });
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">方案名称</label>
          <input 
            value={editing.title}
            onChange={e => setEditing({...editing, title: e.target.value})}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">依赖器械 (例如: 健身房)</label>
          <input 
            value={editing.scene || ''}
            onChange={e => setEditing({...editing, scene: e.target.value})}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">方案介绍</label>
          <textarea 
            value={editing.description || ''}
            onChange={e => setEditing({...editing, description: e.target.value})}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">封面图片</label>
          <div className="flex items-center gap-4">
             {editing.coverImage && (
               <div className="w-20 h-20 bg-gray-100 rounded border overflow-hidden relative">
                 <span className="text-[10px] absolute inset-0 flex items-center justify-center text-center p-1 break-all text-gray-400">已上传图</span>
               </div>
             )}
             <label className="bg-white border text-sm border-gray-300 hover:bg-gray-50 px-4 py-2 rounded cursor-pointer flex items-center gap-2 transition-colors">
               <ImageIcon className="w-4 h-4 text-gray-500"/> 
               <span>{uploadingImage ? '上传中...' : '选择图片'}</span>
               <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
             </label>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4 mt-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <div className="w-1 h-3.5 bg-[#1677ff] rounded-full"></div>
            包含的训练计划
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={addRoutine} className="text-sm text-[#1677ff] hover:bg-blue-50 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-blue-100">
              + 空白计划
            </button>
            <ImportRoutineButton onImport={(rt) => setEditing({...editing, routines: [...(editing.routines||[]), rt]})} />
          </div>
        </div>
        
        <div className="space-y-4">
          {(editing.routines || []).map((routine, i) => (
            <div key={i} className="border border-gray-200 rounded p-4 bg-[#fafafa] space-y-4">
               <div className="flex items-start justify-between">
                 <input 
                    value={routine.title}
                    onChange={e => updateRoutine(i, { ...routine, title: e.target.value })}
                    className="font-medium border-b border-gray-300 bg-transparent px-1 py-1 w-64 focus:border-[#1677ff] outline-none text-sm"
                    placeholder="训练名称 (如: 推举日)"
                 />
                 <button onClick={() => removeRoutine(i)} className="text-red-500 hover:text-red-600 transition-colors">
                   <Trash2 className="w-4 h-4"/>
                 </button>
               </div>
               <textarea 
                  value={routine.description}
                  onChange={e => updateRoutine(i, { ...routine, description: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1677ff] focus:border-[#1677ff] outline-none h-16 bg-white flex-shrink-0"
                  placeholder="这一天的训练描述"
               />

               <RoutineExercisesCategorizedEditor 
                  exercises={routine.exercises || []} 
                  onChange={(newEx) => updateRoutine(i, { ...routine, exercises: newEx })} 
               />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
        <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
           <Trash2 className="w-4 h-4" /> 彻底删除方案
        </button>
        <button onClick={save} disabled={saving} className="bg-[#1677ff] hover:bg-[#4096ff] text-white px-6 py-2 rounded text-sm font-medium transition-colors shadow-sm">
          {saving ? '保存中...' : '保存更改'}
        </button>
      </div>

    </div>
  )
}

function XIcon({className}:{className?:string}){
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}
