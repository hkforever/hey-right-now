import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { db } from '../lib/cloudbase';
import { Routine } from './types';
import { Exercise } from '../types';
import { Search, Info, X } from 'lucide-react';
import CloudMedia from '../components/CloudMedia';

const typeMap: Record<string, string> = {
  'weight_reps': '计重次数',
  'reps_only': '仅次数',
  'weighted_bodyweight': '负重自重',
  'assisted_bodyweight': '助力自重',
  'time': '计时',
  'time_weight': '计时计重',
  'distance_time': '距离计时',
  'weight_distance': '距离计重',
  'bodyweight': '自重'
};

export function ImportRoutineButton({ onImport }: { onImport: (routine: Routine) => void }) {
  const [loading, setLoading] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const res = await db.collection('routines').limit(100).get();
      setRoutines((res.data || []) as Routine[]);
    } catch (e) {
      console.error('Import routines fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          if (!isOpen) fetchRoutines();
          setIsOpen(!isOpen);
        }}
        className="text-sm text-[#1677ff] border border-[#1677ff] hover:bg-[#1677ff] hover:text-white px-3 py-1.5 rounded transition-colors"
      >
        从已有计划导入
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}/>
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden transform origin-top-right">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500">选择计划导入 (深拷贝)</div>
            <div className="max-h-64 overflow-y-auto w-full">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-400">加载中...</div>
              ) : routines.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">暂无已有计划</div>
              ) : routines.map(rt => (
                <div 
                  key={rt._id}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                  onClick={() => {
                    const clonedDetails = JSON.parse(JSON.stringify(rt));
                    delete clonedDetails._id;
                    onImport(clonedDetails);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-bold text-gray-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{rt.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{rt.description}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ExerciseAutocomplete({
  disabled,
  onSelect 
}: { 
  disabled?: boolean;
  onSelect: (ex: Exercise) => void;
}) {
  const { allExercises } = useAppStore();
  const [value, setValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [detailItem, setDetailItem] = useState<Exercise | null>(null);
  
  const filtered = useMemo(() => {
    if (!value) return [];
    return allExercises.filter(e => e.name.toLowerCase().includes(value.toLowerCase())).slice(0, 10);
  }, [value, allExercises]);

  return (
    <div className="relative w-full sm:w-auto">
       <div className="flex items-center border-b border-dashed border-gray-300 focus-within:border-[#1677ff] transition-colors pb-1">
         <Search className="w-4 h-4 text-gray-400 mr-2" />
         <input 
            disabled={disabled}
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full sm:w-40 leading-6 outline-none bg-transparent text-sm"
            placeholder="搜索标准动作..."
         />
       </div>
       {showDropdown && filtered.length > 0 && (
         <div className="absolute top-full left-0 mt-1 w-[320px] bg-white border border-gray-200 shadow-xl rounded-lg z-50 max-h-[300px] overflow-y-auto">
            {filtered.map(ex => (
               <div 
                 key={ex.id}
                 className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                 onMouseDown={(e) => {
                   if ((e.target as HTMLElement).closest('.info-btn')) return;
                   onSelect(ex);
                   setValue('');
                   setShowDropdown(false);
                 }}
               >
                 {ex.media ? (
                   <CloudMedia src={ex.media} alt={ex.name} className="w-10 h-10 object-cover rounded bg-gray-100 mr-3 shrink-0" />
                 ) : (
                   <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-3 shrink-0 text-xs text-gray-400">无图</div>
                 )}
                 <div className="flex-1 min-w-0">
                   <div className="font-bold text-gray-800 text-sm truncate">{ex.name}</div>
                   <div className="text-xs text-gray-500 mt-0.5 truncate">{ex.primaryMuscle} • {ex.equipment}</div>
                 </div>
                 <button 
                   className="info-btn p-2 text-gray-400 hover:text-[#1677ff] opacity-0 group-hover:opacity-100 transition-opacity"
                   onMouseDown={(e) => {
                     e.stopPropagation();
                     setDetailItem(ex);
                   }}
                   title="查看详情"
                 >
                   <Info className="w-4 h-4" />
                 </button>
               </div>
            ))}
         </div>
       )}

       {detailItem && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onMouseDown={() => setDetailItem(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-md overflow-hidden" onMouseDown={e => e.stopPropagation()}>
             <div className="flex items-center justify-between p-4 border-b border-gray-100">
               <h3 className="font-bold text-lg text-gray-800">动作详情</h3>
               <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
                 <X className="w-4 h-4" />
               </button>
             </div>
              <div className="p-4 space-y-4">
               {(detailItem.videoUrl || detailItem.media) && (
                 <CloudMedia src={detailItem.videoUrl || detailItem.media} alt={detailItem.name} className="w-full h-48 object-contain bg-gray-50 rounded-lg" />
               )}
               <div>
                 <div className="text-xl font-black text-gray-900 mb-1">{detailItem.name}</div>
                 <div className="flex flex-wrap gap-2 mb-4">
                   <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">{detailItem.primaryMuscle}</span>
                   <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{detailItem.equipment}</span>
                   {detailItem.category && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{detailItem.category}</span>}
                 </div>
                 <div className="text-sm text-gray-600 space-y-2">
                   {detailItem.secondaryMuscles && detailItem.secondaryMuscles.length > 0 && (
                     <div className="flex bg-gray-50 p-2 rounded">
                       <span className="text-gray-400 w-20 shrink-0">辅助肌肉</span>
                       <span className="font-medium">{detailItem.secondaryMuscles.join('、')}</span>
                     </div>
                   )}
                   <div className="flex bg-gray-50 p-2 rounded">
                     <span className="text-gray-400 w-20 shrink-0">类型</span>
                     <span className="font-medium">{typeMap[detailItem.type] || detailItem.type}</span>
                   </div>
                 </div>
                 {detailItem.instruction_steps?.zh && detailItem.instruction_steps.zh.length > 0 && (
                   <div className="mt-4 border-t border-gray-100 pt-4">
                     <div className="text-sm font-bold text-gray-800 mb-2">动作要领</div>
                     <ol className="list-decimal pl-4 space-y-1.5 text-sm text-gray-600">
                       {detailItem.instruction_steps.zh.map((step, idx) => (
                         <li key={idx}>{step}</li>
                       ))}
                     </ol>
                   </div>
                 )}
               </div>
             </div>
             <div className="p-4 border-t border-gray-100 flex justify-end">
               <button 
                 onMouseDown={() => {
                   onSelect(detailItem);
                   setDetailItem(null);
                   setValue('');
                   setShowDropdown(false);
                 }}
                 className="bg-[#1677ff] hover:bg-[#4096ff] text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors"
               >
                 选用此动作
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
