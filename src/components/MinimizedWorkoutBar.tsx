import React, { useState, useEffect } from 'react';
import { useAppStore, useAppData } from '../store';
import { ChevronUp, Trash2 } from 'lucide-react';
import { formatTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function MinimizedWorkoutBar() {
  const { activeWorkout, setIsWorkoutMinimized, cancelActiveWorkout } = useAppStore();
  const { getExercise } = useAppData();
  const [duration, setDuration] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!activeWorkout) return null;

  // Get current active exercise (first one not completed or just the first one)
  const currentItem = activeWorkout.items.find(item => item.sets.some(s => !s.completed)) || activeWorkout.items[0];
  const currentExercise = currentItem ? getExercise(currentItem.exerciseId) : null;

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2 flex justify-center pointer-events-none">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-3 h-16 flex items-center pointer-events-auto"
        >
          {/* Restore Button */}
          <button 
            onClick={() => setIsWorkoutMinimized(false)}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-90 transition-transform hover:bg-gray-100"
          >
            <ChevronUp className="w-6 h-6" />
          </button>

          {/* Info Section */}
          <div className="flex-1 ml-3 min-w-0" onClick={() => setIsWorkoutMinimized(false)}>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-black text-gray-900 leading-none">健身</span>
              <span className="text-sm font-bold font-mono text-gray-400 leading-none">{formatTime(duration)}</span>
            </div>
            <div className="mt-1">
              <p className="text-xs font-bold text-gray-500 truncate">
                {currentExercise ? currentExercise.name : '准备中...'}
              </p>
            </div>
          </div>

          {/* Cancel Button */}
          <button 
            onClick={() => setShowCancelConfirm(true)}
            className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 active:scale-90 transition-transform hover:bg-red-100"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-gray-900 tracking-tight">舍弃训练</h3>
              <p className="text-sm text-gray-500 font-medium tracking-tight leading-relaxed">
                确定要舍弃当前的训练吗？所有进度将会丢失。
              </p>
              <div className="flex space-x-3 pt-2">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    cancelActiveWorkout();
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                >
                  舍弃训练
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
