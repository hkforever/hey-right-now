import { useState, useEffect } from 'react';
import { useAppStore, useAppData } from '../store';
import { ExerciseType, WorkoutLog, WorkoutSet, MediaItem } from '../types';
import { ChevronDown, Check, Plus, Clock, Trash2, Play, Pause, Activity } from 'lucide-react';
import ExerciseSelector from './ExerciseSelector';
import CloudMedia from './CloudMedia';
import RestTimerModal from './RestTimerModal';
import ExerciseTypeModal, { getExerciseTypeLabel } from './ExerciseTypeModal';
import DurationPickerModal from './DurationPickerModal';
import WorkoutSummaryModal from './WorkoutSummaryModal';
import WorkoutCelebrationModal from './WorkoutCelebrationModal';
import MuscleDistributionModal from './MuscleDistributionModal';
import ExerciseDetailModal from './ExerciseDetailModal';
import RPEPickerModal from './RPEPickerModal';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import Body from 'react-muscle-highlighter';
import { getMuscleData } from '../lib/muscle-utils';
import { calculateVolume, formatTime, formatRestTime, translateMuscle, translateEquipment, calculateExercisePRs } from '../lib/utils';
import { cn } from '../lib/utils';

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    const t = 0.08; // fast, energetic tempo

    // Victory fanfare (G4 - C5 - E5 - G5/C6)
    playTone(392.00, 'triangle', 0, 0.15, 0.4); 
    playTone(523.25, 'triangle', t, 0.15, 0.4);
    playTone(659.25, 'triangle', t * 2, 0.15, 0.4);

    // Final resonant "achievement" chord
    playTone(783.99, 'square', t * 3, 0.6, 0.1);   // G5 bright
    playTone(783.99, 'triangle', t * 3, 0.6, 0.4); // G5 base
    playTone(1046.50, 'sine', t * 3, 0.8, 0.3);    // C6 sparkle
  } catch (e) {
    console.error("Audio error", e);
  }
};

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

import { voicePrompts } from '../lib/voicePrompts';

let globalAudioCtx: AudioContext | null = null;
export const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
};

let globalAudioEl: HTMLAudioElement | null = null;
export const getAudioEl = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioEl) {
    globalAudioEl = new Audio();
  }
  return globalAudioEl;
};

export default function WorkoutMode() {
  const { 
    user, 
    history, 
    activeWorkout, 
    isWorkoutMinimized, 
    setIsWorkoutMinimized, 
    updateActiveWorkout, 
    endActiveWorkout, 
    cancelActiveWorkout,
    setPreviewLogId,
    setPreviewExerciseId
  } = useAppStore();
  const { allExercises, getExercise, getLastWorkoutItemForExercise } = useAppData();
  
  const [duration, setDuration] = useState(0);
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [activeRestTimerId, setActiveRestTimerId] = useState<string | null>(null);
  const [activeExerciseTypePickerId, setActiveExerciseTypePickerId] = useState<string | null>(null);
  const [activeDurationPicker, setActiveDurationPicker] = useState<{ itemId: string, setId: string, key: 'time' | 'weight' | 'reps' | 'distance' } | null>(null);
  const [swipedSetId, setSwipedSetId] = useState<string | null>(null);
  const [activeRPEPicker, setActiveRPEPicker] = useState<{ itemId: string, setId: string, value: string, setNum: number, reps: string | number, exerciseName: string } | null>(null);
  const [restTimer, setRestTimer] = useState<{ active: boolean, seconds: number, defaultSeconds: number }>({ active: false, seconds: 0, defaultSeconds: 60 });
  const [activeExerciseTimer, setActiveExerciseTimer] = useState<{ itemId: string, setId: string, key: 'time' } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMuscleDistribution, setShowMuscleDistribution] = useState(false);
  const [showingExerciseDetail, setShowingExerciseDetail] = useState<any>(null);
  const [finishedWorkout, setFinishedWorkout] = useState<any>(null);

  const [toastQueue, setToastQueue] = useState<{ id: string, title: string, subtitle: string, media?: string }[]>([]);
  const [achievementToast, setAchievementToast] = useState<{ id: string, title: string, subtitle: string, media?: string } | null>(null);

  useEffect(() => {
    if (!achievementToast && toastQueue.length > 0) {
      setAchievementToast(toastQueue[0]);
      
      playSuccessSound();
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.1, x: 0.5 },
        colors: ['#FBBF24', '#F59E0B', '#FDE68A', '#34D399', '#60A5FA'],
        zIndex: 9999,
        disableForReducedMotion: true
      });
      
    } else if (achievementToast) {
      const timer = setTimeout(() => {
        setAchievementToast(null);
        setToastQueue(q => q.slice(1));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [achievementToast, toastQueue]);

  const handleNavigateToLog = (logId: string, exerciseId: string) => {
    setPreviewLogId(logId);
    setPreviewExerciseId(exerciseId);
    setShowingExerciseDetail(null);
  };

  const totalSets = activeWorkout?.items.reduce((acc, item) => acc + item.sets.length, 0) || 0;
  const completedSets = activeWorkout?.items.reduce((acc, item) => acc + item.sets.filter(s => s.completed).length, 0) || 0;
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  useEffect(() => {
    let hasUnlocked = false;
    const unlock = () => {
      if (hasUnlocked) return;
      hasUnlocked = true;
      
      // Unlock Web Audio API
      try {
        const audioCtx = getAudioCtx();
        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(0);
          osc.stop(0.01);
        }

        // Unlock HTMLAudioElement
        const audioEl = getAudioEl();
        if (audioEl) {
          audioEl.volume = 0;
          audioEl.src = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
          audioEl.play().catch(() => {});
        }
      } catch(e) {
        console.warn('Audio unlock failed:', e);
      }
    };

    // Listen for earliest user interactions to safely unlock audio contexts
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Exercise stopwatch timer effect (Count-up)
  useEffect(() => {
    if (activeExerciseTimer && activeWorkout) {
      const interval = setInterval(() => {
        const item = activeWorkout.items.find(i => i.id === activeExerciseTimer.itemId);
        const set = item?.sets.find(s => s.id === activeExerciseTimer.setId);
        const currentTime = Number(set?.[activeExerciseTimer.key] || 0);

        updateSet(activeExerciseTimer.itemId, activeExerciseTimer.setId, activeExerciseTimer.key, currentTime + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeExerciseTimer, activeWorkout]);

  useEffect(() => {
    if (restTimer.active && restTimer.seconds > 0) {
      const interval = setInterval(() => {
        setRestTimer(prev => ({ ...prev, seconds: prev.seconds - 1 }));
      }, 1000);
      return () => clearInterval(interval);
    } else if (restTimer.active && restTimer.seconds <= 0) {
      // Trigger Strong Vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 800]); // Strong boxing bell vibrate pattern
      }
      
      // Play a boxing bell sound using AudioContext
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          
          const playDing = (startTime: number) => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const osc3 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            // Metallic gong/bell overtones
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(850, startTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1050, startTime);
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(1600, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 2.0);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            osc3.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc1.start(startTime);
            osc2.start(startTime);
            osc3.start(startTime);
            osc1.stop(startTime + 2.0);
            osc2.stop(startTime + 2.0);
            osc3.stop(startTime + 2.0);
          };
          
          const t = audioCtx.currentTime;
          playDing(t);          // First ding
          playDing(t + 0.35);   // Second ding
        }
      } catch (e) {
        console.warn('Audio feedback failed:', e);
      }

      // Voice prompt using pre-generated Audio files via AudioContext (avoids pausing Spotify on mobile)
      try {
        const url = voicePrompts[Math.floor(Math.random() * voicePrompts.length)];
        const ctx = getAudioCtx();
        if (ctx) {
          fetch(url)
            .then(res => res.arrayBuffer())
            .then(arr => ctx.decodeAudioData(arr))
            .then(buf => {
              const source = ctx.createBufferSource();
              source.buffer = buf;
              source.connect(ctx.destination);
              // Play voice shortly after the boxing bell begins
              source.start(ctx.currentTime + 0.4);
            })
            .catch(e => console.warn('Failed to decode TTS audio:', e));
        }
      } catch (e) {
        console.warn('TTS playback failed:', e);
      }

      setRestTimer(prev => ({ ...prev, active: false }));
    }
  }, [restTimer]);

  if (!activeWorkout && !showCelebration) return null;
  if (isWorkoutMinimized) return null;

  const handleFinish = () => {
    setShowSummary(true);
  };

  const handleSaveSummary = (summary: { title: string, notes: string, mediaItems: MediaItem[] }) => {
    setFinishedWorkout({ ...activeWorkout, ...summary });
    endActiveWorkout(summary);
    setShowSummary(false);
    setShowCelebration(true);
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleDiscardFromSummary = () => {
    setShowCancelConfirm(true);
  };

  const handleAddExercises = (exerciseIds: string[]) => {
    const newItems = exerciseIds.map(eId => {
      const prev = getLastWorkoutItemForExercise(eId);
      return {
        id: crypto.randomUUID(),
        exerciseId: eId,
        notes: '',
        restTime: prev?.restTime ?? 0,
        sets: (prev?.sets || []).map(s => ({
            id: crypto.randomUUID(),
            setType: s.setType,
            completed: false,
            weight: s.weight,
            reps: s.reps,
            time: s.time,
            distance: s.distance
          })) || [{ id: crypto.randomUUID(), setType: 'normal' as const, completed: false }]
      };
    });
    updateActiveWorkout({ ...activeWorkout, items: [...activeWorkout.items, ...newItems] });
    setIsSelectingExercise(false);
  };

  const changeItemType = (itemId: string, newType: ExerciseType) => {
    const newItems = activeWorkout.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          type: newType,
          sets: item.sets.map(s => {
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
    });
    updateActiveWorkout({ ...activeWorkout, items: newItems });
  };

  const addSet = (itemId: string) => {
    const newItems = activeWorkout.items.map(item => {
      if (item.id === itemId) {
        const lastSet = item.sets[item.sets.length - 1];
        return {
          ...item,
          sets: [...item.sets, { 
            id: crypto.randomUUID(), 
            setType: 'normal' as const, 
            completed: false, 
            weight: lastSet?.weight, 
            reps: lastSet?.reps,
            time: lastSet?.time,
            distance: lastSet?.distance
          }]
        };
      }
      return item;
    });
    updateActiveWorkout({ ...activeWorkout, items: newItems });
  };

  const deleteSet = (itemId: string, setId: string) => {
    const newItems = activeWorkout.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          sets: item.sets.filter(s => s.id !== setId)
        };
      }
      return item;
    });
    updateActiveWorkout({ ...activeWorkout, items: newItems });
  };

  const updateSet = (itemId: string, setId: string, field: keyof WorkoutSet, value: any) => {
    let triggeredAchievements: { id: string, title: string, subtitle: string, media?: string }[] = [];
    
    const newItems = activeWorkout.items.map(item => {
      if (item.id === itemId) {
        let triggeringRest = false;
        const targetSetIndex = item.sets.findIndex(s => s.id === setId);
        const targetSet = item.sets[targetSetIndex];
        const isDataField = ['weight', 'reps', 'time', 'distance'].includes(field as string);
        const shouldPropagate = targetSet && !targetSet.completed && isDataField;

        const newSets = (item.sets || []).map((set, idx) => {
          if (idx === targetSetIndex) {
            const completed = field === 'completed' ? value : set.completed;
            const wasCompleted = set.completed;
            triggeringRest = field === 'completed' && value === true && !wasCompleted;
            
            let achievements: string[] | undefined = set.achievements;
            
            if (field === 'completed' && value === true && !wasCompleted) {
              const updatedSet = { ...set, completed: true };
              
              const weight = Number(updatedSet.weight) || 0;
              const reps = Number(updatedSet.reps) || 0;
              
              if (weight > 0 && reps > 0) {
                const PRs = calculateExercisePRs(history, item.exerciseId);
                const setVol = weight * reps;
                achievements = [];
                const ex = getExercise(item.exerciseId);
                
                let currMaxWeight = PRs.maxWeight;
                let currMaxSetVol = PRs.maxSetVolume;
                let currMax1RM = PRs.max1RM;
                
                activeWorkout.items.forEach(currItem => {
                   if (currItem.exerciseId === item.exerciseId) {
                      currItem.sets.forEach(currSet => {
                         if (currSet.completed && currSet.id !== setId) {
                            const cw = Number(currSet.weight) || 0;
                            const cr = Number(currSet.reps) || 0;
                            const co = cw * (36 / (37 - Math.min(cr, 36)));
                            if (cw > currMaxWeight) currMaxWeight = cw;
                            if (cw * cr > currMaxSetVol) currMaxSetVol = cw * cr;
                            if (co > currMax1RM) currMax1RM = co;
                         }
                      });
                   }
                });

                const currentOneRM = weight * (36 / (37 - Math.min(reps, 36)));

                if (weight > currMaxWeight) {
                   achievements.push('max_weight');
                   triggeredAchievements.push({ 
                     id: crypto.randomUUID(), 
                     title: ex?.name || '', 
                     subtitle: `最大重量 - ${weight} 公斤`,
                     media: ex?.media
                   });
                }
                
                if (currentOneRM > currMax1RM) {
                   achievements.push('max_1rm');
                   triggeredAchievements.push({ 
                     id: crypto.randomUUID(), 
                     title: ex?.name || '', 
                     subtitle: `最佳 1RM - ${currentOneRM.toFixed(1)} 公斤`,
                     media: ex?.media
                   });
                }

                if (setVol > currMaxSetVol) {
                   achievements.push('max_set_volume');
                   triggeredAchievements.push({ 
                     id: crypto.randomUUID(), 
                     title: ex?.name || '', 
                     subtitle: `最佳组数 - ${setVol} 公斤`,
                     media: ex?.media
                   });
                }
              }
            }

            return { ...set, [field]: value, completed, achievements };
          } else if (shouldPropagate && idx > targetSetIndex && !set.completed) {
            return { ...set, [field]: value };
          }
          return set;
        });
        if (triggeringRest && item.restTime && item.restTime > 0) {
          setRestTimer({ active: true, seconds: item.restTime, defaultSeconds: item.restTime });
        }
        return { ...item, sets: newSets };
      }
      return item;
    });
    
    if (triggeredAchievements.length > 0) {
      setToastQueue(q => [...q, ...triggeredAchievements]);
    }
    
    updateActiveWorkout({ ...activeWorkout, items: newItems });
  };

  const totalVolume = activeWorkout ? calculateVolume(activeWorkout.items) : 0;

  const renderItem = (item: any, idx: number) => {
    const ex = getExercise(item.exerciseId);
    const prevItem = getLastWorkoutItemForExercise(item.exerciseId);
    const cols = getTypeColumns(item.type || ex?.type);

    return (
      <div key={item.id} className="pt-2 bg-white mb-2 shadow-sm border-y border-gray-50">
        <div className="flex justify-between items-center font-medium px-4 mb-2 mt-4 relative">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shrink-0 shadow-inner">
              {ex?.media ? (
                <CloudMedia src={ex.media} alt={ex.name} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-400"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
              )}
            </div>
            <div className="flex flex-col">
              <span 
                onClick={() => ex && setShowingExerciseDetail(ex)}
                className="text-gray-900 text-lg font-bold cursor-pointer hover:text-blue-500 transition-colors"
              >
                {ex?.name || '未知动作'}
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">{translateEquipment(ex?.equipment || '')} • {translateMuscle(ex?.primaryMuscle || '')}</span>
            </div>
          </div>
          <div className="flex flex-col space-y-1 p-2">
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
        
        {ex?.instructions && (
          <div className="text-[11px] text-gray-500 px-4 ml-[60px] mb-3 leading-relaxed pr-4">
            {ex.instructions}
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 px-4 ml-[60px] mb-4 pr-4">
          <div 
            onClick={() => setActiveRestTimerId(item.id)}
            className="flex items-center text-blue-500 text-[10px] font-bold tracking-wider bg-blue-50 rounded-full py-1 px-3 w-fit cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Clock className="w-3 h-3 mr-1" />
            <span>休息: {formatRestTime(item.restTime || 0)}</span>
          </div>
          <div 
            onClick={() => setActiveExerciseTypePickerId(item.id)}
            className="flex items-center text-blue-500 text-[10px] font-bold tracking-wider bg-blue-50 rounded-full py-1 px-3 w-fit cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Activity className="w-3 h-3 mr-1" />
            <span>类型: {getExerciseTypeLabel(item.type || ex?.type)}</span>
          </div>
        </div>
        
        <div className="space-y-0 relative">
          <div className="grid grid-cols-12 gap-0.5 px-4 mb-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider pb-1">
             <div className="col-span-1 text-center">组</div>
             <div className="col-span-2 text-center">之前</div>
             {cols.col1 && cols.col2 ? (
               <>
                 <div className="col-span-3 text-center">{cols.col1.label}</div>
                 <div className="col-span-3 text-center">{cols.col2.label}</div>
               </>
             ) : (
               <div className="col-span-6 text-center">{cols.col1?.label || cols.col2?.label}</div>
             )}
             <div className="col-span-2 text-center">强度</div>
             <div className="col-span-1 flex justify-center"><Check className="w-3 h-3" /></div>
          </div>
          
          {(item.sets || []).map((set: WorkoutSet, setIdx: number) => {
            const prevSet = prevItem?.sets[setIdx];
            const pCol1 = cols.col1 ? prevSet?.[cols.col1.key] : null;
            const pCol2 = cols.col2 ? prevSet?.[cols.col2.key] : null;
            
            const formatVal = (val: any, key: string) => {
              if (!val) return null;
              return key === 'time' ? formatTime(Number(val)) : val;
            };

            const fPCol1 = formatVal(pCol1, cols.col1?.key || '');
            const fPCol2 = formatVal(pCol2, cols.col2?.key || '');

            let prevText = '-';
            if (fPCol1 && fPCol2) prevText = `${fPCol1}×${fPCol2}`;
            else if (fPCol1) prevText = `${fPCol1}`;
            else if (fPCol2) prevText = `${fPCol2}`;

            const placeholder1 = fPCol1 || "-";
            const placeholder2 = fPCol2 || "-";

            const renderInput = (col: any, placeholder: string, span: string) => {
               if (!col) return null;
               return (
                 <div className={cn(span, "px-1 flex justify-center items-center")}>
                    {col.key === 'time' ? (
                      <div className="flex items-center space-x-1 h-8 w-full max-w-[80px]">
                        {!set.completed ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeExerciseTimer?.setId === set.id && activeExerciseTimer.key === 'time') {
                                setActiveExerciseTimer(null);
                              } else {
                                updateSet(item.id, set.id, 'time', 0);
                                setActiveExerciseTimer({ itemId: item.id, setId: set.id, key: 'time' });
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100 text-blue-500 shrink-0 active:scale-90 transition-transform"
                          >
                            {activeExerciseTimer?.setId === set.id && activeExerciseTimer.key === 'time' 
                              ? <Pause className="w-2.5 h-2.5 fill-current" /> 
                              : <Play className="w-2.5 h-2.5 fill-current ml-0.5" />}
                          </button>
                        ) : (
                          <div className="w-6 shrink-0" /> 
                        )}
                        <button
                          onClick={() => !set.completed && setActiveDurationPicker({ itemId: item.id, setId: set.id, key: col.key })}
                          className={cn(
                            "flex-1 h-8 text-center rounded text-[13px] font-bold font-mono transition-all flex items-center justify-center border border-transparent min-w-0 outline-none",
                            "text-gray-900",
                            activeExerciseTimer?.setId === set.id && activeExerciseTimer.key === 'time' && "text-blue-600 animate-pulse bg-blue-50/50"
                          )}
                        >
                          <span className="truncate">{set[col.key] ? formatTime(Number(set[col.key])) : (placeholder !== '-' ? placeholder : '-')}</span>
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="number"
                        inputMode="decimal"
                        placeholder={placeholder}
                        value={set[col.key] || ''}
                        onChange={(e) => updateSet(item.id, set.id, col.key, e.target.value)}
                        className={cn(
                          "w-full h-8 text-center bg-transparent border-none outline-none font-bold font-mono text-[13px] transition-all",
                          "text-gray-900 placeholder-gray-300"
                        )} 
                      />
                    )}
                 </div>
               );
            };

            const isEven = setIdx % 2 !== 0;
            const bgColor = set.completed ? "bg-[#C4F1BE]" : (isEven ? "bg-gray-50" : "bg-white");

            return (
              <div key={set.id} className={cn("relative group overflow-hidden h-[57px]", bgColor)}>
                {/* Swipe Background Delete Action */}
                <div 
                  onClick={() => deleteSet(item.id, set.id)}
                  className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex justify-center items-center cursor-pointer"
                >
                   <Trash2 className="w-5 h-5 text-white" />
                </div>

                <motion.div 
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: -80, right: 0 }}
                  dragElastic={0.2}
                  dragMomentum={false}
                  animate={{ 
                    x: swipedSetId === set.id ? -80 : 0
                  }}
                  transition={{ 
                    x: { type: 'spring', damping: 25, stiffness: 400 }
                  }}
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
                    "grid grid-cols-12 gap-0.5 items-center py-2 px-4 relative z-10 w-full h-full touch-pan-y transition-colors duration-300",
                    bgColor
                  )}
                >
                  <motion.div 
                    className="col-span-12 grid grid-cols-12 gap-0.5 items-center w-full"
                    animate={{ scale: set.completed ? [1, 0.98, 1.01, 1] : 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="col-span-1 flex justify-center">
                    {set.completed && set.achievements && set.achievements.length > 0 ? (
                      <span className="text-xl leading-none">🥇</span>
                    ) : (
                      <span className={cn(
                        "font-bold font-mono text-sm py-0.5 px-1.5 rounded-md", 
                        "text-gray-900"
                      )}>{setIdx + 1}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-gray-300 text-[10px] font-mono leading-tight flex flex-col justify-center truncate px-0.5">
                    {prevText !== '-' ? prevText : '-'}
                  </div>
                  
                  {cols.col1 && cols.col2 ? (
                    <>
                      {renderInput(cols.col1, placeholder1, "col-span-3")}
                      {renderInput(cols.col2, placeholder2, "col-span-3")}
                    </>
                  ) : cols.col1 ? (
                    renderInput(cols.col1, placeholder1, "col-span-6")
                  ) : cols.col2 ? (
                    renderInput(cols.col2, placeholder2, "col-span-6")
                  ) : null}

                  <div className="col-span-2 px-1">
                    <button 
                      onClick={() => {
                        setActiveRPEPicker({
                          itemId: item.id,
                          setId: set.id,
                          value: String(set.rpe || ''),
                          setNum: setIdx + 1,
                          reps: set.reps || 0,
                          exerciseName: ex?.name || ''
                        });
                      }}
                      className={cn(
                        "w-full h-8 rounded-md font-bold text-[10px] tracking-tighter uppercase transition-all flex items-center justify-center",
                        set.completed ? "bg-gray-50 text-gray-500" : (set.rpe ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400")
                      )}
                    >
                      {set.rpe ? set.rpe : '强度'}
                    </button>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <motion.button 
                      onClick={() => {
                        let v1 = cols.col1 ? set[cols.col1.key] : null;
                        let v2 = cols.col2 ? set[cols.col2.key] : null;
                        
                        if (!set.completed) {
                          if (!v1 && cols.col1 && prevSet && prevSet[cols.col1.key]) v1 = prevSet[cols.col1.key];
                          if (!v2 && cols.col2 && prevSet && prevSet[cols.col2.key]) v2 = prevSet[cols.col2.key];
                          
                          if (cols.col1 && v1 !== set[cols.col1.key]) updateSet(item.id, set.id, cols.col1.key, v1);
                          if (cols.col2 && v2 !== set[cols.col2.key]) updateSet(item.id, set.id, cols.col2.key, v2);
                        }

                        // Stop timer if marking as completed
                        if (!set.completed && activeExerciseTimer?.setId === set.id) {
                          setActiveExerciseTimer(null);
                        }

                        updateSet(item.id, set.id, 'completed', !set.completed);
                      }}
                      whileTap={{ scale: 0.8 }}
                      animate={set.completed ? { scale: [1, 0.8, 1.25, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 border-none",
                        set.completed ? "bg-green-500 text-white shadow-sm shadow-green-500/20" : "bg-gray-100 text-gray-300"
                      )}
                    >
                      <Check className={cn("w-4 h-4", set.completed ? "stroke-[4px]" : "stroke-[3px]")} />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            );
          })}
          
          {activeWorkout && (
            <div className="px-4 py-3 bg-white">
              <button onClick={() => addSet(item.id)} className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold tracking-tight rounded-xl text-sm transition-colors border border-gray-100">
                + 添加组
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col will-change-transform overflow-hidden font-sans">
      <header className="h-14 border-b border-gray-200 px-4 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
        <button onClick={() => setIsWorkoutMinimized(true)} className="text-gray-700 p-1">
          <ChevronDown className="w-6 h-6" />
        </button>
        <span className="font-bold text-base text-gray-900 tracking-tight">记录锻炼情况</span>
        <div className="flex items-center space-x-3">
           <button onClick={handleFinish} className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-transform">
            完成
          </button>
        </div>
      </header>

      <AnimatePresence>
        {achievementToast && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 16, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-14 left-4 right-4 z-50 pointer-events-none flex justify-center"
          >
            <div className="bg-white rounded-full shadow-lg border border-gray-100 flex items-center px-4 py-2 pointer-events-auto min-w-[280px]">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0 mr-4 shadow-inner">
                {achievementToast.media ? (
                  <CloudMedia src={achievementToast.media} alt={achievementToast.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">💪</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 text-base leading-tight tracking-tight">{achievementToast.title}</span>
                <span className="text-yellow-500 font-bold text-[15px] pt-1">{achievementToast.subtitle}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="h-0.5 w-full bg-gray-100 shrink-0 overflow-hidden relative z-20">
        <motion.div 
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      <div className="grid grid-cols-4 bg-white border-b border-gray-100 shrink-0 py-5 shadow-sm relative z-10">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-widest text-gray-400 uppercase mb-1">时长</span>
          <span className="text-lg font-bold font-mono text-blue-500 tracking-tight">{formatTime(duration)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-widest text-gray-400 uppercase mb-1">运动量</span>
          <div className="flex items-baseline space-x-0.5">
            <span className="text-lg font-bold font-mono text-gray-900 tracking-tight">{totalVolume.toLocaleString()}</span>
            <span className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter">KG</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-medium tracking-widest text-gray-400 uppercase mb-1">组数</span>
          <span className="text-lg font-bold font-mono text-gray-900 tracking-tight">{completedSets}</span>
        </div>
        <div className="flex items-center justify-center">
          <button 
            onClick={() => setShowMuscleDistribution(true)}
            className="flex space-x-1 opacity-90 hover:opacity-100 transition-opacity active:scale-95"
            title="查看肌肉分布"
          >
            <div className="w-[36px] h-[54px] overflow-hidden flex items-center justify-center">
              <Body 
                data={getMuscleData(activeWorkout, allExercises)} 
                side="front" 
                scale={0.16} 
                defaultStroke="#FFFFFF"
                defaultStrokeWidth={1}
              />
            </div>
            <div className="w-[36px] h-[54px] overflow-hidden flex items-center justify-center">
              <Body 
                data={getMuscleData(activeWorkout, allExercises)} 
                side="back" 
                scale={0.16} 
                defaultStroke="#FFFFFF"
                defaultStrokeWidth={1}
              />
            </div>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-44 bg-gray-50 relative">
        <div className="space-y-4 pt-2">
          {/* Uncategorized Section */}
          {activeWorkout?.items.filter(i => !i.sectionId).map((item, idx) => renderItem(item, idx))}

          {/* Categorized Sections */}
          {activeWorkout?.sections?.map((section) => (
            <div key={section.id} className="space-y-2">
               <div className="px-4 py-2 bg-gray-100/50 backdrop-blur-sm border-y border-gray-200/50 sticky top-0 z-10">
                 <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">{section.title}</h2>
               </div>
               <div className="space-y-4">
                 {activeWorkout.items.filter(i => i.sectionId === section.id).map((item, idx) => renderItem(item, idx))}
               </div>
            </div>
          ))}

          {/* Moved Add Exercise button to flow with content */}
          {activeWorkout && (
            <div className="px-4 py-4 mt-2 mb-8 text-center text-gray-400 text-xs">
              <button 
                onClick={() => setIsSelectingExercise(true)}
                className="w-full py-4 bg-white border-2 border-dashed border-gray-200 text-gray-500 font-bold rounded-2xl flex items-center justify-center space-x-2 active:bg-gray-50 active:scale-[0.98] transition-all"
              >
                <Plus className="w-5 h-5 text-blue-500" /> <span>添加更多运动</span>
              </button>
              <p className="mt-4 opacity-50">已经滑到底部啦</p>
            </div>
          )}
        </div>
      </main>

      {/* Rest Timer overlay matching screenshot */}
      {restTimer.active && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom flex flex-col">
          {/* Progress bar line */}
          <div className="w-full h-0.5 bg-gray-100">
            <div className="bg-blue-500 h-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min(100, (restTimer.seconds / restTimer.defaultSeconds) * 100)}%` }}></div>
          </div>
          
          <div className="px-4 py-6 flex items-center justify-between h-20">
            <button 
              onClick={() => setRestTimer(prev => ({ ...prev, seconds: Math.max(0, prev.seconds - 15) }))}
              className="w-16 h-12 bg-gray-100 font-bold text-gray-600 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
            >
              -15
            </button>
            
            <div className="flex-1 flex justify-center">
              <span className="text-3xl font-black font-mono text-gray-900 tracking-tighter">
                {formatTime(restTimer.seconds)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setRestTimer(prev => ({ ...prev, seconds: prev.seconds + 15 }))}
                className="w-16 h-12 bg-gray-100 font-bold text-gray-600 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
              >
                +15
              </button>
              
              <button 
                onClick={() => setRestTimer(prev => ({ ...prev, active: false }))}
                className="px-6 h-12 bg-blue-50 text-blue-600 font-black rounded-xl active:scale-95 transition-transform flex items-center justify-center"
              >
                忽略
              </button>
            </div>
          </div>
          {/* Safe area spacer for mobile */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      )}

      {isSelectingExercise && (
        <ExerciseSelector 
          onClose={() => setIsSelectingExercise(false)}
          onAdd={handleAddExercises} 
        />
      )}

      {activeRestTimerId && activeWorkout && (
        <RestTimerModal
          isOpen={!!activeRestTimerId}
          onClose={() => setActiveRestTimerId(null)}
          title={`休息定时器 - ${getExercise(activeWorkout.items.find(i => i.id === activeRestTimerId)?.exerciseId || '')?.name || ''}`}
          value={activeWorkout.items.find(i => i.id === activeRestTimerId)?.restTime || 0}
          onChange={(val) => {
            updateActiveWorkout({
              ...activeWorkout,
              items: activeWorkout.items.map(i => i.id === activeRestTimerId ? { ...i, restTime: val } : i)
            });
          }}
        />
      )}

      {activeExerciseTypePickerId && activeWorkout && (
        <ExerciseTypeModal
          isOpen={!!activeExerciseTypePickerId}
          onClose={() => setActiveExerciseTypePickerId(null)}
          value={activeWorkout.items.find(i => i.id === activeExerciseTypePickerId)?.type || getExercise(activeWorkout.items.find(i => i.id === activeExerciseTypePickerId)?.exerciseId || '')?.type || 'weight_reps'}
          onChange={(val) => {
            if (activeExerciseTypePickerId) {
              changeItemType(activeExerciseTypePickerId, val);
            }
          }}
        />
      )}

      {activeRPEPicker && (
        <RPEPickerModal 
          isOpen={!!activeRPEPicker}
          onClose={() => setActiveRPEPicker(null)}
          value={activeRPEPicker.value}
          setInfo={{
            setNum: activeRPEPicker.setNum,
            reps: activeRPEPicker.reps,
            exerciseName: activeRPEPicker.exerciseName
          }}
          onChange={(val) => {
            updateSet(activeRPEPicker.itemId, activeRPEPicker.setId, 'rpe', val);
            setActiveRPEPicker(prev => prev ? { ...prev, value: val } : null);
          }}
        />
      )}

      <DurationPickerModal
        isOpen={!!activeDurationPicker}
        onClose={() => setActiveDurationPicker(null)}
        value={activeDurationPicker && activeWorkout ? Number(activeWorkout.items.find(i => i.id === activeDurationPicker.itemId)?.sets.find(s => s.id === activeDurationPicker.setId)?.[activeDurationPicker.key] || 0) : 0}
        onChange={(val) => {
          if (activeDurationPicker && activeWorkout) {
            updateActiveWorkout({
              ...activeWorkout,
              items: activeWorkout.items.map(i => i.id === activeDurationPicker.itemId ? { ...i, sets: (i.sets || []).map(s => s.id === activeDurationPicker.setId ? { ...s, [activeDurationPicker.key]: val } : s) } : i)
            });
          }
        }}
      />

      <WorkoutSummaryModal 
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        onSave={handleSaveSummary}
        onDiscard={handleDiscardFromSummary}
        stats={{
          duration,
          volume: totalVolume,
          sets: completedSets,
          title: activeWorkout?.title || '',
          mediaItems: activeWorkout?.mediaItems
        }}
      />

      <WorkoutCelebrationModal
        isOpen={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setFinishedWorkout(null);
        }}
        stats={{
          workoutCount: history.length + 1,
          username: user?.displayName?.toLowerCase().replace(/\s+/g, '') || 'rockdady'
        }}
        workout={finishedWorkout}
      />
      
      {activeWorkout && (
        <MuscleDistributionModal 
          isOpen={showMuscleDistribution}
          onClose={() => setShowMuscleDistribution(false)}
          workout={activeWorkout}
        />
      )}
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 transition-opacity">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">舍弃训练？</h3>
            <p className="text-sm text-gray-500 font-medium tracking-tight">确定要舍弃本次训练吗？所有已填写的记录将会丢失。</p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform"
              >
                继续训练
              </button>
              <button 
                onClick={() => {
                  cancelActiveWorkout();
                  setShowCancelConfirm(false);
                  setShowSummary(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
              >
                确认舍弃
              </button>
            </div>
          </div>
        </div>
      )}

      {showingExerciseDetail && (
        <ExerciseDetailModal 
          exercise={showingExerciseDetail}
          onClose={() => setShowingExerciseDetail(null)}
          onNavigateToLog={handleNavigateToLog}
        />
      )}
    </div>
  );
}
