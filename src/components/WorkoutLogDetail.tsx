import React, { useState } from 'react';
import { ChevronLeft, MoreHorizontal, Award, Edit3, Trash2, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppData, useAppStore } from '../store';
import { calculateVolume, formatTime } from '../lib/utils';
import Body from 'react-muscle-highlighter';
import { getMuscleData } from '../lib/muscle-utils';
import CloudMedia from './CloudMedia';
import { WorkoutLog, MediaItem } from '../types';


interface WorkoutLogDetailProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: { title: string, notes: string, mediaItems: MediaItem[] }) => void;
  onDiscard: () => void;
  log: WorkoutLog;
  scrollToExerciseId?: string | null;
}

export default function WorkoutLogDetail({ isOpen, onClose, onSave, onDiscard, log, scrollToExerciseId }: WorkoutLogDetailProps) {
  const { allExercises, getExercise } = useAppData();
  const { user, history } = useAppStore();
  const [showOptions, setShowOptions] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaItem | null>(null);

  const currentLogPRs = React.useMemo(() => {
    const prs: Record<string, {
      maxWeightSetId?: string,
      max1RMSetId?: string,
      bestSetId?: string
    }> = {};

    log.items.forEach(logItem => {
      const exercise = getExercise(logItem.exerciseId);
      if (!exercise) return;

      const exerciseHistory = history.filter(h => 
        h.items.some(item => {
          const itemEx = getExercise(item.exerciseId);
          return itemEx?.name === exercise.name && itemEx?.equipment === exercise.equipment;
        })
      );

      let maxWeight = 0;
      let maxWeightLogId: string | null = null;
      let maxWeightSetId: string | null = null;
      
      let max1RM = 0;
      let max1RMLogId: string | null = null;
      let max1RMSetId: string | null = null;

      let bestSetMetric = 0;
      let bestSetLogId: string | null = null;
      let bestSetSetId: string | null = null;

      exerciseHistory.forEach(h => {
        h.items.forEach(item => {
          const itemEx = getExercise(item.exerciseId);
          if (itemEx?.name !== exercise.name || itemEx?.equipment !== exercise.equipment) return;

          item.sets.forEach(set => {
            if (!set.completed || !set.weight || !set.reps) return;
            const w = set.weight;
            const r = set.reps;

            if (w > maxWeight) {
              maxWeight = w;
              maxWeightLogId = h.id;
              maxWeightSetId = set.id;
            }

            const oneRM = w * (36 / (37 - Math.min(r, 36)));
            if (oneRM > max1RM) {
              max1RM = oneRM;
              max1RMLogId = h.id;
              max1RMSetId = set.id;
            }

            const wR = w * r;
            if (wR > bestSetMetric) {
              bestSetMetric = wR;
              bestSetLogId = h.id;
              bestSetSetId = set.id;
            }
          });
        });
      });

      prs[logItem.id] = {
        maxWeightSetId: maxWeightLogId === log.id && maxWeightSetId ? maxWeightSetId : undefined,
        max1RMSetId: max1RMLogId === log.id && max1RMSetId ? max1RMSetId : undefined,
        bestSetId: bestSetLogId === log.id && bestSetSetId ? bestSetSetId : undefined,
      };
    });

    return prs;
  }, [log, history, getExercise]);

  const totalMedals = React.useMemo(() => {
    return Object.values(currentLogPRs).reduce((acc: number, pr: any) => {
      let count = 0;
      if (pr.maxWeightSetId) count++;
      if (pr.max1RMSetId) count++;
      if (pr.bestSetId) count++;
      return acc + count;
    }, 0);
  }, [currentLogPRs]);

  React.useEffect(() => {
    if (isOpen && scrollToExerciseId) {
      setTimeout(() => {
        const element = document.getElementById(`exercise-${scrollToExerciseId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-blue-50/50');
          setTimeout(() => {
            element.classList.remove('bg-blue-50/50');
          }, 2000);
        }
      }, 300);
    }
  }, [isOpen, scrollToExerciseId]);

  if (!isOpen) return null;

  const duration = log.endTime ? Math.floor((log.endTime - log.startTime) / 1000) : 0;
  const volume = calculateVolume(log.items);
  const totalSets = log.items.reduce((acc, item) => acc + item.sets.filter(s => s.completed).length, 0);

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col font-sans animate-in slide-in-from-bottom duration-300">
      <header className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-900 active:scale-90 transition-transform">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <span className="font-black text-lg text-gray-900 tracking-tight">训练详情</span>
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 -mr-2 text-gray-900 active:scale-90 transition-transform"
          >
            <MoreHorizontal className="w-7 h-7" />
          </button>
          
          {showOptions && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
              <button 
                onClick={() => {
                  setShowOptions(false);
                }}
                className="w-full text-left px-5 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
              >
                <Edit3 className="w-4 h-4 mr-3 text-gray-400" /> 编辑标题和记录
              </button>
              <div className="h-px bg-gray-50 mx-2" />
              <button 
                onClick={() => {
                  setShowOptions(false);
                  onDiscard();
                }}
                className="w-full text-left px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-3" /> 删除训练
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-10">
        {/* User Stats Card */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex flex-col space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{log.title || '我的训练'}</h1>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-gray-900">
                {user?.displayName || user?.username || user?.email?.split('@')[0] || '用户名'}
              </span>
              <span className="text-[11px] font-bold text-gray-300">·</span>
              <p className="text-[11px] font-bold text-gray-400">
                {format(log.startTime, 'M月d日 - p', { locale: zhCN }).replace('PM', '晚上').replace('AM', '早上')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="px-5 pb-1 grid grid-cols-4 gap-3">
          <div className="px-1 py-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">用时</span>
            <span className="text-sm font-semibold text-gray-800 font-mono">{formatTime(duration)}</span>
          </div>
          <div className="px-1 py-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">容量</span>
            <span className="text-sm font-semibold text-gray-800 font-mono">{volume.toLocaleString()}KG</span>
          </div>
          <div className="px-1 py-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">组数</span>
            <span className="text-sm font-semibold text-gray-800 font-mono">{totalSets}</span>
          </div>
          <div className="px-1 py-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">记录</span>
            <span className="text-sm font-semibold text-gray-800 font-mono inline-flex items-center">
              <span className="text-[13px] mr-1">🥇</span> {totalMedals}
            </span>
          </div>
        </div>

        {/* Hero Media */}
        {log.mediaItems && log.mediaItems.length > 0 ? (
          <div className="px-5 mb-1">
            <button 
              onClick={() => setFullscreenMedia(log.mediaItems![0])}
              className="w-full aspect-square bg-gray-100 rounded-3xl overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100 block transition-transform active:scale-[0.98]"
            >
               <CloudMedia 
                  src={log.mediaItems[0].url} 
                  type={log.mediaItems[0].type} 
                  className="w-full h-full object-cover" 
               />
            </button>
          </div>
        ) : (
          <div className="px-5 mb-1">
            <div className="w-full aspect-video bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
              <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">暂无训练封面</p>
            </div>
          </div>
        )}

        {/* Exercise List Section */}
        <div className="px-5 py-2 space-y-3">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">训练项目列表</h3>
          </div>

          {/* Muscle Distribution - Moved here */}
          <div className="bg-gray-50/30 rounded-3xl border border-gray-100/50 overflow-hidden">
            <div className="flex items-center justify-center space-x-12 py-2">
              <div className="flex flex-col items-center">
                <Body 
                  data={getMuscleData(log, allExercises)} 
                  side="front" 
                  scale={0.35} 
                  defaultStroke="#FFFFFF"
                  defaultStrokeWidth={1.5}
                />
                <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em] mt-3">正面</span>
              </div>
              <div className="flex flex-col items-center">
                <Body 
                  data={getMuscleData(log, allExercises)} 
                  side="back" 
                  scale={0.35} 
                  defaultStroke="#FFFFFF"
                  defaultStrokeWidth={1.5}
                />
                <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em] mt-3">背面</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {log.items.map((item) => {
              const exercise = getExercise(item.exerciseId);
              if (!exercise) return null;

              return (
                <div key={item.id} id={`exercise-${exercise.id}`} className="space-y-2 p-2 rounded-2xl transition-colors duration-500">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0 overflow-hidden">
                      {exercise.media ? (
                         <CloudMedia src={exercise.media} alt={exercise.name} className="w-full h-full object-cover" />
                      ) : (
                        <DumbbellIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 tracking-tight leading-tight uppercase">{exercise.name}</h4>
                    </div>
                  </div>

                  <div className="pl-2 space-y-1.5">
                    <div className="flex items-center space-x-10 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] pb-1">
                      <span className="w-8 text-center bg-gray-50 py-1 rounded-md">组数</span>
                      <span className="flex-1 text-left">{exercise.type.includes('time') ? '时长 / 持续时间' : '重量 / 次数'}</span>
                    </div>

                    <div className="pt-0.5">
                      {item.sets.filter(s => s.completed).map((set, sIdx) => {
                        const isMaxWeight = currentLogPRs[item.id]?.maxWeightSetId === set.id;
                        const isMax1RM = currentLogPRs[item.id]?.max1RMSetId === set.id;
                        const isBestSet = currentLogPRs[item.id]?.bestSetId === set.id;

                        const medals = [];
                        if (isMaxWeight) medals.push({ label: '重量' });
                        if (isMax1RM) medals.push({ label: '1RM' });
                        if (isBestSet) medals.push({ label: '最佳组' });

                        return (
                        <div key={set.id} className={`flex items-center space-x-10 relative group px-3 py-1.5 rounded-xl transition-colors ${sIdx % 2 !== 0 ? 'bg-gray-50/80' : ''}`}>
                          <span className="w-8 text-xs font-medium text-gray-500 text-center font-mono group-hover:text-blue-400 transition-colors">{sIdx + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-sm font-semibold text-gray-900 tracking-tight">
                                {exercise.type.includes('weight') ? (
                                  <>
                                    {set.weight}<span className="text-xs text-gray-400 font-bold ml-1 uppercase">公斤</span>
                                    <span className="mx-2 text-gray-400 font-medium">x</span>
                                    {set.reps}
                                  </>
                                ) : (
                                  <>
                                    {set.reps && <>{set.reps}<span className="text-xs text-gray-400 font-bold ml-1 uppercase">次</span></>}
                                    {set.time && (
                                      <>
                                        {Number(set.time) >= 60 ? (
                                          <>
                                            {Math.floor(Number(set.time) / 60)}
                                            <span className="text-xs text-gray-400 font-bold ml-0.5 uppercase">分</span>
                                            {Number(set.time) % 60 > 0 && (
                                              <>
                                                {Number(set.time) % 60}
                                                <span className="text-xs text-gray-400 font-bold ml-0.5 uppercase">秒</span>
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            {set.time}
                                            <span className="text-xs text-gray-400 font-bold ml-1 uppercase">秒</span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </span>
                            </div>
                            
                            {medals.length > 0 && (
                              <div className="flex items-center space-x-2.5 mt-1">
                                {medals.map(m => (
                                  <span key={m.label} className="inline-flex items-center text-[11px] font-bold text-gray-600 tracking-tight">
                                    <span className="mr-1 text-[13px] leading-none">🥇</span>
                                    {m.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setFullscreenMedia(null)}
        >
          <div className="w-full h-full p-4 flex items-center justify-center">
            <CloudMedia 
              src={fullscreenMedia.url} 
              type={fullscreenMedia.type} 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          <button 
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-10 right-6 p-2 text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-8 h-8 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}

function DumbbellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/>
    </svg>
  );
}

function ImageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  );
}