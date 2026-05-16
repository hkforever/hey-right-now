import { useState } from 'react';
import { ExerciseType, Plan, PlanItem, WorkoutSet, PlanSection } from '../types';
import { useAppStore, useAppData } from '../store';
import { MoreVertical, Check, ArrowUp, ArrowDown, RefreshCw, Trash2, GripHorizontal, X, ChevronDown, ChevronRight, Pencil, Plus, Loader2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExerciseSelector from './ExerciseSelector';
import RestTimerModal from './RestTimerModal';
import ExerciseTypeModal, { getExerciseTypeLabel } from './ExerciseTypeModal';
import DurationPickerModal from './DurationPickerModal';
import ExerciseDetailModal from './ExerciseDetailModal';
import ReorderModal from './ReorderModal';
import CloudMedia from './CloudMedia';
import { cn, formatRestTime, formatTime } from '../lib/utils';

const getTypeColumns = (type?: ExerciseType): { col1: { key: 'weight' | 'reps' | 'time' | 'distance', label: string } | null, col2: { key: 'weight' | 'reps' | 'time' | 'distance', label: string } | null } => {
  switch (type) {
    case 'weight_reps':
      return { col1: { key: 'weight', label: 'KG' }, col2: { key: 'reps', label: '次' } };
    case 'weighted_bodyweight':
      return { col1: { key: 'weight', label: '+KG' }, col2: { key: 'reps', label: '次' } };
    case 'assisted_bodyweight':
      return { col1: { key: 'weight', label: '-KG' }, col2: { key: 'reps', label: '次' } };
    case 'reps_only':
    case 'bodyweight':
      return { col1: null, col2: { key: 'reps', label: '次' } };
    case 'time':
      return { col1: null, col2: { key: 'time', label: '时间' } };
    case 'time_weight':
      return { col1: { key: 'weight', label: 'KG' }, col2: { key: 'time', label: '时间' } };
    case 'distance_time':
      return { col1: { key: 'distance', label: 'KM' }, col2: { key: 'time', label: '时间' } };
    case 'weight_distance':
      return { col1: { key: 'weight', label: 'KG' }, col2: { key: 'distance', label: 'KM' } };
    default:
      return { col1: { key: 'weight', label: 'KG' }, col2: { key: 'reps', label: '次' } };
  }
};

export default function PlanEditor({ planId, onClose }: { planId: string | null, onClose: () => void }) {
  const { plans, addPlan, updatePlan } = useAppStore();
  const { allExercises, getExercise } = useAppData();
  
  const existingPlan = planId ? plans.find(p => p.id === planId) : null;
  
  const [title, setTitle] = useState(existingPlan?.title || '新计划');
  const [items, setItems] = useState<PlanItem[]>(existingPlan?.items || []);
  const [sections, setSections] = useState<PlanSection[]>(() => {
    if (existingPlan?.sections) return existingPlan.sections;
    if (existingPlan?.items.length) {
      return existingPlan.items.some(i => !i.sectionId) ? [{ id: 'default', title: '默认分类' }] : [];
    }
    return [
      { id: crypto.randomUUID(), title: '练前热身' },
      { id: crypto.randomUUID(), title: '正式训练' },
      { id: crypto.randomUUID(), title: '练后拉伸' }
    ];
  });
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [activeTargetSectionId, setActiveTargetSectionId] = useState<string | null>(null);
  const [activeRestTimerId, setActiveRestTimerId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeSectionMenuId, setActiveSectionMenuId] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(new Set());
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [activeDurationPicker, setActiveDurationPicker] = useState<{ itemId: string, setId: string, key: 'time' | 'weight' | 'reps' | 'distance' } | null>(null);
  const [activeExerciseTypePickerId, setActiveExerciseTypePickerId] = useState<string | null>(null);
  const [showingExerciseDetail, setShowingExerciseDetail] = useState<any>(null);
  const [swipedSetId, setSwipedSetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // If items exist without a section, and no sections exist, add a default one
  if (items.length > 0 && sections.length === 0) {
    const defaultSec = { id: 'default', title: '默认分类' };
    setSections([defaultSec]);
    setItems(items.map(i => i.sectionId ? i : { ...i, sectionId: defaultSec.id }));
  }

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (existingPlan) {
        await updatePlan({ ...existingPlan, title, items, sections });
      } else {
        await addPlan({ id: crypto.randomUUID(), title, createdAt: Date.now(), items, sections });
      }
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      // We could add a toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExercises = (exerciseIds: string[]) => {
    if (replacingItemId) {
      const newEId = exerciseIds[0];
      if (newEId) {
        setItems(prev => prev.map(item => item.id === replacingItemId ? { ...item, exerciseId: newEId } : item));
      }
      setReplacingItemId(null);
      return;
    }

    const targetSectionId = activeTargetSectionId || (sections.length > 0 ? sections[0].id : undefined);

    const newItems = exerciseIds.map(eId => ({
      id: crypto.randomUUID(),
      exerciseId: eId,
      notes: '',
      restTime: 0,
      sectionId: targetSectionId,
      targetSets: [{ id: crypto.randomUUID(), setType: 'normal' as const, completed: false }]
    }));
    setItems(prev => [...prev, ...newItems]);
    setIsSelectingExercise(false);
    setActiveTargetSectionId(null);
  };

  const addSet = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const lastSet = item.targetSets[item.targetSets.length - 1];
        return {
          ...item,
          targetSets: [...item.targetSets, { 
            id: crypto.randomUUID(), 
            setType: 'normal' as const, 
            completed: false, 
            weight: lastSet?.weight, 
            reps: lastSet?.reps,
            distance: lastSet?.distance,
            time: lastSet?.time,
          }]
        };
      }
      return item;
    }));
  };

  const deleteSet = (itemId: string, setId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          targetSets: item.targetSets.filter(s => s.id !== setId)
        };
      }
      return item;
    }));
  };

  const changeItemType = (itemId: string, newType: ExerciseType) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          type: newType,
          targetSets: item.targetSets.map(s => {
            const rs: any = { id: s.id, setType: s.setType, completed: s.completed, achievements: s.achievements };
            if (['weight_reps', 'reps_only', 'weighted_bodyweight', 'assisted_bodyweight'].includes(newType)) {
              rs.reps = s.reps || 12;
            }
            if (['weight_reps', 'time_weight', 'weight_distance'].includes(newType)) {
              rs.weight = s.weight || undefined;
            }
            if (['weighted_bodyweight', 'assisted_bodyweight'].includes(newType)) {
              rs.weight = s.weight || undefined;
            }
            if (['time', 'time_weight', 'distance_time'].includes(newType)) {
              rs.time = s.time || 60;
            }
            if (['distance_time', 'weight_distance'].includes(newType)) {
              rs.distance = s.distance || undefined;
            }
            return rs;
          })
        };
      }
      return item;
    }));
  };

  const addSection = () => {
    const newSection = { id: crypto.randomUUID(), title: '新分类' };
    setSections(prev => [...prev, newSection]);
  };

  const updateSection = (id: string, newTitle: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const deleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    setItems(prev => prev.map(item => item.sectionId === id ? { ...item, sectionId: undefined } : item));
  };

  const toggleSection = (id: string) => {
    setCollapsedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderItem = (item: PlanItem, idx: number) => {
    const ex = getExercise(item.exerciseId);
    const cols = getTypeColumns(item.type || ex?.type);
    return (
      <div key={item.id} className="space-y-3">
        <div className="flex justify-between items-center font-medium px-4 mb-2 mt-4 relative">
          <div className="flex flex-col flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 border border-gray-200 overflow-hidden">
                {ex?.media ? (
                  <CloudMedia src={ex.media} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
                )}
              </div>
              <span 
                className="text-blue-500 text-base font-semibold cursor-pointer hover:underline transition-opacity"
                onClick={() => {
                  if (ex) setShowingExerciseDetail(ex);
                }}
              >
                {ex?.name || '未知动作'}
              </span>
            </div>
          </div>
          <button onClick={() => setActiveMenuId(item.id)} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors self-start">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-sm text-gray-400 px-4 ml-12 mb-2">在此处添加计划备注</div>
        
        <div className="flex flex-wrap items-center gap-4 px-4 ml-12 mb-4">
          <div 
            onClick={() => setActiveRestTimerId(item.id)}
            className="flex items-center text-blue-500 text-sm cursor-pointer hover:opacity-80 transition-opacity w-fit"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>休息: {formatRestTime(item.restTime || 0)}</span>
          </div>
          <div 
            onClick={() => setActiveExerciseTypePickerId(item.id)}
            className="flex items-center text-blue-500 text-sm cursor-pointer hover:opacity-80 transition-opacity w-fit"
          >
            <Activity className="w-4 h-4 mr-1" />
            <span>类型: {getExerciseTypeLabel(item.type || ex?.type)}</span>
          </div>
        </div>
        
        <div className="space-y-0 relative">
          <div className="grid grid-cols-12 gap-1 px-4 mb-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider pb-1 border-b border-gray-100">
             <div className="col-span-2 text-center">组</div>
             {cols.col1 && cols.col2 ? (
               <>
                 <div className="col-span-5 text-center">{cols.col1.label}</div>
                 <div className="col-span-5 text-center">{cols.col2.label}</div>
               </>
             ) : (
               <div className="col-span-10 text-center">{cols.col1?.label || cols.col2?.label}</div>
             )}
          </div>
          
          {(item.targetSets || []).map((set, setIdx) => (
            <div key={set.id} className="relative group overflow-hidden h-[57px]">
              <div 
                onClick={() => deleteSet(item.id, set.id)}
                className="absolute inset-0 bg-red-500 flex justify-end items-center px-6 cursor-pointer"
              >
                 <Trash2 className="w-5 h-5 text-white" />
              </div>

              <motion.div 
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.2}
                dragMomentum={false}
                animate={{ x: swipedSetId === set.id ? -80 : 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                onDragStart={() => {
                  if (swipedSetId !== set.id) setSwipedSetId(null);
                }}
                onDragEnd={(_, info) => {
                  // Extremely sensitive: 20px offset or 200 velocity triggers the snap
                  const shouldOpen = info.offset.x < -20 || info.velocity.x < -200;
                  if (shouldOpen) {
                    setSwipedSetId(set.id);
                  } else {
                    setSwipedSetId(null);
                  }
                }}
                className={cn(
                  "grid grid-cols-12 gap-1 items-center py-2 px-4 bg-white relative z-10 w-full h-full touch-pan-y", 
                  setIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                )}
              >
                <div className="col-span-2 flex justify-center">
                  <span className="font-bold font-mono text-sm py-0.5 px-2 rounded-md bg-gray-100 text-gray-600 border border-transparent">{setIdx + 1}</span>
                </div>
                {cols.col1 && (
                  <div className={cols.col1 && cols.col2 ? "col-span-5 px-2" : "col-span-10 px-2 lg:px-8"}>
                    {cols.col1.key === 'time' ? (
                      <button
                        onClick={() => setActiveDurationPicker({ itemId: item.id, setId: set.id, key: cols.col1!.key })}
                        className="w-full h-10 text-center rounded-lg font-bold font-mono text-lg transition-all bg-gray-100 text-gray-900 border border-transparent focus:bg-white focus:border-blue-500 flex items-center justify-center"
                      >
                        {set[cols.col1.key] ? formatTime(Number(set[cols.col1.key])) : '-'}
                      </button>
                    ) : (
                      <input 
                        type="number"
                        placeholder="-"
                        value={set[cols.col1.key] || ''}
                        onChange={(e) => {
                          setItems(prev => prev.map(i => i.id === item.id ? { ...i, targetSets: (i.targetSets || []).map(s => s.id === set.id ? { ...s, [cols.col1!.key]: e.target.value ? Number(e.target.value) : undefined } : s) } : i))
                        }}
                        className="w-full h-10 text-center rounded-lg font-bold font-mono text-lg outline-none transition-all bg-gray-100 text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                      />
                    )}
                  </div>
                )}
                {cols.col2 && (
                  <div className={cols.col1 && cols.col2 ? "col-span-5 px-2" : "col-span-10 px-2 lg:px-8"}>
                    {cols.col2.key === 'time' ? (
                      <button
                        onClick={() => setActiveDurationPicker({ itemId: item.id, setId: set.id, key: cols.col2!.key })}
                        className="w-full h-10 text-center rounded-lg font-bold font-mono text-lg transition-all bg-gray-100 text-gray-900 border border-transparent focus:bg-white focus:border-blue-500 flex items-center justify-center"
                      >
                        {set[cols.col2.key] ? formatTime(Number(set[cols.col2.key])) : '-'}
                      </button>
                    ) : (
                      <input 
                        type="number"
                        placeholder="-"
                        value={set[cols.col2.key] || ''}
                        onChange={(e) => {
                          setItems(prev => prev.map(i => i.id === item.id ? { ...i, targetSets: (i.targetSets || []).map(s => s.id === set.id ? { ...s, [cols.col2!.key]: e.target.value ? Number(e.target.value) : undefined } : s) } : i))
                        }}
                        className="w-full h-10 text-center rounded-lg font-bold font-mono text-lg outline-none transition-all bg-gray-100 text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                      />
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          ))}
          
          <div className="px-4 py-3 bg-white">
            <button onClick={() => addSet(item.id)} className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold tracking-tight rounded-xl text-sm transition-colors border border-gray-100">
              + 添加组
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <header className="h-14 border-b border-gray-200 px-4 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
        <button onClick={onClose} className="text-blue-500 text-base font-normal">
          取消
        </button>
        <span className="font-medium text-base text-gray-900">
          {existingPlan ? '编辑计划' : '创建计划'}
        </span>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          {existingPlan ? '更新' : '保存'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 pb-24 bg-white relative">
        <div className="px-4 border-b border-gray-200 pb-3 mb-4">
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="计划标题"
            className="w-full bg-transparent text-xl tracking-tight font-medium text-gray-400 focus:text-gray-900 outline-none placeholder-gray-300"
          />
        </div>
        
        {items.length === 0 && sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 mb-4 opacity-50"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
            <p className="text-sm mb-8">将一项运动添加到您的计划中，开始锻炼。</p>
            <button 
              onClick={() => {
                setActiveTargetSectionId(null);
                setIsSelectingExercise(true);
              }} 
              className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg flex items-center justify-center space-x-1"
            > 
              <span>+</span> <span>添加运动</span> 
            </button>
          </div>
        )}

        <div className="space-y-6 pb-12">
          {/* Uncategorized Items (should ideally be migrated to default section) */}
          {items.filter(i => !i.sectionId).length > 0 && (
            <div className="space-y-6">
              {items.filter(i => !i.sectionId).map((item, idx) => renderItem(item, idx))}
              <div className="px-4 py-2">
                <button 
                  onClick={() => {
                    setActiveTargetSectionId(null);
                    setIsSelectingExercise(true);
                  }}
                  className="w-full py-2.5 bg-gray-50 border border-dashed border-blue-200 text-blue-500 rounded-xl flex items-center justify-center space-x-1 hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  <span>+ 添加运动</span>
                </button>
              </div>
            </div>
          )}

          {/* Categorized Sections */}
          {sections.map((section) => {
            const isCollapsed = collapsedSectionIds.has(section.id);
            const sectionItems = items.filter(i => i.sectionId === section.id);
            
            return (
              <div key={section.id} className="pt-2 border-t border-gray-100 bg-white">
                <div className="px-4 flex items-center justify-between py-2 group bg-gray-50/50">
                  <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                    <button 
                      onClick={() => toggleSection(section.id)}
                      className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {renamingSectionId === section.id ? (
                      <input 
                        autoFocus
                        type="text"
                        value={section.title}
                        onBlur={() => setRenamingSectionId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setRenamingSectionId(null)}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        className="bg-white px-2 py-0.5 rounded border border-blue-500 text-gray-900 font-bold text-lg outline-none flex-1"
                      />
                    ) : (
                      <span 
                        onClick={() => toggleSection(section.id)}
                        className="text-gray-900 font-bold text-lg truncate flex-1 py-1"
                      >
                        {section.title}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveSectionMenuId(section.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-full"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div 
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-6 mt-2">
                        {sectionItems.length > 0 ? (
                          sectionItems.map((item, idx) => renderItem(item, idx))
                        ) : (
                          <div className="px-14 py-4 text-xs text-gray-400 italic">此分类下暂无动作</div>
                        )}

                        <div className="px-4 py-2">
                          <button 
                            onClick={() => {
                              setActiveTargetSectionId(section.id);
                              setIsSelectingExercise(true);
                            }}
                            className="w-full py-2.5 bg-gray-50 border border-dashed border-blue-200 text-blue-500 rounded-xl flex items-center justify-center space-x-1 hover:bg-blue-50 transition-colors text-sm font-medium"
                          >
                            <span>+ 添加运动</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="pt-2 border-t border-gray-100 bg-white">
            <div className="px-4 flex items-center py-2 bg-gray-50/50">
              <button 
                onClick={addSection}
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-600 transition-colors flex-1"
              >
                <div className="p-1">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold">添加分类</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom padding handled by the Add Category button block above */}

      {isSelectingExercise && (
        <ExerciseSelector 
          onClose={() => {
            setIsSelectingExercise(false);
            setActiveTargetSectionId(null);
          }}
          onAdd={handleAddExercises} 
        />
      )}

      {replacingItemId && (
        <ExerciseSelector 
          onClose={() => setReplacingItemId(null)}
          onAdd={(ids) => {
             if (ids.length > 0) {
                 setItems(prev => prev.map(item => item.id === replacingItemId ? { ...item, exerciseId: ids[0] } : item));
             }
             setReplacingItemId(null);
          }} 
        />
      )}

      <AnimatePresence>
        {activeSectionMenuId && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveSectionMenuId(null)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl overflow-hidden pb-safe z-10"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
              <div className="px-4 pb-4">
                <div className="text-center font-medium text-gray-900 border-b border-gray-100 pb-3 mb-2">
                  分类选项: {sections.find(s => s.id === activeSectionMenuId)?.title}
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { setIsReorderModalOpen(true); setActiveSectionMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-gray-700"
                  >
                    <span className="font-medium">分类及动作重新排序</span>
                    <GripHorizontal className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => { setRenamingSectionId(activeSectionMenuId); setActiveSectionMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-gray-700"
                  >
                    <span className="font-medium">重命名分类</span>
                    <Pencil className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => { if (activeSectionMenuId) deleteSection(activeSectionMenuId); setActiveSectionMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors text-red-500"
                  >
                    <span className="font-medium">删除分类</span>
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMenuId && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveMenuId(null)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl overflow-hidden pb-safe z-10"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
              <div className="px-4 pb-4">
                <div className="text-center font-medium text-gray-900 border-b border-gray-100 pb-3 mb-2">
                  {getExercise(items.find(i => i.id === activeMenuId)?.exerciseId || '')?.name || '选项'}
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { setIsReorderModalOpen(true); setActiveMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-gray-700"
                  >
                    <span className="font-medium">重新排序</span>
                    <GripHorizontal className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => { setReplacingItemId(activeMenuId); setActiveMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-gray-700"
                  >
                    <span className="font-medium">替换运动</span>
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => { setItems(prev => prev.filter(i => i.id !== activeMenuId)); setActiveMenuId(null); }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors text-red-500"
                  >
                    <span className="font-medium">删除运动</span>
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeRestTimerId && (
        <RestTimerModal
          isOpen={!!activeRestTimerId}
          onClose={() => setActiveRestTimerId(null)}
          title={`休息定时器 - ${getExercise(items.find(i => i.id === activeRestTimerId)?.exerciseId || '')?.name || ''}`}
          value={items.find(i => i.id === activeRestTimerId)?.restTime || 0}
          onChange={(val) => {
            setItems(prev => prev.map(i => i.id === activeRestTimerId ? { ...i, restTime: val } : i));
          }}
        />
      )}

      {activeExerciseTypePickerId && (
        <ExerciseTypeModal
          isOpen={!!activeExerciseTypePickerId}
          onClose={() => setActiveExerciseTypePickerId(null)}
          value={items.find(i => i.id === activeExerciseTypePickerId)?.type || getExercise(items.find(i => i.id === activeExerciseTypePickerId)?.exerciseId || '')?.type || 'weight_reps'}
          onChange={(val) => {
            if (activeExerciseTypePickerId) {
              changeItemType(activeExerciseTypePickerId, val);
            }
          }}
        />
      )}

      <AnimatePresence>
        {isReorderModalOpen && (
          <ReorderModal
            isOpen={isReorderModalOpen}
            onClose={() => setIsReorderModalOpen(false)}
            items={items}
            setItems={setItems}
            sections={sections}
            onReorderComplete={(newItems, newSections) => {
              setItems(newItems);
              setSections(newSections);
            }}
          />
        )}
      </AnimatePresence>

      <DurationPickerModal
        isOpen={!!activeDurationPicker}
        onClose={() => setActiveDurationPicker(null)}
        value={activeDurationPicker ? Number(items.find(i => i.id === activeDurationPicker.itemId)?.targetSets?.find(s => s.id === activeDurationPicker.setId)?.[activeDurationPicker.key] || 0) : 0}
        onChange={(val) => {
          if (activeDurationPicker) {
            setItems(prev => prev.map(i => i.id === activeDurationPicker.itemId ? { ...i, targetSets: (i.targetSets || []).map(s => s.id === activeDurationPicker.setId ? { ...s, [activeDurationPicker.key]: val } : s) } : i));
          }
        }}
      />

      {showingExerciseDetail && (
        <ExerciseDetailModal 
          exercise={showingExerciseDetail}
          onClose={() => setShowingExerciseDetail(null)}
        />
      )}
    </div>
  );
}
