import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppData, useAppStore } from '../store';
import { X, Search, Check, Plus, Pencil, Trash2, Menu, ChevronDown, User } from 'lucide-react';
import CustomExerciseForm from './CustomExerciseForm';
import CloudMedia from './CloudMedia';
import ExerciseDetailModal from './ExerciseDetailModal';
import { muscleMapping, MUSCLE_HIERARCHY } from '../lib/muscle-utils';
import { Reorder } from 'motion/react';
import { Exercise } from '../types';

export default function ExerciseSelector({ onClose, onAdd }: { onClose: () => void, onAdd: (ids: string[]) => void }) {
  const { allExercises, getExercise } = useAppData();
  const { 
    equipments, addEquipment, updateEquipment, deleteEquipment, setEquipments, 
    muscles, addMuscle, updateMuscle, deleteMuscle, setMuscles,
    history
  } = useAppStore();
  
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  
  const [equipmentFilter, setEquipmentFilter] = useState('所有设备');
  const [isEquipmentMenuOpen, setIsEquipmentMenuOpen] = useState(false);
  const [isEditingEquipments, setIsEditingEquipments] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [editingEqOldName, setEditingEqOldName] = useState<string | null>(null);
  const [editingEqNewValue, setEditingEqNewValue] = useState('');

  const [muscleFilter, setMuscleFilter] = useState('所有肌肉');
  const [isMuscleMenuOpen, setIsMuscleMenuOpen] = useState(false);
  const [isEditingMuscles, setIsEditingMuscles] = useState(false);
  const [newMuscleName, setNewMuscleName] = useState('');
  const [editingMsOldName, setEditingMsOldName] = useState<string | null>(null);
  const [editingMsNewValue, setEditingMsNewValue] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('所有运动');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Pagination states
  const [recentLimit, setRecentLimit] = useState(10);
  const [allDisplayLimit, setAllDisplayLimit] = useState(20);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const EQUIPMENT_STRUCTURE = [
    {
      group: '自重/辅助',
      items: ['自重', '辅助器体', '单杠', '双杠']
    },
    {
      group: '自由重量',
      items: ['哑铃', '杠铃', '壶铃', '曲杠']
    },
    {
      group: '大型器械',
      items: ['绳索器械', '史密斯机', '哈克深蹲机', '倒蹬机', '腿屈伸机', '龙门架', '器械']
    },
    {
      group: '小项/配件',
      items: ['弹力带', '医药球', '瑜伽球', '跳绳', '核心盘', 'TRX', '瑜伽垫']
    },
    {
      group: '其他',
      items: ['其他']
    }
  ];

  // 映射关系用以匹配英文原始数据
  const RAW_MAP: Record<string, string[]> = {
    '自重': ['body weight', 'assisted'],
    '辅助器体': ['assisted'],
    '哑铃': ['dumbbell'],
    '杠铃': ['barbell'],
    '壶铃': ['kettlebell'],
    '绳索器械': ['cable', 'machine'],
    '缆绳': ['cable'],
    '史密斯机': ['smith machine'],
    '器械': ['machine'],
    '弹力带': ['band'],
    '医药球': ['medicine ball'],
    '瑜伽球': ['stability ball'],
  };

  const equipmentMap: Record<string, string[]> = {
    '所有设备': [],
    '自重/辅助': ['自重', '辅助', 'body weight', 'assisted', 'pull up bar', 'dip station'],
    '自由重量': ['杠铃', '哑铃', '壶铃', 'barbell', 'dumbbell', 'kettlebell', 'curls'],
    '大型器械': ['器械', '缆绳', '绳索', '史密斯机', 'machine', 'cable', 'smith machine'],
    '小项/配件': ['弹力带', '医药球', '瑜伽球', '跳绳', 'band', 'medicine ball', 'stability ball', 'rope'],
    '其他': ['other', '其他']
  };

  // 精确匹配单个器械
  const getMatchKeywords = (filter: string) => {
    if (equipmentMap[filter]) return equipmentMap[filter];
    if (RAW_MAP[filter]) return RAW_MAP[filter].concat(filter);
    return [filter];
  };

  // --- Filter Helpers ---
  const matchesEq = (e: Exercise, filter: string) => {
    if (filter === '所有设备') return true;
    const exEq = (e.equipment || '').toLowerCase();
    const keywords = getMatchKeywords(filter);
    return keywords.some(k => exEq.includes(k.toLowerCase())) || e.equipment === filter;
  };

  const matchesMs = (e: Exercise, filter: string) => {
    if (filter === '所有肌肉') return true;
    // 优先匹配主肌肉以提供更直观的联动筛选
    const isGroupFilter = MUSCLE_HIERARCHY.find(g => g.name === filter);
    if (isGroupFilter) {
      const groupMuscles = isGroupFilter.muscles.map(m => m.name);
      return groupMuscles.includes(e.primaryMuscle);
    }
    return e.primaryMuscle === filter;
  };

  const matchesCat = (e: Exercise, filter: string) => {
    if (filter === '所有运动') return true;
    const cat = e.category || '其他';
    const isMatched = (c: string, f: string) => {
      if (c === f) return true;
      if (f === '心肺训练' && (c === '有氧训练' || c === '心肺训练')) return true;
      if (f === '柔韧训练' && (c === '拉伸训练' || c === '柔韧训练' || c === '放松训练')) return true;
      if (f === '手臂训练' && (c === '手臂训练' || c === '前臂训练')) return true;
      if (f === '腿部训练' && (c === '腿部训练' || c === '小腿训练' || c === '臀部训练')) return true;
      return false;
    };
    return isMatched(cat, filter);
  };

  // --- Dynamic Pool Calculation (Linked Filtering) ---
  const poolForEquipment = useMemo(() => {
    return allExercises.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesMuscle = matchesMs(e, muscleFilter);
      const matchesCategory = matchesCat(e, categoryFilter);
      return matchesSearch && matchesMuscle && matchesCategory;
    });
  }, [allExercises, search, muscleFilter, categoryFilter]);

  const poolForMuscle = useMemo(() => {
    return allExercises.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesEquipment = matchesEq(e, equipmentFilter);
      const matchesCategory = matchesCat(e, categoryFilter);
      return matchesSearch && matchesEquipment && matchesCategory;
    });
  }, [allExercises, search, equipmentFilter, categoryFilter]);

  const poolForCategory = useMemo(() => {
    return allExercises.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesEquipment = matchesEq(e, equipmentFilter);
      const matchesMuscle = matchesMs(e, muscleFilter);
      return matchesSearch && matchesEquipment && matchesMuscle;
    });
  }, [allExercises, search, equipmentFilter, muscleFilter]);

  // --- Visibility Checkers ---
  const isEquipmentVisible = (f: string) => {
    if (f === '所有设备') return true;
    return poolForEquipment.some(e => matchesEq(e, f));
  };

  const isMuscleVisible = (f: string) => {
    if (f === '所有肌肉') return true;
    return poolForMuscle.some(e => matchesMs(e, f));
  };

  const isCategoryVisible = (f: string) => {
    if (f === '所有运动') return true;
    return poolForCategory.some(e => matchesCat(e, f));
  };

  // --- Count Calculators ---
  const getEquipmentCount = (f: string) => {
    if (f === '所有设备') return poolForEquipment.length;
    return poolForEquipment.filter(e => matchesEq(e, f)).length;
  };

  const getMuscleCount = (f: string) => {
    if (f === '所有肌肉') return poolForMuscle.length;
    return poolForMuscle.filter(e => matchesMs(e, f)).length;
  };

  const getCategoryCount = (f: string) => {
    if (f === '所有运动') return poolForCategory.length;
    return poolForCategory.filter(e => matchesCat(e, f)).length;
  };

  // Final result list filtered by all 4 facets
  const baseFiltered = useMemo(() => {
    return allExercises.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesEquipment = matchesEq(e, equipmentFilter);
      const matchesMuscle = matchesMs(e, muscleFilter);
      const matchesCategory = matchesCat(e, categoryFilter);
      return matchesSearch && matchesEquipment && matchesMuscle && matchesCategory;
    });
  }, [allExercises, search, equipmentFilter, muscleFilter, categoryFilter]);

  // Dynamic counts for Category Filter
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    poolForCategory.forEach(e => {
      let cat = e.category || '其他';
      if (cat === '有氧训练' || cat === '心肺训练') cat = '心肺训练';
      else if (cat === '拉伸训练' || cat === '柔韧训练' || cat === '放松训练') cat = '柔韧训练';
      else if (cat === '前臂训练') cat = '手臂训练';
      else if (cat === '小腿训练' || cat === '臀部训练') cat = '腿部训练';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [poolForCategory]);

  const categories = useMemo(() => {
    // These are the canonical display categories we want
    const canonicalOrder = [
      '核心训练', 
      '胸部训练', 
      '背部训练', 
      '肩部训练', 
      '手臂训练', 
      '腿部训练', 
      '腰部训练', 
      '心肺训练',
      '柔韧训练',
      '其他'
    ];

    // Get all unique categories that exist in our data
    const existingCategories = Array.from(new Set(allExercises.map(ex => ex.category).filter(Boolean))) as string[];
    
    // Map them to our canonical ones for the filter list
    const mappedCategories = new Set<string>();
    existingCategories.forEach(c => {
      if (c === '有氧训练' || c === '心肺训练') mappedCategories.add('心肺训练');
      else if (c === '拉伸训练' || c === '柔韧训练' || c === '放松训练') mappedCategories.add('柔韧训练');
      else if (c === '前臂训练') mappedCategories.add('手臂训练');
      else if (c === '小腿训练' || c === '臀部训练') mappedCategories.add('腿部训练');
      else if (canonicalOrder.includes(c)) mappedCategories.add(c);
      else mappedCategories.add('其他');
    });

    const displayList = Array.from(mappedCategories).sort((a, b) => {
      const indexA = canonicalOrder.indexOf(a);
      const indexB = canonicalOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return ['所有运动', ...displayList];
  }, [allExercises]);

  const sortedEquipments = useMemo(() => {
    const equipmentOrder = [
      '自重', '哑铃', '杠铃', '缆绳', '壶铃', '弹力带', '史密斯机', '器械', '单杠', '双杠', '医药球', '瑜伽球', '其他'
    ];
    return ['所有设备', ...[...equipments].sort((a, b) => {
      const indexA = equipmentOrder.indexOf(a);
      const indexB = equipmentOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    })];
  }, [equipments]);

  const muscleHierarchy = useMemo(() => {
    return [
      {
        name: '所有肌肉',
        muscles: ['所有肌肉']
      },
      ...MUSCLE_HIERARCHY.map(group => ({
        name: group.name,
        muscles: group.muscles.map(m => m.name)
      }))
    ];
  }, []);

  const sortedMuscles = useMemo(() => {
    return ['所有肌肉', ...MUSCLE_HIERARCHY.flatMap(group => group.muscles.map(m => m.name))];
  }, []);

  // Section 1: Recent Workouts (Last 50 logs)
  const recentExercises = useMemo(() => {
    const recentLogs = history.slice(0, 50);
    const exerciseIds = new Set<string>();
    const orderedIds: string[] = [];

    recentLogs.forEach(log => {
      log.items.forEach(item => {
        if (!exerciseIds.has(item.exerciseId)) {
          exerciseIds.add(item.exerciseId);
          orderedIds.push(item.exerciseId);
        }
      });
    });

    // Match with current filtered set to respect filters
    return orderedIds
      .map(id => getExercise(id))
      .filter((ex): ex is Exercise => !!ex && baseFiltered.some(b => b.id === ex.id));
  }, [history, baseFiltered]);

  // Section 2: All Exercises (Sorted by Chinese Pinyin)
  const allExercisesSorted = useMemo(() => {
    const list = [...baseFiltered];
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      return list.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStart = aName.startsWith(s);
        const bStart = bName.startsWith(s);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [baseFiltered, search]);

  const isSearching = search.trim() !== '' || categoryFilter !== '所有运动' || muscleFilter !== '所有肌肉' || equipmentFilter !== '所有设备';

  // Infinite scroll logic for "All Exercises"
  useEffect(() => {
    // Reset display limit and scroll to top when filters/search change
    setAllDisplayLimit(isSearching ? 500 : 100);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [search, categoryFilter, muscleFilter, equipmentFilter, isSearching]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || isSearching) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        setAllDisplayLimit(prev => Math.min(prev + 100, allExercisesSorted.length));
      }
    };

    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [allExercisesSorted.length]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAddEquipment = () => {
    if (newEquipmentName.trim()) {
      addEquipment(newEquipmentName.trim());
      setNewEquipmentName('');
    }
  };

  const handleSaveEditEq = (oldName: string) => {
    if (editingEqNewValue.trim()) {
      updateEquipment(oldName, editingEqNewValue.trim());
      if (equipmentFilter === oldName) setEquipmentFilter(editingEqNewValue.trim());
      setEditingEqOldName(null);
    }
  };

  const handleAddMuscle = () => {
    if (newMuscleName.trim()) {
      addMuscle(newMuscleName.trim());
      setNewMuscleName('');
    }
  };

  const handleSaveEditMs = (oldName: string) => {
    if (editingMsNewValue.trim()) {
      updateMuscle(oldName, editingMsNewValue.trim());
      if (muscleFilter === oldName) setMuscleFilter(editingMsNewValue.trim());
      setEditingMsOldName(null);
    }
  };

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    // Escape special regex characters
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-blue-100 text-blue-700 font-bold rounded-sm px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const renderExerciseItem = (ex: typeof baseFiltered[0]) => (
    <div 
      key={ex.id}
      className="w-full text-left px-4 py-3 flex justify-between items-center bg-white border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors group"
    >
      <div 
        className="flex items-center space-x-4 flex-1 cursor-pointer"
        onClick={() => setDetailExercise(ex)}
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
            {ex.media ? (
              <CloudMedia src={ex.media} alt={ex.name} className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-400"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
            )}
          </div>
          {ex.isCustom && !ex.isStandardOverride && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10" title="自定义动作">
              <User className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 text-base">
              <HighlightText text={ex.name} highlight={search} />
            </span>
          </div>
          <span className="text-xs text-gray-500 mt-0.5">
            <HighlightText text={ex.primaryMuscle || '其他'} highlight={search} />
          </span>
        </div>
      </div>
      <div className="flex items-center">
         <button 
           onClick={(e) => {
             e.stopPropagation();
             toggleSelect(ex.id);
           }}
           className="flex items-center justify-center p-2"
         >
           {selectedIds.has(ex.id) ? (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                <Check className="w-4 h-4 text-white" />
              </div>
           ) : (
              <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
           )}
         </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col font-sans">
      <header className="h-14 border-b border-gray-200 px-4 flex items-center justify-between shrink-0 bg-white">
        <button onClick={onClose} className="text-blue-500 text-base font-normal">
          取消
        </button>
        <span className="font-medium text-base text-gray-900">添加运动</span>
        <button 
          onClick={() => onAdd(Array.from(selectedIds))}
          disabled={selectedIds.size === 0}
          className="text-blue-500 text-base font-normal disabled:text-blue-300 transition-colors"
        >
          选择 {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
      </header>

      <div className="p-4 shrink-0 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索运动"
            className="w-full bg-gray-100 text-gray-900 rounded-lg pl-10 pr-4 py-2 outline-none placeholder-gray-500 transition-colors font-medium text-sm focus:bg-gray-200"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => setIsCategoryMenuOpen(true)}
            className={`flex-1 text-sm py-2 px-2 rounded-lg font-medium transition-colors border flex items-center justify-between gap-1 ${categoryFilter !== '所有运动' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`}
          >
            <span className="truncate">{categoryFilter}</span>
            {categoryFilter !== '所有运动' && (
              <span 
                onClick={(e) => { e.stopPropagation(); setCategoryFilter('所有运动'); }}
                className="p-2 -mr-1 hover:bg-blue-100 active:bg-blue-200 active:scale-90 rounded-full transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsMuscleMenuOpen(true)}
            className={`flex-1 text-sm py-2 px-2 rounded-lg font-medium transition-colors border flex items-center justify-between gap-1 ${muscleFilter !== '所有肌肉' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`}
          >
            <span className="truncate">{muscleFilter}</span>
            {muscleFilter !== '所有肌肉' && (
              <span 
                onClick={(e) => { e.stopPropagation(); setMuscleFilter('所有肌肉'); }}
                className="p-2 -mr-1 hover:bg-blue-100 active:bg-blue-200 active:scale-90 rounded-full transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsEquipmentMenuOpen(true)}
            className={`flex-1 text-sm py-2 px-2 rounded-lg font-medium transition-colors border flex items-center justify-between gap-1 ${equipmentFilter !== '所有设备' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`}
          >
            <span className="truncate">{equipmentFilter}</span>
            {equipmentFilter !== '所有设备' && (
              <span 
                onClick={(e) => { e.stopPropagation(); setEquipmentFilter('所有设备'); }}
                className="p-2 -mr-1 hover:bg-blue-100 active:bg-blue-200 active:scale-90 rounded-full transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </div>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto px-0 py-2">
        {!isSearching && (
          <div className="px-4 pb-2">
            <button 
              onClick={() => setIsCreatingCustom(true)}
              className="w-full py-3 bg-gray-50 text-blue-500 rounded-xl font-bold border border-gray-100 active:bg-gray-100 transition-colors"
            >
              + 创建自定义运动
            </button>
          </div>
        )}

        {baseFiltered.length > 0 ? (
          <div className="space-y-6">
            {/* 1. Recent Workouts - Only show when NOT searching */}
            {!isSearching && recentExercises.length > 0 && (
              <section>
                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">近期的训练</div>
                <div>{recentExercises.slice(0, recentLimit).map(renderExerciseItem)}</div>
                {recentExercises.length > recentLimit && (
                  <button 
                    onClick={() => setRecentLimit(prev => prev + 10)}
                    className="w-full py-3 text-sm text-blue-500 font-medium hover:bg-blue-50 transition-colors border-t border-gray-50 flex items-center justify-center gap-1"
                  >
                    加载更多近期的训练 <ChevronDown className="w-4 h-4" />
                  </button>
                )}
              </section>
            )}

            <section>
              <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                {isSearching ? '搜索结果' : '所有训练'}
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                  {baseFiltered.length}
                </span>
              </div>
              <div>{allExercisesSorted.slice(0, allDisplayLimit).map(renderExerciseItem)}</div>
              {allExercisesSorted.length > allDisplayLimit && (
                <div className="py-8 text-center text-xs text-gray-400">正在加载更多...</div>
              )}
            </section>
          </div>
        ) : (
          <div className="text-center py-12 px-4 space-y-4">
            <p className="text-sm text-gray-500">未找到相关运动</p>
            <button 
              onClick={() => setIsCreatingCustom(true)}
              className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold inline-flex items-center space-x-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span>{search ? `创建 "${search}"` : '创建自定义运动'}</span>
            </button>
          </div>
        )}
      </main>

      {/* Equipment Selector Modal */}
      {isEquipmentMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 transition-opacity">
          <div 
            className="fixed inset-0" 
            onClick={() => {
              setIsEquipmentMenuOpen(false);
              setIsEditingEquipments(false);
              setEditingEqOldName(null);
            }}
          />
          <div 
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden max-h-[85vh] flex flex-col relative transition-transform transform"
            onClick={e => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 text-lg">选择设备</span>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setIsEditingEquipments(!isEditingEquipments);
                    setEditingEqOldName(null);
                  }}
                  className={`text-sm font-bold ${isEditingEquipments ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {isEditingEquipments ? '完成' : '编辑'}
                </button>
                <button onClick={() => setIsEquipmentMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto pb-4">
              <div className="p-2 space-y-4">
                {!isEditingEquipments && (
                   <button
                    onClick={() => {
                      setEquipmentFilter('所有设备');
                      setIsEquipmentMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${equipmentFilter === '所有设备' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-700'}`}
                  >
                    <span className="text-base font-bold">所有设备</span>
                    {equipmentFilter === '所有设备' && <Check className="w-5 h-5 text-blue-500" />}
                  </button>
                )}

                {isEditingEquipments ? (
                  <Reorder.Group axis="y" values={equipments} onReorder={setEquipments} as="div" className="w-full space-y-0.5">
                    {equipments.map((eq) => (
                      <Reorder.Item key={eq} value={eq} className="relative group bg-white touch-none">
                        {editingEqOldName === eq ? (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-xl mx-1 border border-blue-200">
                            <input 
                              autoFocus
                              value={editingEqNewValue}
                              onChange={e => setEditingEqNewValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEditEq(eq)}
                              className="flex-1 bg-transparent outline-none text-base font-medium py-1 px-1"
                            />
                            <button onClick={() => handleSaveEditEq(eq)} className="text-blue-500 p-1"><Check className="w-5 h-5" /></button>
                            <button onClick={() => setEditingEqOldName(null)} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center w-full">
                            <div className="flex-1 text-left px-4 py-3.5 flex items-center justify-between rounded-xl cursor-default">
                              <span className="text-base font-semibold text-gray-900">
                                {eq}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 pr-2">
                               <button 
                                onClick={() => {
                                  setEditingEqOldName(eq);
                                  setEditingEqNewValue(eq);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                               <button 
                                onClick={() => deleteEquipment(eq)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="p-2 text-gray-300 cursor-grab active:cursor-grabbing touch-none">
                                <Menu className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="w-full space-y-4">
                    {EQUIPMENT_STRUCTURE.map((group) => {
                      const visibleItems = group.items.filter(isEquipmentVisible);
                      const isSelected = equipmentFilter === group.group;
                      
                      // 只有当组本身可见或组内有可见项时才显示
                      const groupVisible = isEquipmentVisible(group.group) || visibleItems.length > 0;
                      if (!groupVisible && group.group !== equipmentFilter) return null;

                      return (
                        <div key={group.group} className="space-y-1">
                          <div className={`px-4 py-2 rounded-lg flex items-center justify-between mx-1 ${isSelected ? 'bg-blue-50/50' : 'bg-gray-50/50'}`}>
                            <button 
                              onClick={() => {
                                setEquipmentFilter(group.group);
                                setIsEquipmentMenuOpen(false);
                              }}
                              className={`flex-1 text-left text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                              {group.group}
                            </button>
                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="grid grid-cols-2 gap-2 px-1">
                            {visibleItems.map((item) => {
                              const count = getEquipmentCount(item);
                              const isItemActive = equipmentFilter === item;
                              return (
                                <button 
                                  key={item}
                                  onClick={() => {
                                    setEquipmentFilter(item);
                                    setIsEquipmentMenuOpen(false);
                                  }}
                                  className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                    isItemActive 
                                      ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                                      : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="truncate">{item}</span>
                                    {isItemActive && <Check className="w-3.5 h-3.5" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isEditingEquipments && (
                <div className="px-4 mt-2">
                   <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1 transition-all focus-within:bg-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20">
                    <input 
                      placeholder="添加新设备..."
                      value={newEquipmentName}
                      onChange={e => setNewEquipmentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddEquipment()}
                      className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm font-medium"
                    />
                    <button 
                      onClick={handleAddEquipment}
                      disabled={!newEquipmentName.trim()}
                      className="bg-blue-500 text-white p-2 rounded-lg shadow-sm disabled:opacity-50 transition-all active:scale-90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Muscle Selector Modal */}
      {isMuscleMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 transition-opacity">
          <div 
            className="fixed inset-0" 
            onClick={() => {
              setIsMuscleMenuOpen(false);
              setIsEditingMuscles(false);
              setEditingMsOldName(null);
            }}
          />
          <div 
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden max-h-[85vh] flex flex-col relative transition-transform transform"
            onClick={e => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 text-lg">选择肌肉</span>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setIsEditingMuscles(!isEditingMuscles);
                    setEditingMsOldName(null);
                  }}
                  className={`text-sm font-bold ${isEditingMuscles ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {isEditingMuscles ? '完成' : '编辑'}
                </button>
                <button onClick={() => setIsMuscleMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto pb-4">
              <div className="p-2 space-y-4">
                {/* 所有肌肉 选项 */}
                <button
                  onClick={() => {
                    setMuscleFilter('所有肌肉');
                    setIsMuscleMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${muscleFilter === '所有肌肉' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-700'}`}
                >
                  <span className="text-base font-bold">所有肌肉</span>
                  {muscleFilter === '所有肌肉' && <Check className="w-5 h-5 text-blue-500" />}
                </button>

                {MUSCLE_HIERARCHY.map((group) => {
                  const visibleItems = group.muscles.filter(m => isMuscleVisible(m.name));
                  const isSelected = muscleFilter === group.name;
                  const groupVisible = isMuscleVisible(group.name) || visibleItems.length > 0;
                  if (!groupVisible && muscleFilter !== group.name) return null;

                  return (
                    <div key={group.name} className="space-y-1">
                      <div className={`px-4 py-2 rounded-lg flex items-center justify-between mx-1 ${isSelected ? 'bg-blue-50/50' : 'bg-gray-50/50'}`}>
                        <button 
                          onClick={() => {
                            setMuscleFilter(group.name);
                            setIsMuscleMenuOpen(false);
                          }}
                          className={`flex-1 text-left text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          {group.name}
                        </button>
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2 px-1">
                        {visibleItems.map((ms) => {
                          const count = getMuscleCount(ms.name);
                          const isItemActive = muscleFilter === ms.name;
                          return (
                            <button
                              key={ms.name}
                              onClick={() => {
                                setMuscleFilter(ms.name);
                                setIsMuscleMenuOpen(false);
                              }}
                              className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                isItemActive 
                                  ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                                  : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">{ms.name}</span>
                                {isItemActive && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Selector Modal */}
      {isCategoryMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 transition-opacity">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsCategoryMenuOpen(false)}
          />
          <div 
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden max-h-[80vh] flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <span className="font-bold text-gray-900 text-lg">选择运动分类</span>
              <button onClick={() => setIsCategoryMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="overflow-y-auto pb-6 p-2 space-y-4">
              <button
                onClick={() => {
                  setCategoryFilter('所有运动');
                  setIsCategoryMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${categoryFilter === '所有运动' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-700'}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-base font-bold">所有运动</span>
                </div>
                {categoryFilter === '所有运动' && <Check className="w-5 h-5 text-blue-500" />}
              </button>

              <div className="space-y-1">
                {categories.map((cat) => {
                  if (cat === '所有运动') return null;
                  const count = getCategoryCount(cat);
                  if (!isCategoryVisible(cat) && cat !== categoryFilter) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setIsCategoryMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`text-base font-semibold ${categoryFilter === cat ? 'text-blue-500' : 'text-gray-700'}`}>
                          {cat}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">
                          {count}
                        </span>
                      </div>
                      {categoryFilter === cat && <Check className="w-5 h-5 text-blue-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingCustom && (
        <CustomExerciseForm 
          initialName={search}
          onClose={() => setIsCreatingCustom(false)}
          onSave={(id) => {
            toggleSelect(id);
            setIsCreatingCustom(false);
          }}
        />
      )}

      {detailExercise && (
        <ExerciseDetailModal 
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  );
}
