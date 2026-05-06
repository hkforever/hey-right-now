import { useState } from 'react';
import { useAppData, useAppStore } from '../store';
import { X, Search, Check, Plus, Pencil, Trash2, Menu } from 'lucide-react';
import CustomExerciseForm from './CustomExerciseForm';
import CloudMedia from './CloudMedia';
import { Reorder } from 'motion/react';

export default function ExerciseSelector({ onClose, onAdd }: { onClose: () => void, onAdd: (ids: string[]) => void }) {
  const { allExercises } = useAppData();
  const { equipments, addEquipment, updateEquipment, deleteEquipment, setEquipments, muscles, addMuscle, updateMuscle, deleteMuscle, setMuscles } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  
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

  const equipmentMap: Record<string, string> = {
    '杠铃': 'Barbell',
    '哑铃': 'Dumbbell',
    '徒手': 'Bodyweight',
    '杠铃片': 'Plates',
    '壶铃': 'Kettlebell',
    '器械': 'Machine',
    '悬挂带': 'Suspension',
    '阻力带': 'Bands',
    '其他': 'Other'
  };

  const muscleMap: Record<string, string> = {
    'Chest': '胸部',
    'Back': '背部',
    'Legs': '腿部',
    'Shoulders': '肩部',
    'Core': '核心',
    'Arms': '手臂',
    'Other': '其他',
    '背阔肌': 'Back',
    '二头肌': 'Biceps',
    '腹肌': 'Core',
    '股四头肌': 'Legs',
    '腘绳肌': 'Legs',
    '肩部': 'Shoulders',
    '胸部': 'Chest',
    // We add these for reverse mapping during filter
    'Barbell': '杠铃',
    'Dumbbell': '哑铃',
    'Bodyweight': '徒手'
  };

  const filtered = allExercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesEquipment = equipmentFilter === '所有设备' || e.equipment === equipmentMap[equipmentFilter] || e.equipment === equipmentFilter;
    
    // Muscle filtering needs to check both English and Chinese names
    const currentMuscles = [e.primaryMuscle, ...e.secondaryMuscles];
    const matchesMuscle = muscleFilter === '所有肌肉' || 
                         currentMuscles.some(m => m === muscleFilter || muscleMap[m] === muscleFilter || (Object.keys(muscleMap).find(k => muscleMap[k] === muscleFilter) === m));
    
    return matchesSearch && matchesEquipment && matchesMuscle;
  });

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
          创建 {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
      </header>

      <div className="p-4 shrink-0 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索运动"
            className="w-full bg-gray-100 text-gray-900 rounded-lg pl-10 pr-4 py-2 outline-none placeholder-gray-500 transition-colors font-medium text-sm focus:bg-gray-200"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => setIsEquipmentMenuOpen(true)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors border ${equipmentFilter !== '所有设备' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`}
          >
            {equipmentFilter}
          </button>
          <button 
            onClick={() => setIsMuscleMenuOpen(true)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors border ${muscleFilter !== '所有肌肉' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`}
          >
            {muscleFilter}
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-0 py-2">
        <div className="px-4 pb-2">
          <button 
            onClick={() => setIsCreatingCustom(true)}
            className="w-full py-3 bg-gray-50 text-blue-500 rounded-xl font-bold border border-gray-100 active:bg-gray-100 transition-colors"
          >
            + 创建自定义运动
          </button>
        </div>
        {filtered.length > 0 ? (
          <>
            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">最近的训练</div>
            {filtered.map(ex => (
              <button 
                key={ex.id}
                onClick={() => toggleSelect(ex.id)}
                className="w-full text-left px-4 py-3 flex justify-between items-center bg-white border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                    {ex.media ? (
                      <CloudMedia src={ex.media} alt={ex.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-gray-400"><path d="M6.5 6.5v11M17.5 6.5v11M4 9h5M15 9h5M4 15h5M15 15h5M9 12h6"/></svg>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 text-base">{ex.name}</span>
                      {(ex.videoUrl || (ex.videos && ex.videos.length > 0)) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="包含演示视频" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-0.5">{muscleMap[ex.primaryMuscle] || ex.primaryMuscle || '其他'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                   {selectedIds.has(ex.id) ? (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                   ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                   )}
                </div>
              </button>
            ))}
          </>
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
              <div className="p-2 space-y-1">
                {!isEditingEquipments && (
                   <button
                    onClick={() => {
                      setEquipmentFilter('所有设备');
                      setIsEquipmentMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl"
                  >
                    <span className={`text-base font-semibold ${equipmentFilter === '所有设备' ? 'text-blue-500' : 'text-gray-700'}`}>
                      所有设备
                    </span>
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
                  equipments.map((eq) => (
                    <div key={eq} className="relative group">
                      <div className="flex items-center w-full">
                        <button
                          onClick={() => {
                            setEquipmentFilter(eq);
                            setIsEquipmentMenuOpen(false);
                          }}
                          className="flex-1 text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl cursor-pointer"
                        >
                          <span className={`text-base font-semibold ${equipmentFilter === eq ? 'text-blue-500' : 'text-gray-700'}`}>
                            {eq}
                          </span>
                          {equipmentFilter === eq && <Check className="w-5 h-5 text-blue-500" />}
                        </button>
                      </div>
                    </div>
                  ))
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
              <div className="p-2 space-y-1">
                {!isEditingMuscles && (
                   <button
                    onClick={() => {
                      setMuscleFilter('所有肌肉');
                      setIsMuscleMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl"
                  >
                    <span className={`text-base font-semibold ${muscleFilter === '所有肌肉' ? 'text-blue-500' : 'text-gray-700'}`}>
                      所有肌肉
                    </span>
                    {muscleFilter === '所有肌肉' && <Check className="w-5 h-5 text-blue-500" />}
                  </button>
                )}

                {isEditingMuscles ? (
                  <Reorder.Group axis="y" values={muscles} onReorder={setMuscles} as="div" className="w-full space-y-0.5">
                    {muscles.map((ms) => (
                      <Reorder.Item key={ms} value={ms} className="relative group bg-white touch-none">
                        {editingMsOldName === ms ? (
                          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-xl mx-1 border border-blue-200">
                            <input 
                              autoFocus
                              value={editingMsNewValue}
                              onChange={e => setEditingMsNewValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEditMs(ms)}
                              className="flex-1 bg-transparent outline-none text-base font-medium py-1 px-1"
                            />
                            <button onClick={() => handleSaveEditMs(ms)} className="text-blue-500 p-1"><Check className="w-5 h-5" /></button>
                            <button onClick={() => setEditingMsOldName(null)} className="text-gray-400 p-1"><X className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center w-full">
                            <div className="flex-1 text-left px-4 py-3.5 flex items-center justify-between rounded-xl cursor-default">
                              <span className="text-base font-semibold text-gray-900">
                                {ms}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 pr-2">
                               <button 
                                onClick={() => {
                                  setEditingMsOldName(ms);
                                  setEditingMsNewValue(ms);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                               <button 
                                onClick={() => deleteMuscle(ms)}
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
                  muscles.map((ms) => (
                    <div key={ms} className="relative group">
                      <div className="flex items-center w-full">
                        <button
                          onClick={() => {
                            setMuscleFilter(ms);
                            setIsMuscleMenuOpen(false);
                          }}
                          className="flex-1 text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl cursor-pointer"
                        >
                          <span className={`text-base font-semibold ${muscleFilter === ms ? 'text-blue-500' : 'text-gray-700'}`}>
                            {ms}
                          </span>
                          {muscleFilter === ms && <Check className="w-5 h-5 text-blue-500" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {isEditingMuscles && (
                <div className="px-4 mt-2">
                   <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1 transition-all focus-within:bg-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20">
                    <input 
                      placeholder="添加新部位..."
                      value={newMuscleName}
                      onChange={e => setNewMuscleName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMuscle()}
                      className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm font-medium"
                    />
                    <button 
                      onClick={handleAddMuscle}
                      disabled={!newMuscleName.trim()}
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
    </div>
  );
}
