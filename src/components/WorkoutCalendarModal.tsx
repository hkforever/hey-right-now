import React, { useState, useMemo } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Share2, SlidersHorizontal, Flame, Moon } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addYears, 
  subYears, 
  startOfYear, 
  endOfYear,
  getYear,
  getMonth,
  isToday,
  differenceInDays
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore, useAppData } from '../store';
import { WorkoutLog } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import WorkoutLogDetail from './WorkoutLogDetail';

interface WorkoutCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'month' | 'year' | 'multi-year';

export default function WorkoutCalendarModal({ isOpen, onClose }: WorkoutCalendarModalProps) {
  const { history, updateWorkoutLog, deleteWorkoutLog } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<WorkoutLog | null>(null);

  // Helper to check if a day has a workout
  const getWorkoutsForDay = (day: Date) => {
    return history.filter(log => isSameDay(new Date(log.startTime), day));
  };

  // Calculate streaks and rest days
  const stats = useMemo(() => {
    // This is a simplified calculation for the "Continuous Weeks" and "Rest Days"
    // In a real app, this logic would be more complex
    const now = new Date();
    const thirtyDaysAgo = subMonths(now, 1);
    const workoutsLast30Days = history.filter(log => new Date(log.startTime) > thirtyDaysAgo);
    
    // Find last workout to calculate rest days
    const lastWorkout = history.length > 0 ? new Date(history[0].startTime) : null;
    const restDays = lastWorkout ? differenceInDays(now, lastWorkout) : 0;

    return {
      continuousWeeks: 0, // Placeholder
      restDays: restDays
    };
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header Area */}
      <div className="shrink-0 bg-white z-30 shadow-sm">
        {/* Main Header */}
        <div className="px-4 pt-12 pb-4 flex items-center justify-between border-b border-gray-50">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="relative">
            <button 
              className="flex items-center space-x-1 px-4 py-1.5 bg-gray-50 rounded-full text-sm font-bold text-gray-900 active:scale-95 transition-all"
              onClick={() => {
                const modes: ViewMode[] = ['month', 'year', 'multi-year'];
                const nextMode = modes[(modes.indexOf(viewMode) + 1) % modes.length];
                setViewMode(nextMode);
              }}
            >
              <span>{viewMode === 'month' ? '月度视图' : viewMode === 'year' ? '年度视图' : '多年度视图'}</span>
              <ChevronLeft className="w-4 h-4 -rotate-90" />
            </button>
          </div>

          <div className="flex items-center space-x-1 opacity-0 pointer-events-none">
            <div className="p-2 w-9 h-9" />
          </div>
        </div>

        {/* Month View Specific Header (Stats) */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-2 divide-x divide-gray-50 border-b border-gray-50">
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-xs font-bold text-gray-900">连续 {stats.continuousWeeks} 周</span>
              </div>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center space-x-2">
                <Moon className="w-4 h-4 text-blue-500 fill-blue-500" />
                <span className="text-xs font-bold text-gray-900">{stats.restDays} 天休息</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white pb-safe">
        <AnimatePresence mode="wait">
          {viewMode === 'month' && (
            <motion.div 
              key="month-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pb-20"
            >
              <MonthView 
                getWorkoutsForDay={getWorkoutsForDay}
                onSelectLog={setSelectedLog}
              />
            </motion.div>
          )}

          {viewMode === 'year' && (
            <motion.div 
              key="year-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 pb-20"
            >
              <YearView 
                currentDate={currentDate} 
                setCurrentDate={setCurrentDate}
                history={history}
                onSelectLog={setSelectedLog}
              />
            </motion.div>
          )}

          {viewMode === 'multi-year' && (
            <motion.div 
              key="multi-year-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 pb-20"
            >
              <MultiYearView 
                history={history} 
                onSelectLog={setSelectedLog}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedLog && (
        <WorkoutLogDetail
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          onSave={(summary) => {
            const updated = {
              ...selectedLog,
              title: summary.title,
              notes: summary.notes,
              mediaItems: summary.mediaItems
            };
            updateWorkoutLog(updated);
            setSelectedLog(updated);
          }}
          onDiscard={() => {
            setLogToDelete(selectedLog);
          }}
          log={selectedLog}
        />
      )}

      {logToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">确认删除</h3>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              确定要删除这条训练记录吗？
              <br />
              <span className="text-red-500 text-xs mt-2 block font-bold">此操作无法撤销。</span>
            </p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setLogToDelete(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  deleteWorkoutLog(logToDelete.id);
                  setLogToDelete(null);
                  setSelectedLog(null);
                }}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ getWorkoutsForDay, onSelectLog }: any) {
  const today = new Date();
  const currentMonthRef = React.useRef<HTMLDivElement>(null);
  
  // Generate a range of months: 1 month ago to 1 month in the future (total 3 months)
  const monthsRange = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => addMonths(subMonths(today, 1), i));
  }, []);

  // Scroll to current month on initial mount
  React.useEffect(() => {
    if (currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="flex flex-col">
      {/* Sticky Weekday Header */}
      <div className="grid grid-cols-7 border-b border-gray-50 h-10 sticky top-0 bg-white/90 backdrop-blur-sm z-20">
        {weekDays.map(day => (
          <div key={day} className="flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-gray-50">
        {monthsRange.map((monthDate) => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const isCurrMonth = isSameMonth(monthDate, today);
          
          // Calculate padding for the first day of the month (Monday start)
          const startPadding = (monthStart.getDay() + 6) % 7;
          
          const days = eachDayOfInterval({
            start: monthStart,
            end: monthEnd,
          });

          return (
            <div 
              key={monthDate.toISOString()} 
              className="px-4 py-4"
              ref={isCurrMonth ? currentMonthRef : null}
            >
              <h2 className="text-base font-black text-gray-900 mb-3 tracking-tight">
                {format(monthDate, 'yyyy年M月', { locale: zhCN })}
              </h2>
              
              <div className="grid grid-cols-7 gap-y-6 relative">
                {/* Padding */}
                {[...Array(startPadding)].map((_, i) => (
                  <div key={`p-${i}`} className="h-9" />
                ))}

                {days.map((day) => {
                  const workouts = getWorkoutsForDay(day);
                  const isExToday = isToday(day);
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "flex flex-col items-center relative h-9",
                        workouts.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""
                      )}
                      onClick={() => workouts.length > 0 && onSelectLog(workouts[0])}
                    >
                      <div className={cn(
                        "w-8 h-8 flex flex-col items-center justify-center rounded-full transition-all relative z-10",
                        workouts.length > 0 ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-900",
                        isExToday && workouts.length === 0 ? "border-2 border-blue-500" : ""
                      )}>
                        <span className="text-sm font-bold">{format(day, 'd')}</span>
                      </div>
                      
                      {workouts.length > 0 && (
                        <div className="absolute top-8.5 text-[7px] font-bold text-gray-400 truncate w-full text-center px-1 whitespace-nowrap overflow-hidden">
                          {workouts[0].title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ currentDate, history, onSelectLog }: any) {
  const currentYear = getYear(currentDate);
  const months = [...Array(12)].map((_, i) => i);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-gray-900 tracking-tighter">{currentYear}</h2>
      
      <div className="grid grid-cols-3 gap-x-4 gap-y-8">
        {months.map(monthIdx => {
          const firstDayOfMonth = new Date(currentYear, monthIdx, 1);
          const lastDayOfMonth = endOfMonth(firstDayOfMonth);
          const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
          const startPadding = (firstDayOfMonth.getDay() + 6) % 7; // Adjust for Monday start

          return (
            <div key={monthIdx} className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">{monthIdx + 1}月</h3>
              <div className="grid grid-cols-7 gap-1">
                {/* Padding for Monday start */}
                {[...Array(startPadding)].map((_, i) => <div key={`p-${i}`} className="w-2.5 h-2.5" />)}
                
                {days.map(day => {
                  const dayWorkouts = history.filter((log: WorkoutLog) => isSameDay(new Date(log.startTime), day));
                  const hasWorkout = dayWorkouts.length > 0;
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "w-2.5 h-2.5 rounded-[2px] transition-colors",
                        hasWorkout ? "bg-blue-500 cursor-pointer hover:bg-blue-600 active:scale-125" : "bg-gray-100"
                      )}
                      onClick={() => hasWorkout && onSelectLog(dayWorkouts[0])}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiYearView({ history, onSelectLog }: any) {
  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    const historyYears = history.map((log: WorkoutLog) => getYear(new Date(log.startTime)));
    return Array.from(new Set([currentYear, ...historyYears])).sort((a, b) => b - a);
  }, [history]);

  const monthsHeader = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="space-y-12">
      {years.map(year => (
        <div key={year} className="space-y-4">
          <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{year}</h3>
          
          <div className="relative overflow-x-auto pb-4 hide-scrollbar">
            <div className="min-w-max">
              {/* Header */}
              <div className="flex mb-2">
                 {monthsHeader.map(m => (
                   <div key={m} className="w-[38px] text-left text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{m}</div>
                 ))}
              </div>
              
              {/* Heatmap Grid: 7 rows (Mon-Sun) */}
              <div className="grid grid-rows-7 grid-flow-col gap-1">
                {/* 
                  Generate a full year's worth of cells.
                  To simplify, we'll iterate through each day of the year and place them in the grid.
                */}
                {useMemo(() => {
                  const start = startOfYear(new Date(year, 0, 1));
                  const end = endOfYear(start);
                  const days = eachDayOfInterval({ start, end });
                  
                  return days.map(day => {
                    const dow = (day.getDay() + 6) % 7; // 0=Mon, 6=Sun
                    const dayWorkouts = history.filter((log: WorkoutLog) => isSameDay(new Date(log.startTime), day));
                    const hasWorkout = dayWorkouts.length > 0;
                    
                    return (
                      <div 
                        key={day.toISOString()}
                        className={cn(
                          "w-2 h-2 rounded-[1.5px] transition-colors",
                          hasWorkout ? "bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.3)] cursor-pointer hover:bg-blue-600 active:scale-150" : "bg-gray-100"
                        )}
                        style={{ gridRowStart: dow + 1 }}
                        onClick={() => hasWorkout && onSelectLog(dayWorkouts[0])}
                      />
                    );
                  });
                }, [year, history])}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
