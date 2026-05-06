import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

interface RPEPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
  setInfo?: {
    setNum: number;
    reps: string | number;
    exerciseName: string;
  };
}

const RPE_INFO_MAP: Record<string, { intensity: string; hint: string; emoji: string }> = {
  '6': { intensity: '中等强度', hint: '本可以多做4次以上', emoji: '🙂' },
  '7': { intensity: '高强度', hint: '肯定可以再做3次', emoji: '😅' },
  '7.5': { intensity: '高强度', hint: '或许可以多做3次', emoji: '😤' },
  '8': { intensity: '很高强度', hint: '肯定可以再做2次', emoji: '😩' },
  '8.5': { intensity: '很高强度', hint: '本可以多做2次以上', emoji: '😫' },
  '9': { intensity: '极高强度', hint: '肯定可以再做1次', emoji: '😖' },
  '9.5': { intensity: '极高强度', hint: '或许可以多做1次', emoji: '😵' },
  '10': { intensity: '最大强度', hint: '无可用次数', emoji: '💀' },
};

const RPE_VALUES = ['6', '7', '7.5', '8', '8.5', '9', '9.5', '10'];

export default function RPEPickerModal({ isOpen, onClose, value, onChange, setInfo }: RPEPickerModalProps) {
  const currentInfo = RPE_INFO_MAP[value] || { intensity: '-', hint: '选择训练强度感受等级', emoji: '🤔' };
  const selectedRpe = value || '0';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[120] bg-white rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header Handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="px-4 pb-10 pt-4 flex flex-col items-center">
              <h3 className="text-xl font-bold text-gray-900 mb-1">记录运动自觉强度</h3>
              {setInfo && (
                <p className="text-gray-400 font-medium">第 {setInfo.setNum} 组: {setInfo.reps} 次</p>
              )}

              <div className="py-12 flex flex-col items-center w-full min-h-[220px] justify-center relative">
                <div className="flex flex-col items-center space-y-4">
                  <motion.span 
                    key={selectedRpe}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[100px] font-black text-gray-900 leading-none tracking-tighter"
                  >
                    {selectedRpe}
                  </motion.span>
                  {selectedRpe !== '0' && (
                    <motion.span
                      key={`emoji-${selectedRpe}`}
                      initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      className="text-[64px] leading-none"
                    >
                      {currentInfo.emoji}
                    </motion.span>
                  )}
                </div>
                
                <div className="flex flex-col items-center mt-6 space-y-2 h-[60px]">
                  <motion.span 
                    key={currentInfo.intensity}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-lg font-bold text-gray-900"
                  >
                    {currentInfo.intensity}
                  </motion.span>
                  <motion.span 
                    key={currentInfo.hint}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-gray-400 font-medium"
                  >
                    {currentInfo.hint}
                  </motion.span>
                </div>
              </div>

              {/* Selector */}
              <div className="w-full bg-[#E9EDF0] h-[52px] rounded-full flex items-center p-1 mb-10 relative">
                {RPE_VALUES.map((rpe) => (
                  <button
                    key={rpe}
                    onClick={() => onChange(rpe)}
                    className={cn(
                      "flex-1 h-full flex items-center justify-center font-bold text-[15px] transition-colors relative",
                      value === rpe ? "text-white" : "text-[#7F8A96] hover:text-gray-900"
                    )}
                  >
                    {value === rpe && (
                      <motion.div
                        layoutId="active-rpe-indicator"
                        className="absolute inset-0 m-auto h-[44px] w-[44px] bg-[#0091FF] rounded-full shadow-lg shadow-blue-500/30"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                    <span className="relative z-10">{rpe}</span>
                  </button>
                ))}
              </div>

              {/* Confirm Button */}
              <button 
                onClick={onClose}
                className={cn(
                  "w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold text-lg transition-all active:scale-[0.98]",
                  value ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-gray-200 text-gray-400"
                )}
              >
                <span>已完成</span>
                <Check className="w-6 h-6 stroke-[3px]" />
              </button>
            </div>

            {/* Safe area spacer */}
            <div className="h-[env(safe-area-inset-bottom,20px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
