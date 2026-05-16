import { useAppStore, useAppData } from '../store';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { calculateVolume, formatTime, translateMuscle, translateEquipment, isVideo } from '../lib/utils';
import { Activity, Dumbbell, Trash2, Edit2, MoreHorizontal, LogOut, Play, Plus, ScrollText, Settings } from 'lucide-react';
import { useState } from 'react';
import CloudMedia from './CloudMedia';
import CustomExerciseForm from './CustomExerciseForm';
import WorkoutLogDetail from './WorkoutLogDetail';
import MuscleDistributionModal from './MuscleDistributionModal';
import SettingsModal from './SettingsModal';
import MediaPlayerModal from './MediaPlayerModal';
import ExerciseDetailModal from './ExerciseDetailModal';
import Body from 'react-muscle-highlighter';
import { getMuscleData } from '../lib/muscle-utils';
import { Exercise, WorkoutLog, MediaItem } from '../types';

export default function MeTab() {
  const { history, deleteCustomExercise, deleteWorkoutLog, updateWorkoutLog, user, logout, hasMoreHistory, loadMoreHistory, setPreviewLogId, setPreviewExerciseId } = useAppStore();
  const { allExercises, getExercise } = useAppData();
  const [view, setView] = useState<'history' | 'exercises'>('history');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<WorkoutLog | null>(null);
  const [showMuscleDistribution, setShowMuscleDistribution] = useState<WorkoutLog | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [showingExerciseDetail, setShowingExerciseDetail] = useState<Exercise | null>(null);
  const [isDeletingFromModal, setIsDeletingFromModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleNavigateToLog = (logId: string, exerciseId: string) => {
    setShowingExerciseDetail(null);
    setPreviewLogId(logId);
    setPreviewExerciseId(exerciseId);
  };

  return (
    <div className="min-h-full flex flex-col font-sans h-full bg-gray-50 pb-safe" onClick={() => setActiveDropdownId(null)}>
      <main className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="sticky top-0 z-20 p-4 pt-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500 overflow-hidden shadow-lg shadow-blue-500/20 rotate-3">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover -rotate-3" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black -rotate-3">
                    {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {user?.displayName || user?.username || user?.email?.split('@')[0] || '用户名'}
                </h2>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(true);
                }}
                className="p-3 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-2xl transition-colors active:scale-95 group"
                title="设置"
              >
                <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats Section (Not Sticky) */}
        <div className="px-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl relative overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">累计训练</p>
              <p className="text-2xl font-black text-gray-900 tracking-tighter">{history.length} <span className="text-xs uppercase ml-0.5">次</span></p>
              <Activity className="absolute -right-4 -bottom-4 w-16 h-16 text-gray-50/20" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl relative overflow-hidden">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">记录运动</p>
              <p className="text-2xl font-black text-gray-900 tracking-tighter">{allExercises.filter(e => e.isCustom).length} <span className="text-xs uppercase ml-0.5">项</span></p>
              <Dumbbell className="absolute -right-4 -bottom-4 w-16 h-16 text-gray-200/20" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50/80 backdrop-blur-md px-4 py-3">
          <header className="bg-white border-b border-gray-100 flex p-1 rounded-xl shrink-0 shadow-sm shadow-gray-100">
            <button 
              onClick={(e) => { e.stopPropagation(); setView('history'); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${view === 'history' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'}`}
            >
              历史
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setView('exercises'); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${view === 'exercises' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'}`}
            >
              运动库
            </button>
          </header>
        </div>

        <div className="px-4 pb-4">
          {view === 'history' ? (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm font-medium">暂无训练记录</p>
              </div>
            ) : (
              <>
                {(history || []).map(log => (
                <div 
                  key={log.id} 
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-4 active:scale-[0.99] transition-transform relative cursor-pointer hover:border-blue-100"
                  onClick={() => setEditingLog(log)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 
                        className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-500 transition-colors inline-block"
                      >
                        {log.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-bold">
                          {format(log.startTime, 'yyyy-MM-dd', { locale: zhCN })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === log.id ? null : log.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {activeDropdownId === log.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLog(log);
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Edit2 className="w-4 h-4 mr-2 text-gray-400" /> 编辑
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogToDelete(log);
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> 删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-8 text-sm text-gray-500 border-b border-gray-50 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">容量</span>
                      <div className="flex items-baseline space-x-0.5">
                        <span className="text-gray-900 font-black font-mono text-xl">{calculateVolume(log.items).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">KG</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">用时</span>
                      <span className="text-gray-900 font-black font-mono text-xl">
                        {log.endTime ? formatTime(Math.floor((log.endTime - log.startTime) / 1000)) : '进行中'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">组数</span>
                      <span className="text-gray-900 font-black font-mono text-xl">
                        {log.items.reduce((acc, item) => acc + item.sets.filter(s => s.completed).length, 0)}
                      </span>
                    </div>
                  </div>

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMuscleDistribution(log);
                      }}
                      className="mt-4 aspect-video w-full bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center cursor-pointer active:scale-[0.99] transition-all hover:bg-gray-100/50 group overflow-hidden"
                    >
                      <div className="flex items-center justify-center space-x-8 h-full w-full py-1">
                        <div className="h-full flex items-center justify-center">
                          <Body 
                            data={getMuscleData(log, allExercises)} 
                            side="front" 
                            scale={0.32} 
                            defaultStroke="#FFFFFF"
                            defaultStrokeWidth={1.5}
                          />
                        </div>
                        <div className="h-full flex items-center justify-center">
                          <Body 
                            data={getMuscleData(log, allExercises)} 
                            side="back" 
                            scale={0.32} 
                            defaultStroke="#FFFFFF"
                            defaultStrokeWidth={1.5}
                          />
                        </div>
                      </div>
                    </div>

                  <div className="space-y-2 pt-2">
                    {(log.items || []).slice(0, 6).map(item => {
                      const ex = getExercise(item.exerciseId);
                      const validSets = (item.sets || []).filter(s => s.completed);
                      let bestSetStr = '';
                      if (ex?.type === 'weight_reps') {
                        const bestSet = [...validSets].sort((a,b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))[0];
                        if (bestSet) bestSetStr = `${bestSet.weight}kg × ${bestSet.reps}`;
                      } else if (ex?.type === 'bodyweight' || ex?.type === 'reps_only') {
                         const bestSet = [...validSets].sort((a,b) => (Number(b.reps) || 0) - (Number(a.reps) || 0))[0];
                         if (bestSet) bestSetStr = `${bestSet.reps} 次`;
                      }

                      return (
                        <div key={item.id} className="flex justify-between items-center bg-gray-50/50 rounded-lg p-2">
                          <span className="text-gray-800 text-xs font-bold truncate max-w-[60%]">{validSets.length} × {ex?.name || '未知项目'}</span>
                          <span className="text-gray-500 text-[10px] font-bold font-mono bg-white px-2 py-0.5 rounded shadow-sm">{bestSetStr}</span>
                        </div>
                      );
                    })}
                    {log.items.length > 6 && (
                      <div className="text-center py-1 mt-1 border-t border-gray-100 flex items-center justify-center space-x-2">
                        <div className="h-px bg-gray-100 flex-1"></div>
                        <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">还有 {log.items.length - 6} 项训练内容</span>
                        <div className="h-px bg-gray-100 flex-1"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {hasMoreHistory && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    loadMoreHistory();
                  }}
                  className="w-full py-4 text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors bg-white border border-dashed border-blue-200 rounded-2xl active:scale-[0.98] mt-4 flex items-center justify-center space-x-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>查看更早的训练记录...</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-2">
               <span className="text-xs font-bold text-gray-400 uppercase">运动项目 ({allExercises.filter(e => e.isCustom).length})</span>
            </div>
            {allExercises.filter(e => e.isCustom).map(ex => (
              <div 
                key={ex.id} 
                onClick={() => setShowingExerciseDetail(ex)}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between relative transition-colors active:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0 overflow-hidden">
                    {ex.media ? (
                       <CloudMedia src={ex.media} alt={ex.name} className="w-full h-full object-cover" />
                    ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-400"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-gray-900">{ex.name}</h4>
                      {(ex.videoUrl || (ex.videos && ex.videos.length > 0)) && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="包含演示视频" />
                      )}
                      {ex.isCustom && !ex.isStandardOverride ? (
                        <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase border border-blue-100">自定义</span>
                      ) : (
                        <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-black uppercase">标准</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{translateMuscle(ex.primaryMuscle)} • {translateEquipment(ex.equipment)}</p>
                  </div>
                </div>
                
                {ex.isCustom && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === ex.id ? null : ex.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    {activeDropdownId === ex.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExercise(ex);
                            setActiveDropdownId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <Edit2 className="w-4 h-4 mr-2 text-gray-400" /> 编辑
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExerciseToDelete(ex);
                            setActiveDropdownId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> 删除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 mb-24">
        </div>
      </div>
    </main>

      {editingExercise && (
        <CustomExerciseForm 
          initialExercise={editingExercise}
          onClose={() => setEditingExercise(null)}
          onSave={() => setEditingExercise(null)}
        />
      )}

      {showMuscleDistribution && (
        <MuscleDistributionModal 
          isOpen={!!showMuscleDistribution}
          onClose={() => setShowMuscleDistribution(null)}
          workout={showMuscleDistribution}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {(logToDelete || exerciseToDelete) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">确认删除</h3>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              {logToDelete ? `确定要删除这条训练记录吗？` : `确定要删除 "${exerciseToDelete?.name}" 吗？`}
              <br />
              <span className="text-red-500 text-xs mt-2 block font-bold">此操作无法撤销。</span>
            </p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => {
                  setLogToDelete(null);
                  setExerciseToDelete(null);
                  setIsDeletingFromModal(false);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (logToDelete) {
                    deleteWorkoutLog(logToDelete.id);
                    setLogToDelete(null);
                    if (isDeletingFromModal) setEditingLog(null);
                  } else if (exerciseToDelete) {
                    deleteCustomExercise(exerciseToDelete.id);
                    setExerciseToDelete(null);
                  }
                  setIsDeletingFromModal(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      )}

      <MediaPlayerModal 
        item={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />

      {showingExerciseDetail && (
        <ExerciseDetailModal 
          exercise={showingExerciseDetail}
          onClose={() => setShowingExerciseDetail(null)}
          onNavigateToLog={handleNavigateToLog}
        />
      )}

      {editingLog && (
        <WorkoutLogDetail
          isOpen={true}
          onClose={() => setEditingLog(null)}
          onSave={(summary) => {
            const updated = {
              ...editingLog,
              title: summary.title,
              notes: summary.notes,
              mediaItems: summary.mediaItems
            };
            updateWorkoutLog(updated);
            setEditingLog(updated);
          }}
          onDiscard={() => {
            setLogToDelete(editingLog);
            setIsDeletingFromModal(true);
          }}
          log={editingLog}
        />
      )}
    </div>
  );
}
