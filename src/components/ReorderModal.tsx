import React, { useState, useEffect } from 'react';
import { PlanItem, PlanSection } from '../types';
import { useAppData } from '../store';
import { Minus, Menu, Folder } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PlanItem[];
  setItems: (items: PlanItem[]) => void;
  sections?: PlanSection[];
  onReorderComplete?: (newItems: PlanItem[], newSections: PlanSection[]) => void;
}

type FlatItem = 
  | { type: 'section', id: string, title: string }
  | { type: 'exercise', id: string, item: PlanItem };

interface ReorderItemProps {
  entry: FlatItem;
  getExercise: (id: string) => any;
  onRemove: (id: string) => void;
  key?: React.Key;
}

function ReorderItem({ entry, getExercise, onRemove }: ReorderItemProps) {
  const controls = useDragControls();

  if (entry.type === 'section') {
    return (
      <Reorder.Item 
        value={entry}
        dragListener={false}
        dragControls={controls}
        className="flex items-center justify-between bg-gray-50/80 w-full py-3 px-4 rounded-lg my-2 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center space-x-3 flex-1 select-none">
          <Folder className="w-5 h-5 text-gray-400" />
          <span className="font-bold text-gray-900">{entry.title}</span>
        </div>
        <div 
          className="cursor-grab active:cursor-grabbing px-2 py-1 touch-none"
          onPointerDown={(e) => controls.start(e)}
        >
          <Menu className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        </div>
      </Reorder.Item>
    );
  }

  const ex = getExercise(entry.item.exerciseId);
  return (
    <Reorder.Item 
      value={entry}
      dragListener={false}
      dragControls={controls}
      className="flex items-center justify-between bg-white w-full py-2 border-b border-gray-50"
    >
      <div className="flex items-center space-x-4 flex-1 select-none">
        <button 
          onClick={() => onRemove(entry.id)}
          className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-90 transition-transform"
        >
          <Minus className="w-4 h-4" strokeWidth={3} />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100 overflow-hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/>
          </svg>
        </div>
        
        <div className="text-base font-normal text-gray-900 flex-1 py-4 pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
          {ex?.name || '未知动作'}
        </div>
      </div>
      
      <div 
        className="px-3 py-4 shrink-0 flex items-center cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => controls.start(e)}
      >
         <Menu className="w-6 h-6 text-gray-300 hover:text-gray-400 transition-colors" strokeWidth={1.5} />
      </div>
    </Reorder.Item>
  );
}

export default function ReorderModal({ isOpen, onClose, items, setItems, sections = [], onReorderComplete }: ReorderModalProps) {
  const { getExercise } = useAppData();
  const [flatList, setFlatList] = useState<FlatItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const list: FlatItem[] = [];
      items.filter(i => !i.sectionId).forEach(i => list.push({ type: 'exercise', id: i.id, item: i }));
      sections.forEach(s => {
        list.push({ type: 'section', id: s.id, title: s.title });
        items.filter(i => i.sectionId === s.id).forEach(i => list.push({ type: 'exercise', id: i.id, item: i }));
      });
      setFlatList(list);
    }
  }, [isOpen, items, sections]);

  const handleReorder = (newList: FlatItem[]) => {
    setFlatList(newList);
  };

  const handleDone = () => {
    const newItems: PlanItem[] = [];
    const newSections: PlanSection[] = [];
    let currentSectionId: string | undefined = undefined;

    flatList.forEach((entry) => {
      if (entry.type === 'section') {
        currentSectionId = entry.id;
        newSections.push({ id: entry.id, title: entry.title });
      } else {
        newItems.push({
          ...entry.item,
          sectionId: currentSectionId
        });
      }
    });

    onReorderComplete?.(newItems, newSections);
    onClose();
  };

  const handleRemove = (id: string) => {
    setFlatList(prev => prev.filter(e => e.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-10 pb-4 shrink-0 bg-white border-b border-gray-100">
        <button onClick={onClose} className="text-gray-400 text-sm font-bold">取消</button>
        <h2 className="text-lg font-black text-gray-900 tracking-tight">排序与管理</h2>
        <div className="w-10"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 bg-gray-50/30">
        <Reorder.Group axis="y" values={flatList} onReorder={handleReorder} className="space-y-0 pt-2 pb-32">
          {flatList.map((entry) => (
            <ReorderItem 
              key={entry.id} 
              entry={entry} 
              getExercise={getExercise} 
              onRemove={handleRemove}
            />
          ))}
        </Reorder.Group>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 pb-safe z-20">
        <button 
          onClick={handleDone}
          className="w-full py-4 bg-blue-500 text-white text-lg font-black rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
        >
          保存更改
        </button>
      </div>
    </div>
  );
}
