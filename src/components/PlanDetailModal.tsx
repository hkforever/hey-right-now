import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  Dumbbell, 
  Target, 
  Timer, 
  ChevronRight, 
  Activity,
  MoreHorizontal,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrainingPlan } from '../admin/types';
import CloudMedia from './CloudMedia';

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: TrainingPlan;
}

export default function PlanDetailModal({ isOpen, onClose, plan }: PlanDetailModalProps) {
  const [showStickyButton, setShowStickyButton] = useState(false);
  const mainButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If the main button is NOT intersecting, it means it's scrolled out of view
        setShowStickyButton(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-80px 0px 0px 0px' // Adjust based on header height if needed
      }
    );

    if (mainButtonRef.current) {
      observer.observe(mainButtonRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const routines = plan.routines || [];

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="flex-1 text-center font-bold text-gray-900">方案</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="px-4 pt-6 pb-24 space-y-6">
          {/* Plan Hero */}
          <div className="flex flex-col items-center">
            <div className="w-[180px] h-[180px] bg-[#f8fbff] rounded-2xl flex relative shrink-0 items-center justify-center overflow-hidden shadow-sm">
              {plan.coverImage ? (
                 <CloudMedia src={plan.coverImage} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="text-[#1A73E8] font-black text-2xl leading-[1.1] whitespace-pre-line z-10 drop-shadow-xs">
                    {(plan as any).type || plan.scene || '方案'}
                  </span>
                  <div className="absolute -right-4 -bottom-4 text-gray-200/50">
                    <Building2Icon className="w-28 h-28" />
                  </div>
                </>
              )}
            </div>
            
            <div className="text-center mt-6 space-y-3">
              <h1 className="text-2xl font-black text-gray-900 leading-tight flex items-center justify-center gap-1">
                {plan.title} {plan.scene ? <span className="text-gray-400 font-bold ml-1 text-lg">({plan.scene})</span> : null}
              </h1>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 font-medium">
                <div className="bg-black rounded-full p-1">
                  <ChainIcon className="w-3 h-3 text-white" />
                </div>
                <span>由 Hevy 创建</span>
              </div>
            </div>

            <button 
              ref={mainButtonRef}
              className="w-full mt-6 py-4 bg-blue-500 text-white rounded-2xl font-black text-base shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
            >
              保存方案
            </button>

            {plan.description && (
              <p className="mt-6 text-[15px] text-gray-600 leading-relaxed text-left whitespace-pre-line w-full">
                {plan.description}
              </p>
            )}
          </div>

          {/* Training Plan List */}
          {routines.length > 0 && (
            <div className="space-y-8">
              <div className="h-2 bg-gray-50 -mx-4" />
              <h2 className="text-[17px] font-black text-gray-900">训练计划</h2>
              
              {routines.map((routine, idx) => (
                <div key={routine.id || idx} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900">{routine.title}</h3>
                    <button className="text-gray-400">
                      <MoreHorizontal className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {routine.description && (
                    <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                      {routine.description}
                    </p>
                  )}

                  <div className="space-y-4 pt-2">
                    {routine.exercises?.map((exercise, exIdx) => (
                      <div key={exIdx} className="flex flex-col gap-2 group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300">
                            {exercise.image ? (
                              <CloudMedia 
                                src={exercise.image}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dumbbell className="w-6 h-6 opacity-50" />
                            )}
                          </div>
                          <h4 className="text-[15px] font-bold text-blue-500 truncate group-hover:text-blue-600 transition-colors">
                            {exercise.name}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-400 font-bold">
                          {exercise.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                  {idx < routines.length - 1 && (
                    <div className="h-px bg-gray-100 mt-8" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Button at Bottom */}
      <AnimatePresence>
        {showStickyButton && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-4 left-4 right-4 z-10 sm:hidden"
          >
            <button className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-base shadow-[0_8px_30px_rgb(59,130,246,0.3)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              保存方案
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Building2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}

function ChainIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="14" width="3" height="6" rx="1" fill="currentColor"/>
      <rect x="8" y="10" width="3" height="10" rx="1" fill="currentColor"/>
      <rect x="13" y="6" width="3" height="14" rx="1" fill="currentColor"/>
      <rect x="18" y="2" width="3" height="18" rx="1" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}
