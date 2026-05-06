import React from 'react';
import Body, { Slug, ExtendedBodyPart } from 'react-muscle-highlighter';
import { WorkoutLog } from '../types';
import { useAppData } from '../store';
import { ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { muscleMapping, muscleDisplayOrder, allSlugs, getMuscleData } from '../lib/muscle-utils';

interface MuscleDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutLog;
}

export default function MuscleDistributionModal({ isOpen, onClose, workout }: MuscleDistributionModalProps) {
  const { allExercises, getExercise } = useAppData();

  if (!isOpen) return null;

  const muscleData = getMuscleData(workout, allExercises);

  // Aggregate sets by muscle for the list display
  const muscleGroups: Record<string, number> = {};
  workout.items.forEach(item => {
    const exercise = getExercise(item.exerciseId);
    if (!exercise) return;
    const completedSets = item.sets.filter(s => s.completed).length;
    if (completedSets === 0) return;
    const muscle = exercise.primaryMuscle;
    muscleGroups[muscle] = (muscleGroups[muscle] || 0) + completedSets;
  });

  const maxSets = Math.max(...Object.values(muscleGroups), 1);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex flex-col pt-safe px-0"
        onClick={onClose}
      >
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="mt-auto bg-white rounded-t-[32px] w-full max-h-[90vh] overflow-hidden flex flex-col pb-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
          
          <header className="px-6 py-4 flex items-center justify-center relative border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">肌肉分布</h2>
            <button onClick={onClose} className="absolute right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto pb-10">
            {/* Muscle Visualization */}
            <div className="flex justify-center items-center py-2 bg-gray-50/50">
              <div className="flex justify-center items-center space-x-2 w-full max-w-[340px]">
                <div className="w-[140px] h-[340px] flex items-center justify-center">
                  <Body 
                    data={muscleData} 
                    side="front" 
                    gender="male"
                    scale={0.8} 
                    defaultStroke="#FFFFFF"
                    defaultStrokeWidth={1}
                  />
                </div>
                <div className="w-[140px] h-[340px] flex items-center justify-center">
                  <Body 
                    data={muscleData} 
                    side="back" 
                    gender="male"
                    scale={0.8}
                    defaultStroke="#FFFFFF"
                    defaultStrokeWidth={1}
                  />
                </div>
              </div>
            </div>

            {/* Stats List */}
            <div className="px-6 mt-2 space-y-6">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                <span>肌肉</span>
                <span>已完成组数</span>
              </div>

              {muscleDisplayOrder
                .map(muscle => ({ name: muscle, count: muscleGroups[muscle] || 0 }))
                .sort((a, b) => b.count - a.count)
                .map(({ name, count }) => {
                return (
                  <div key={name} className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-gray-900 w-20">{name}</span>
                    <div className="flex-1 px-4">
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: maxSets > 0 ? `${(count / maxSets) * 100}%` : '0%' }}
                          className="h-full bg-blue-500 rounded-full"
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-black text-gray-900 w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </main>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
