import { useState, useRef, useEffect } from 'react';
import { cn, formatRestTime } from '../lib/utils';

interface RestTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: number; // 0 means off
  onChange: (seconds: number) => void;
  title?: string;
}

export default function RestTimerModal({ isOpen, onClose, value, onChange, title = "休息定时器" }: RestTimerModalProps) {
  const [selectedValue, setSelectedValue] = useState(value);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate options: 0 (关闭), 5, 10, ... 300
  const options = [0];
  for (let i = 5; i <= 300; i += 5) {
    options.push(i);
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedValue(value);
      setTimeout(() => {
        if (scrollRef.current) {
          const index = options.indexOf(value);
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
        <h2 className="text-center font-bold text-lg text-gray-900">休息定时器</h2>
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
              if (options[index] !== undefined) {
                setSelectedValue(options[index]);
              }
            }}
          >
            <style>{`
              div::-webkit-scrollbar { display: none; }
            `}</style>
            {options.map((opt) => (
              <div 
                key={opt} 
                className={cn(
                  "h-[40px] flex items-center justify-center snap-center text-lg transition-colors cursor-pointer",
                  selectedValue === opt ? "text-gray-900 font-bold" : "text-gray-400"
                )}
                onClick={() => {
                  const idx = options.indexOf(opt);
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: idx * 40, behavior: 'smooth' });
                  }
                  setSelectedValue(opt);
                }}
              >
                {formatRestTime(opt)}
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
