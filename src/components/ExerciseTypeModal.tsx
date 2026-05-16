import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ExerciseType } from '../types';

interface ExerciseTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: ExerciseType;
  onChange: (type: ExerciseType) => void;
  title?: string;
}

export const EXERCISE_TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: 'weight_reps', label: '重量 + 次数' },
  { value: 'reps_only', label: '仅次数 (自重)' },
  { value: 'weighted_bodyweight', label: '附重自重' },
  { value: 'assisted_bodyweight', label: '辅助自重' },
  { value: 'time', label: '按时间' },
  { value: 'time_weight', label: '时间 + 重量' },
  { value: 'distance_time', label: '距离 + 时间' },
  { value: 'weight_distance', label: '重量 + 距离' }
];

export function getExerciseTypeLabel(type: ExerciseType | undefined): string {
  if (!type) return '重量 + 次数';
  const opt = EXERCISE_TYPE_OPTIONS.find(o => o.value === type);
  return opt ? opt.label : '重量 + 次数';
}

export default function ExerciseTypeModal({ isOpen, onClose, value, onChange, title = "运动类型" }: ExerciseTypeModalProps) {
  const [selectedValue, setSelectedValue] = useState<ExerciseType>(value);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedValue(value);
      setTimeout(() => {
        if (scrollRef.current) {
          const index = EXERCISE_TYPE_OPTIONS.findIndex(o => o.value === value);
          if (index !== -1) {
            scrollRef.current.scrollTop = index * 40;
          }
        }
      }, 50);
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 transition-opacity">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="bg-white rounded-t-2xl w-full max-w-sm shadow-xl z-20 flex flex-col pt-4 pb-6 px-4 animate-in slide-in-from-bottom-5">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-center font-bold text-lg text-gray-900">运动类型</h2>
        {title && <p className="text-center text-sm text-gray-500 mb-6">{title}</p>}
        
        <div className="relative h-[200px] overflow-hidden rounded-xl bg-gray-50 mb-6 select-none">
          {/* Highlight band */}
          <div className="absolute top-1/2 left-0 right-0 h-[40px] -translate-y-1/2 bg-gray-200/50 pointer-events-none rounded-lg" />
          
          <div 
            ref={scrollRef}
            className="h-full overflow-y-auto snap-y snap-mandatory py-[80px]"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
              WebkitOverflowScrolling: 'touch' 
            }}
            onScroll={(e) => {
              const index = Math.round(e.currentTarget.scrollTop / 40);
              if (EXERCISE_TYPE_OPTIONS[index] !== undefined) {
                setSelectedValue(EXERCISE_TYPE_OPTIONS[index].value);
              }
            }}
          >
            <style>{`
              div::-webkit-scrollbar { display: none; }
            `}</style>
            {EXERCISE_TYPE_OPTIONS.map((opt) => (
              <div 
                key={opt.value} 
                className={cn(
                  "h-[40px] flex items-center justify-center snap-center text-lg transition-colors cursor-pointer px-4 text-center",
                  selectedValue === opt.value ? "text-gray-900 font-bold" : "text-gray-400"
                )}
                onClick={() => {
                  const idx = EXERCISE_TYPE_OPTIONS.findIndex(o => o.value === opt.value);
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: idx * 40, behavior: 'smooth' });
                  }
                  setSelectedValue(opt.value);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => {
            onChange(selectedValue);
            onClose();
          }}
          className="w-full py-3.5 bg-blue-500 text-white font-bold rounded-xl active:scale-95 transition-transform"
        >
          已完成
        </button>
      </div>
    </div>
  );
}
