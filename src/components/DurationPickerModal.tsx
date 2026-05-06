import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface DurationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  value: number; // Duration in seconds
  onChange: (value: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

const ScrollColumn = ({ 
  items, 
  value, 
  onChange, 
  label 
}: { 
  items: number[], 
  value: number, 
  onChange: (val: number) => void,
  label: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 48; // px

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = value * ITEM_HEIGHT;
    }
  }, [value]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    if (index >= 0 && index < items.length && index !== value) {
      onChange(items[index]);
    }
  };

  return (
    <div className="flex-1 relative h-[144px] overflow-hidden">
      {/* Selected highlighted background */}
      <div className="absolute top-[48px] left-1 right-1 h-[48px] bg-gray-100 rounded-xl pointer-events-none" />
      
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide flex flex-col relative z-10"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div style={{ height: ITEM_HEIGHT }} className="shrink-0" />
        {items.map(item => (
          <div 
            key={item} 
            className={`h-[48px] shrink-0 flex items-center justify-center snap-center text-xl transition-colors ${item === value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
          >
            {item}{label}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT }} className="shrink-0" />
      </div>
    </div>
  );
};

export default function DurationPickerModal({ isOpen, onClose, title = '持续时间', value, onChange }: DurationPickerModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setHours(Math.floor(value / 3600));
      setMinutes(Math.floor((value % 3600) / 60));
      setSeconds(value % 60);
    }
  }, [isOpen, value]);

  const handleComplete = () => {
    onChange(hours * 3600 + minutes * 60 + seconds);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 transition-opacity">
          <div className="fixed inset-0" onClick={onClose} />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
            <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-center relative">
              <span className="font-bold text-gray-900 text-lg">{title}</span>
            </header>

            <div className="p-6 flex flex-col items-center justify-center space-y-6">
              
              <div className="w-full flex justify-between space-x-2 relative">
                 <ScrollColumn items={HOURS} value={hours} onChange={setHours} label="时" />
                 <ScrollColumn items={MINUTES} value={minutes} onChange={setMinutes} label="分" />
                 <ScrollColumn items={SECONDS} value={seconds} onChange={setSeconds} label="秒" />
              </div>

              <button 
                onClick={handleComplete}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl transition-colors text-lg"
              >
                已完成
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
