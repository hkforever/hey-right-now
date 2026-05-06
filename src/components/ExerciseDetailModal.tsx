import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, PlayCircle, ExternalLink, Video, Plus, Link as LinkIcon, AlertCircle, Loader2, Trophy, HelpCircle, ChevronRight, Info } from 'lucide-react';
import { Exercise, WorkoutLog, WorkoutSet } from '../types';
import { translateMuscle, translateEquipment, isVideo } from '../lib/utils';
import { useAppStore, useAppData } from '../store';
import { uploadFile, isCloudBaseConfigured } from '../lib/cloudbase';
import CloudMedia from './CloudMedia';
import Body from 'react-muscle-highlighter';
import { muscleMapping, allSlugs } from '../lib/muscle-utils';
import { evaluateStrengthLevel, getAgeAdjustment, LEVEL_NAMES, getStrengthThresholds } from '../lib/strengthStandards';

export default function ExerciseDetailModal({
  exercise,
  onClose,
  onNavigateToLog
}: {
  exercise: Exercise;
  onClose: () => void;
  onNavigateToLog?: (logId: string, exerciseId: string) => void;
}) {
  const { updateCustomExercise, addCustomExercise, history, userStats } = useAppStore();
  const { getExercise } = useAppData();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [showPRInfo, setShowPRInfo] = useState(false);
  const [showStrengthInfo, setShowStrengthInfo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // PR Calculations
  const prData = useMemo(() => {
    const exerciseHistory = history.filter(log => 
      log.items.some(item => {
        const itemExercise = getExercise(item.exerciseId);
        return itemExercise?.name === exercise.name && itemExercise?.equipment === exercise.equipment;
      })
    );

    let maxWeight = 0;
    let maxWeightLogId: string | null = null;
    let maxWeightExerciseId: string | null = null;
    let max1RM = 0;
    let max1RMLogId: string | null = null;
    let max1RMExerciseId: string | null = null;
    let bestSet: WorkoutSet | null = null;
    let bestSetLogId: string | null = null;
    let bestSetExerciseId: string | null = null;
    let bestSetLogDate = 0;
    let maxVolume = 0;
    let maxVolumeLogId: string | null = null;
    let maxVolumeExerciseId: string | null = null;
    let totalCompletedSets = 0;

    exerciseHistory.forEach(log => {
      const item = log.items.find(i => {
        const itemExercise = getExercise(i.exerciseId);
        return itemExercise?.name === exercise.name && itemExercise?.equipment === exercise.equipment;
      });
      if (!item) return;

      const logItemId = item.exerciseId;
      let logExerciseVolume = 0;
      item.sets.forEach(set => {
        if (!set.completed || !set.weight || !set.reps) return;
        totalCompletedSets++;
        
        const weight = set.weight;
        const reps = set.reps;
        
        // 1. Max Weight
        if (weight > maxWeight) {
          maxWeight = weight;
          maxWeightLogId = log.id;
          maxWeightExerciseId = logItemId;
        }
        
        // 2. Max 1RM (Brzycki)
        const oneRM = weight * (36 / (37 - Math.min(reps, 36)));
        if (oneRM > max1RM) {
          max1RM = oneRM;
          max1RMLogId = log.id;
          max1RMExerciseId = logItemId;
        }

        // 3. Best Set (Weight x Reps as primary indicator)
        const setVolume = weight * reps;
        const currentBestVolume = bestSet && bestSet.weight && bestSet.reps ? Number(bestSet.weight) * Number(bestSet.reps) : 0;
        if (!bestSet || setVolume > currentBestVolume) {
          bestSet = set;
          bestSetLogId = log.id;
          bestSetExerciseId = logItemId;
          bestSetLogDate = log.startTime;
        }

        // 4. Volume
        logExerciseVolume += weight * reps;
      });

      if (logExerciseVolume > maxVolume) {
        maxVolume = logExerciseVolume;
        maxVolumeLogId = log.id;
        maxVolumeExerciseId = logItemId;
      }
    });

    return {
      maxWeight, maxWeightLogId, maxWeightExerciseId,
      max1RM, max1RMLogId, max1RMExerciseId,
      bestSet, bestSetLogId, bestSetExerciseId,
      bestSetLogDate,
      maxVolume, maxVolumeLogId, maxVolumeExerciseId,
      hasHistory: totalCompletedSets > 0
    };
  }, [history, exercise, getExercise]);

  // Strength Level Logic based on Symmetric Strength standards
  const strengthLevel = useMemo(() => {
    if (!prData.hasHistory || !prData.max1RM) return null;
    
    // Fallback defaults if user hasn't set their stats
    const gender = userStats?.gender || 'male';
    const bodyweight = userStats?.bodyweight || (gender === 'male' ? 70 : 60);

    const result = evaluateStrengthLevel(prData.max1RM, bodyweight, gender, exercise.name, userStats?.age);
    
    if (!result) return null; // Not an exercise we track standards for
    return result;
  }, [prData, userStats, exercise.name]);

  const isYoutube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
  const isBilibili = (url: string) => url.includes('bilibili.com');

  const renderVideo = (url: string) => {
    if (isYoutube(url)) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return (
        <iframe
          className="w-full aspect-video rounded-2xl shadow-lg"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    if (isBilibili(url)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-2xl border border-blue-100">
           <PlayCircle className="w-12 h-12 text-blue-400 mb-4" />
           <p className="text-blue-900 font-bold text-center mb-4 text-sm">链接至 Bilibili 视频</p>
           <a 
             href={url} 
             target="_blank" 
             rel="noreferrer"
             className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow-md shadow-blue-500/20"
           >
             <ExternalLink className="w-4 h-4" /> 去看视频
           </a>
        </div>
      );
    }

    return (
      <CloudMedia 
        src={url} 
        type="video"
        controls 
        className="w-full aspect-video rounded-2xl shadow-lg bg-black"
      />
    );
  };

  const handleUpdate = async (updatedExercise: Exercise) => {
    setIsUpdating(true);
    try {
      if (updatedExercise.isCustom) {
        await updateCustomExercise(updatedExercise);
        alert('演示视频更新成功');
        onClose();
      } else {
        const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const cloned: Exercise = {
          ...updatedExercise,
          id: newId,
          isCustom: true
        };
        await addCustomExercise(cloned);
        alert('已成功将此标准动作创建为自定义动作并补充了视频。您可以在“我-运动项目”中找到它。');
        onClose();
      }
    } catch (e: any) {
      console.error('Update failed:', e);
      alert('添加失败: ' + (e.message || '未知错误'));
    } finally {
      setIsUpdating(false);
    }
  };

  const onAddLink = () => {
    if (!newLink.trim()) return;
    const updatedVideos = [...(exercise.videos || [])];
    if (exercise.videoUrl && !updatedVideos.find(v => v.url === exercise.videoUrl)) {
      updatedVideos.unshift({ url: exercise.videoUrl, title: '演示视频' });
    }
    updatedVideos.push({ url: newLink.trim(), title: `补充视频 ${updatedVideos.length + 1}` });
    
    handleUpdate({ ...exercise, videos: updatedVideos, videoUrl: undefined });
    setNewLink('');
    setShowAddForm(false);
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUpdating(true);
      try {
        let url: string;
        if (isCloudBaseConfigured) {
          const path = `exercises/videos/${Date.now()}_${file.name}`;
          url = await uploadFile(file, path);
        } else {
          // Fallback to local data URL if TCB is not configured
          const reader = new FileReader();
          url = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        const updatedVideos = [...(exercise.videos || [])];
        if (exercise.videoUrl && !updatedVideos.find(v => v.url === exercise.videoUrl)) {
          updatedVideos.unshift({ url: exercise.videoUrl, title: '演示视频' });
        }
        updatedVideos.push({ url, title: `上传视频 ${updatedVideos.length + 1}` });
        await handleUpdate({ ...exercise, videos: updatedVideos, videoUrl: undefined });
      } catch (err) {
        console.error('Video upload failed:', err);
        alert('文件处理或上传失败');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const allVideos = [...(exercise.videos || [])];
  if (exercise.videoUrl && !allVideos.find(v => v.url === exercise.videoUrl)) {
    allVideos.unshift({ url: exercise.videoUrl, title: '演示视频' });
  }

  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(false);

  useEffect(() => {
    if (!activeMuscle) return;
    const interval = setInterval(() => {
      setPulsePhase(p => !p);
    }, 400);
    return () => clearInterval(interval);
  }, [activeMuscle]);

  const getExerciseMuscleData = () => {
    return allSlugs.map(slug => {
      const isPrimaryActive = activeMuscle === exercise.primaryMuscle && muscleMapping[exercise.primaryMuscle] === slug;
      if (isPrimaryActive) {
        return { slug, color: pulsePhase ? '#F59E0B' : '#3B82F6', intensity: 100 } as any;
      }
      
      const secondaryActiveMatch = exercise.secondaryMuscles.find(m => activeMuscle === m && muscleMapping[m] === slug);
      if (secondaryActiveMatch) {
         return { slug, color: pulsePhase ? '#FCD34D' : '#93C5FD', intensity: 100 } as any;
      }

      // Primary muscle -> max intensity
      if (muscleMapping[exercise.primaryMuscle] === slug) {
        return { slug, color: '#3B82F6', intensity: 100 } as any; 
      }
      
      // Secondary muscles -> medium intensity
      if (exercise.secondaryMuscles.some(m => muscleMapping[m] === slug)) {
        return { slug, color: '#93C5FD', intensity: 50 } as any;
      }
      
      return { slug, color: '#E5E7EB' } as any;
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        <header className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {exercise.media && (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                <CloudMedia 
                  src={exercise.media} 
                  type={isVideo(exercise.media) ? 'video' : 'image'} 
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            )}
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">{exercise.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                  {translateEquipment(exercise.equipment)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {translateMuscle(exercise.primaryMuscle)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:text-gray-900 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">演示视频 ({allVideos.length})</h4>
              <div className="flex items-center space-x-2">
                 <button 
                   onClick={() => videoInputRef.current?.click()}
                   disabled={isUpdating}
                   className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                   title="上传视频"
                 >
                   {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                 </button>
                 <button 
                   onClick={() => setShowAddForm(!showAddForm)}
                   disabled={isUpdating}
                   className={`p-1.5 rounded-lg transition-colors ${showAddForm ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                   title="添加外链"
                 >
                   <LinkIcon className="w-4 h-4" />
                 </button>
               </div>
             </div>

             <input 
               type="file" 
               accept="video/*" 
               ref={videoInputRef} 
               onChange={onFileUpload} 
               className="hidden" 
             />

             {showAddForm && (
               <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                 <input 
                   type="text" 
                   value={newLink}
                   onChange={e => setNewLink(e.target.value)}
                   placeholder="填写视频链接..."
                   className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
                   onKeyDown={e => e.key === 'Enter' && onAddLink()}
                 />
                 <button 
                   onClick={onAddLink}
                   disabled={isUpdating}
                   className="px-4 bg-blue-500 text-white text-xs font-bold rounded-xl active:scale-95"
                 >
                   {isUpdating ? '...' : '添加'}
                 </button>
               </div>
             )}

             {allVideos.length === 0 ? (
               <div className="aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200">
                 <PlayCircle className="w-12 h-12 text-gray-300 mb-2" />
                 <span className="text-gray-400 text-sm font-medium">暂无演示视频</span>
                 <button 
                   onClick={() => setShowAddForm(true)}
                   className="mt-4 text-blue-500 text-xs font-bold hover:underline"
                 >
                   点击补充视频资料
                 </button>
               </div>
             ) : (
               <div className="space-y-6">
                 {allVideos.map((vid, idx) => (
                   <div key={idx} className="space-y-2">
                     {vid.title && (
                       <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                         <PlayCircle className="w-4 h-4 text-blue-500" />
                         {vid.title}
                       </span>
                     )}
                     {renderVideo(vid.url)}
                   </div>
                 ))}
               </div>
             )}

             {!exercise.isCustom && (
               <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                 <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                   补充视频会将此标准动作复制为您的自定义动作，以便保存修改。
                 </p>
               </div>
             )}
          </div>

          <div className="space-y-5 pt-2 pb-4">
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">训练肌肉</h4>
              <div className="flex flex-col gap-5 mt-2">
                {/* 1. 肌肉文字标签 */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setActiveMuscle(activeMuscle === exercise.primaryMuscle ? null : exercise.primaryMuscle)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${activeMuscle === exercise.primaryMuscle ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMuscle === exercise.primaryMuscle ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    {translateMuscle(exercise.primaryMuscle)} (主要)
                  </button>
                  {exercise.secondaryMuscles.map(m => (
                     <button 
                       key={m} 
                       onClick={() => setActiveMuscle(activeMuscle === m ? null : m)}
                       className={`px-3 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${activeMuscle === m ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50/50 text-blue-400 border-blue-100/50'}`}
                     >
                       <div className={`w-1.5 h-1.5 rounded-full ${activeMuscle === m ? 'bg-amber-400' : 'bg-blue-300'}`}></div>
                       {translateMuscle(m)}
                     </button>
                  ))}
                </div>

                {/* 2. 肌肉示意图放大 */}
                <div className="flex justify-center items-center space-x-4 sm:space-x-8 bg-gray-50 rounded-2xl py-6 border border-gray-100">
                  <div className="w-[100px] h-[150px] overflow-hidden flex items-center justify-center">
                    <Body 
                      data={getExerciseMuscleData()} 
                      side="front" 
                      scale={0.42} 
                      defaultStroke="#FFFFFF"
                      defaultStrokeWidth={1}
                    />
                  </div>
                  <div className="w-[100px] h-[150px] overflow-hidden flex items-center justify-center">
                    <Body 
                      data={getExerciseMuscleData()} 
                      side="back" 
                      scale={0.42} 
                      defaultStroke="#FFFFFF"
                      defaultStrokeWidth={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100/20 w-full" />

          {/* Personal Record Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">个人记录</h4>
              </div>
              <button 
                onClick={() => setShowPRInfo(true)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-0.5">
              {[
                { label: '最重的重量', value: `${prData.maxWeight.toLocaleString()}kg`, logId: prData.maxWeightLogId, exId: prData.maxWeightExerciseId },
                { label: '最佳 1RM', value: `${prData.max1RM.toFixed(2)}kg`, logId: prData.max1RMLogId, exId: prData.max1RMExerciseId },
                { 
                  label: '最佳组数', 
                  value: prData.bestSet ? `${prData.bestSet.weight}kg x ${prData.bestSet.reps}` : '-',
                  logId: prData.bestSetLogId,
                  exId: prData.bestSetExerciseId 
                },
                { label: '最佳训练量', value: `${prData.maxVolume.toLocaleString()}kg`, logId: prData.maxVolumeLogId, exId: prData.maxVolumeExerciseId }
              ].map((row, i) => (
                <button 
                  key={i} 
                  disabled={!row.logId || !onNavigateToLog}
                  onClick={() => row.logId && row.exId && onNavigateToLog?.(row.logId, row.exId)}
                  className="w-full flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-xl transition-colors group disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="text-sm font-medium text-gray-600">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-blue-500 font-mono tracking-tight">{row.value}</span>
                    {row.logId && onNavigateToLog && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 transition-colors" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Strength Level Section */}
          {strengthLevel && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">力量水平评估</h4>
                </div>
                <button onClick={() => setShowStrengthInfo(true)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">最佳 1RM</span>
                  <span className="text-lg font-black text-gray-900 font-mono tracking-tighter">{prData.max1RM.toFixed(1)}kg</span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">当前水平</span>
                  <span className="text-lg font-black text-blue-500 tracking-tight">{strengthLevel.currentLevel}</span>
                </div>
              </div>

              <div className="space-y-3 px-1">
                {/* Level Progress Bar */}
                <div className="h-1.5 w-full bg-gray-100 rounded-full flex overflow-hidden">
                  <div className={`h-full ${strengthLevel.levelIndex >= 0 && !strengthLevel.isBelowNovice ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ width: '25%' }}></div>
                  <div className={`h-full ${strengthLevel.levelIndex >= 1 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ width: '25%' }}></div>
                  <div className={`h-full ${strengthLevel.levelIndex >= 2 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ width: '25%' }}></div>
                  <div className={`h-full ${strengthLevel.levelIndex >= 3 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ width: '25%' }}></div>
                </div>
                <div className="flex justify-between px-0.5">
                  {['新手', '中级', '高级', '精英'].map(l => (
                    <span key={l} className={`text-[10px] font-black ${strengthLevel.currentLevel === l ? 'text-blue-500' : 'text-gray-300'}`}>{l}</span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 text-center pt-1 font-medium leading-relaxed">
                  {strengthLevel.isBelowNovice ? (
                    <>您需要更多训练才能达到<span className="text-blue-500 font-black">新手</span>水平</>
                  ) : (
                    <>您比 <span className="text-blue-500 font-black">{strengthLevel.percent}%</span> 的同龄、同体重的健身者力量更强</>
                  )}
                  {strengthLevel.nextLevelWeight && strengthLevel.nextLevelName && (() => {
                    const bestReps = Math.min(Number(prData.bestSet?.reps || 1), 36);
                    const targetWeight = strengthLevel.nextLevelWeight! * (37 - bestReps) / 36;
                    return (
                      <>
                        ，按照您做 <span className="text-gray-700 font-black">{bestReps}</span> 次的习惯，重量达到 <span className="text-gray-700 font-black font-mono">{targetWeight.toFixed(1)}kg</span> 即可突破至<span className="text-gray-700 font-black">{strengthLevel.nextLevelName}</span>水平。
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          )}
        </main>
        
        <footer className="p-6 pt-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-xl shadow-gray-900/20"
          >
            返回
          </button>
        </footer>
        <div className="h-4 sm:hidden" />
      </div>

      {/* PR Info Modal */}
      {showPRInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-8">
              <div className="space-y-6 text-center">
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">最重的重量</h5>
                  <p className="text-sm text-gray-500 font-medium">您举起过的最重的重量。</p>
                </div>
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">最佳 1RM</h5>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    1RM（单次练习最大重量）使用一组动作的次数和重量来估算出您单次练习可以举起的最高重量。这是您自有记录以来达到的最高1RM。
                  </p>
                </div>
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">最佳组数</h5>
                  <p className="text-sm text-gray-500 font-medium">您举起力量最大的一组（重量 x 次数）</p>
                </div>
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">最佳训练量</h5>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    最大训练量是指在这一项训练中，您在所有组中举起的最大重量。
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPRInfo(false)}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
              >
                好的
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Strength Info Modal */}
      {showStrengthInfo && strengthLevel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-8">
              <div className="space-y-6 text-center">
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">力量水平评估</h5>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    我们基于 Symmetric Strength 的力量标准体系，综合您的性别、年龄（当前系数：<span className="font-mono text-blue-500">{(userStats?.age ? getAgeAdjustment(userStats.age) : 1).toFixed(2)}</span>）、体重（<span className="font-mono text-blue-500">{userStats?.bodyweight || (userStats?.gender === 'female' ? 60 : 70)}</span>kg）以及最佳 1RM 来动态评估您的力量水平。
                  </p>
                </div>
                <div>
                  <h5 className="text-base font-bold text-gray-900 mb-1">各级别目标 ({prData.bestSet?.reps || 1}次重量)</h5>
                  <div className="space-y-2 mt-3 text-sm text-gray-500 font-medium">
                    {(() => {
                      const gender = userStats?.gender || 'male';
                      const bodyweight = userStats?.bodyweight || (gender === 'male' ? 70 : 60);
                      const thresholds = getStrengthThresholds(bodyweight, gender, exercise.name, userStats?.age);
                      const bestReps = Math.min(Number(prData.bestSet?.reps || 1), 36);
                      if (!thresholds) return null;
                      return LEVEL_NAMES.map((name, index) => {
                        const targetWeight = thresholds[index] * (37 - bestReps) / 36;
                        return (
                          <div key={name} className={`flex justify-between items-center rounded-xl px-4 py-2 ${strengthLevel.currentLevel === name ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'bg-gray-50'}`}>
                            <span className={`${strengthLevel.currentLevel === name ? 'font-black' : 'font-bold text-gray-700'}`}>{name}</span>
                            <span className={`font-mono tracking-tighter flex items-baseline gap-1 ${strengthLevel.currentLevel === name ? 'font-black text-blue-600' : ''}`}>
                              {targetWeight.toFixed(1)}kg <span className={`text-[10px] ${strengthLevel.currentLevel === name ? 'text-blue-400' : 'text-gray-400'}`}>x {bestReps}</span>
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                    注：评估算法会将您的动作 1RM 成绩与全球数百万健身爱好者的统计数据分布进行对比。
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowStrengthInfo(false)}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
              >
                好的
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

