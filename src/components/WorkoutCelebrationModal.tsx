import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDuration, calculateVolume, isVideo } from '../lib/utils';
import confetti from 'canvas-confetti';

import CloudMedia from './CloudMedia';
import Body from 'react-muscle-highlighter';
import { getMuscleData } from '../lib/muscle-utils';
import { useAppStore, useAppData } from '../store';
import { WorkoutLog } from '../types';

interface WorkoutCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    workoutCount: number;
    username: string;
  };
  workout?: WorkoutLog | null;
}

export default function WorkoutCelebrationModal({ isOpen, onClose, stats, workout }: WorkoutCelebrationModalProps) {
  const { allExercises } = useAppData();
  const { history } = useAppStore();
  const [currentPage, setCurrentPage] = useState(0);
  
  // Calculate real total workout count
  const isWorkoutInHistory = workout ? history.some(h => h.id === workout.id) : false;
  const totalWorkoutCount = isWorkoutInHistory ? history.length : history.length + 1;

  // Calculate volume and sets for overlay
  const volume = workout ? calculateVolume(workout.items) : 0;
  const totalSets = workout ? workout.items.reduce((acc, item) => acc + item.sets.filter(s => s.completed).length, 0) : 0;
  const totalReps = workout ? workout.items.reduce((acc, item) => acc + item.sets.reduce((sAcc, s) => sAcc + (s.completed ? Number(s.reps || 0) : 0), 0), 0) : 0;
  
  const durationSeconds = (workout && workout.endTime && workout.startTime) ? Math.floor((workout.endTime - workout.startTime) / 1000) : 0;
  const durationText = formatDuration(durationSeconds);

  const hasMedia = workout?.mediaItems && workout.mediaItems.length > 0;

  useEffect(() => {
    if (!hasMedia && currentPage === 0) {
      setCurrentPage(1);
    }
  }, [hasMedia, currentPage]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      // Calculate particle count to be higher at the start and lower towards the end
      const progress = timeLeft / duration;
      const particleCount = Math.max(1, Math.floor(10 * progress));

      // Create a "falling from top" effect with more colors and shapes
      confetti({
        particleCount,
        angle: randomInRange(250, 290), // Pointing downwards
        spread: 45,
        origin: { x: Math.random(), y: -0.1 }, // Top of the screen
        shapes: ['circle', 'square', 'star'],
        colors: [
          '#26ccff', '#a259ff', '#ff2121', '#ffadad', '#ffff00', '#31ff31', 
          '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981',
          '#f97316', '#0ea5e9'
        ],
        scalar: randomInRange(0.7, 1.4),
        gravity: randomInRange(0.6, 1.1),
        ticks: 400,
        drift: randomInRange(-1.5, 1.5),
        startVelocity: randomInRange(5, 18),
        zIndex: 100
      });
    }, 40);
  };

  useEffect(() => {
    if (isOpen) {
      triggerConfetti();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate last 7 days names ending today
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0); // Start of that day
    return {
      date: d,
      label: dayNames[d.getDay()],
      isToday: i === 6
    };
  });

  // Real activity calculation
  const activity = last7Days.map(day => {
    const start = day.date.getTime();
    const end = start + 24 * 60 * 60 * 1000;
    
    // Check history
    const hasHistory = history.some(log => log.startTime >= start && log.startTime < end);
    // Check current finished workout (it's not in history yet usually or just added)
    const isCurrent = workout && workout.startTime >= start && workout.startTime < end;
    
    return hasHistory || !!isCurrent;
  });

  const last7DaysCount = activity.filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col font-sans animate-in fade-in duration-300">
      <div 
        className="fixed top-8 right-8 w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-3xl shadow-sm border border-gray-100 cursor-pointer active:scale-90 transition-transform z-[80]"
        onClick={triggerConfetti}
      >
        🎉
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center">
        <div 
          className="relative mb-2 cursor-pointer active:scale-95 transition-transform"
          onClick={triggerConfetti}
        >
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">好样的!</h1>
        </div>
        <p className="text-lg text-gray-900">这是您的第{totalWorkoutCount}次锻炼</p>

        {/* Carousel Container */}
        <div className="relative w-full max-w-sm h-[400px] mb-8 group touch-none">
          <div className="absolute inset-0 z-0" />
          <AnimatePresence mode="wait">
            {currentPage === 0 && hasMedia ? (
              <motion.div 
                key="page1"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) setCurrentPage(1);
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 bg-white rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] p-1 border border-gray-50 flex flex-col overflow-hidden cursor-grab active:cursor-grabbing"
              >
                <div className="relative flex-1 rounded-[28px] overflow-hidden">
                  <CloudMedia 
                    src={workout!.mediaItems![0].url} 
                    type={workout!.mediaItems![0].type === 'video' || isVideo(workout!.mediaItems![0].url) ? 'video' : 'image'} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    preload="auto"
                    className="w-full h-full object-cover pointer-events-none" 
                  />
                  
                  {/* Stats Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none">
                    <div className="absolute top-6 left-0 right-0 grid grid-cols-3 text-center px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">时长</span>
                        <span className="text-xl font-black text-white">{durationText.replace('分钟', 'min').replace('小时', 'h')}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">次</span>
                        <span className="text-xl font-black text-white">{totalReps}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">组</span>
                        <span className="text-xl font-black text-white">{totalSets}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-end" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="page2"
                drag={hasMedia ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (hasMedia && info.offset.x > 50) setCurrentPage(0);
                }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 bg-white rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] p-6 border border-gray-50 flex flex-col items-center"
              >
                {/* Muscle Manikin */}
                <div className="flex justify-center space-x-1 mb-8 mt-4 scale-110">
                  <div className="w-[110px] h-[180px] flex items-center justify-center">
                    <Body 
                      data={getMuscleData(workout || null, allExercises)} 
                      side="front" 
                      scale={0.45} 
                      defaultStroke="#FFFFFF"
                      defaultStrokeWidth={1}
                    />
                  </div>
                  <div className="w-[110px] h-[180px] flex items-center justify-center">
                    <Body 
                      data={getMuscleData(workout || null, allExercises)} 
                      side="back" 
                      scale={0.45} 
                      defaultStroke="#FFFFFF"
                      defaultStrokeWidth={1}
                    />
                  </div>
                </div>

                {/* Weekly Activity */}
                <div className="w-full grid grid-cols-7 gap-1 mb-8">
                  {last7Days.map((day, i) => (
                    <div key={i} className="flex flex-col items-center space-y-2">
                      <span className={cn(
                        "text-[9px] font-bold break-words w-4 text-center leading-tight transition-colors",
                        day.isToday ? "text-blue-600" : "text-gray-400"
                      )}>
                        {day.label}
                      </span>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        activity[i] ? "bg-blue-500 text-white shadow-lg" : "bg-blue-50 text-transparent",
                        day.isToday && activity[i] ? "ring-2 ring-blue-100" : ""
                      )}>
                        {activity[i] && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-base font-bold text-gray-900 text-center tracking-tight">你在过去 7 天内锻炼了 {last7DaysCount} 次</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Indicators */}
          {hasMedia && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex space-x-1.5">
              {[0, 1].map(i => (
                <div 
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    currentPage === i ? "w-6 bg-blue-500" : "w-1.5 bg-gray-200"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="p-6">
        <button 
          onClick={onClose}
          className="w-full py-4 bg-blue-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
          已完成
        </button>
      </footer>
    </div>
  );
}
