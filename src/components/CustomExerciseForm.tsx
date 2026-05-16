import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { X, Check, Image as ImageIcon, ChevronRight, Video, Plus, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Exercise, ExerciseType } from '../types';
import { uploadFile, isCloudBaseConfigured } from '../lib/cloudbase';
import CloudMedia from './CloudMedia';
import { MUSCLE_HIERARCHY } from '../lib/muscle-utils';
import { resizeImage } from '../lib/image-utils';

const EXERCISE_TYPES: { id: ExerciseType; label: string; example: string; badges: string[] }[] = [
  { id: 'weight_reps', label: '重量和次数', example: '卧推、哑铃弯举', badges: ['次', 'KG'] },
  { id: 'reps_only', label: '徒手训练次数', example: '引体向上、仰卧起坐、立卧撑', badges: ['次'] },
  { id: 'weighted_bodyweight', label: '负重徒手训练', example: '引体向上、双杠臂屈伸', badges: ['次', '+KG'] },
  { id: 'assisted_bodyweight', label: '辅助徒手训练', example: '辅助引体向上、辅助双杠臂屈伸', badges: ['次', '-KG'] },
  { id: 'time', label: '时长', example: '平板支撑、瑜伽、伸展运动', badges: ['时间'] },
  { id: 'time_weight', label: '持续时间与重量', example: '负重平板支撑、靠墙静蹲', badges: ['KG', '时间'] },
  { id: 'distance_time', label: '距离和时长', example: '跑步、骑自行车、划船', badges: ['时间', 'KM'] },
  { id: 'weight_distance', label: '重量和距离', example: '农夫走路、手提箱搬运', badges: ['KG', 'KM'] },
];

export default function CustomExerciseForm({ 
  initialName = '', 
  initialExercise = null,
  onClose,
  onSave 
}: { 
  initialName?: string, 
  initialExercise?: Exercise | null,
  onClose: () => void,
  onSave: (id: string) => void
}) {
  const { addCustomExercise, updateCustomExercise, equipments, muscles } = useAppStore();
  
  const reverseEqMap: Record<string, string> = {
    'Barbell': '杠铃', 'Dumbbell': '哑铃', 'Bodyweight': '徒手',
    'Plates': '杠铃片', 'Kettlebell': '壶铃', 'Machine': '器械',
    'Suspension': '悬挂带', 'Bands': '阻力带', 'Other': '其他'
  };

  const reverseMuscleMap: Record<string, string> = {
    'Chest': '胸部', 'Back': '背阔肌', 'Legs': '股四头肌', 'Shoulders': '肩部',
    'Core': '腹肌', 'Arms': '二头肌', 'Other': '其他', 'Biceps': '二头肌'
  };

  const [name, setName] = useState(initialExercise?.name || initialName);
  const [type, setType] = useState<ExerciseType | null>(initialExercise?.type || null);
  const [equipment, setEquipment] = useState<string | null>(reverseEqMap[initialExercise?.equipment || ''] || initialExercise?.equipment || null);
  const [primaryMuscle, setPrimaryMuscle] = useState<string | null>(reverseMuscleMap[initialExercise?.primaryMuscle || ''] || initialExercise?.primaryMuscle || null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>((initialExercise?.secondaryMuscles || []).map(m => reverseMuscleMap[m] || m));
  const [media, setMedia] = useState<string | null>(initialExercise?.media || null);
  const [videos, setVideos] = useState<{ url: string; title: string }[]>(
    initialExercise?.videos || 
    (initialExercise?.videoUrl ? [{ url: initialExercise.videoUrl, title: '演示视频' }] : [])
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<string | null>(initialExercise?.category || null);
  const [activeSheet, setActiveSheet] = useState<'type' | 'equipment' | 'primary' | 'secondary' | 'category' | null>(null);

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        // Resize image to 180x180 JPG
        const resizedBlob = await resizeImage(file, 180, 180);
        file = new File([resizedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });

        if (!isCloudBaseConfigured) {
          // Fallback to Base64 for local mode
          const reader = new FileReader();
          reader.onloadend = () => setMedia(reader.result as string);
          reader.readAsDataURL(file);
          return;
        }
        
        const path = `exercises/media/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        setMedia(url);
      } catch (err) {
        console.error('Process/Upload failed:', err);
        alert('处理或上传失败');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isCloudBaseConfigured) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideos(prev => [...prev, { url: reader.result as string, title: `本地视频 ${prev.length + 1}` }]);
        };
        reader.readAsDataURL(file);
        return;
      }

      setIsUploading(true);
      try {
        const path = `exercises/videos/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        setVideos(prev => [...prev, { url, title: `视频演示 ${prev.length + 1}` }]);
      } catch (err) {
        console.error('Video upload failed:', err);
        alert('视频上传失败');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const addVideoLink = () => {
    if (newLink.trim()) {
      setVideos(prev => [...prev, { url: newLink.trim(), title: `视频链接 ${prev.length + 1}` }]);
      setNewLink('');
      setIsAddingLink(false);
    }
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || !type || !equipment || !primaryMuscle) return;
    
    const newEx = {
      id: initialExercise?.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      type,
      category: category || '其他',
      equipment,
      primaryMuscle,
      secondaryMuscles,
      isCustom: true,
      media: media || undefined,
      videos: videos.length > 0 ? videos : undefined
    };
    
    setIsUploading(true); // Reuse isUploading as a general loading state for simplicity or add isSaving
    try {
      if (initialExercise) {
        await updateCustomExercise(newEx);
      } else {
        await addCustomExercise(newEx);
      }
      onSave(newEx.id);
    } catch (err) {
      console.error('Save exercise failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSecondaryMuscle = (m: string) => {
    if (secondaryMuscles.includes(m)) {
      setSecondaryMuscles(prev => prev.filter(x => x !== m));
    } else {
      setSecondaryMuscles(prev => [...prev, m]);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 flex flex-col font-sans">
      <header className="h-14 border-b border-gray-200 px-4 flex items-center justify-between shrink-0 bg-white">
        <button onClick={onClose} className="text-gray-700 p-1">
          <X className="w-6 h-6" />
        </button>
        <span className="font-bold text-base text-gray-900">创建运动</span>
        <button 
          onClick={handleSave}
          disabled={!name.trim() || !type || !equipment || !primaryMuscle || isUploading}
          className="text-blue-500 text-base font-bold disabled:text-blue-300 transition-colors"
        >
          {isUploading ? '上传中...' : '保存'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Media & Name */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center space-x-4">
            <div className="flex flex-col items-center space-y-2 shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-16 h-16 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden relative hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : media ? (
                  <CloudMedia src={media} alt="Exercise Media" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/40 text-[8px] text-white text-center py-0.5 font-bold uppercase tracking-wider backdrop-blur-sm">
                  {isUploading ? '上传中...' : '添加封面'}
                </div>
              </button>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">动作封面</span>
            </div>
            
            <input 
              type="file" 
              accept="image/*"
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleMediaUpload} 
            />
            
            <div className="flex-1">
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="动作名称"
                className="w-full text-xl font-bold text-gray-900 outline-none placeholder-gray-300 bg-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Videos List */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">演示视频 ({videos.length})</label>
               <div className="flex items-center space-x-2">
                 {isUploading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 bg-gray-50 text-gray-900 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 disabled:opacity-50"
                    title="上传视频"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsAddingLink(!isAddingLink)}
                    className={`p-2 rounded-lg transition-colors active:scale-95 ${isAddingLink ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}
                    title="添加链接"
                  >
                    <Plus className={`w-4 h-4 transition-transform ${isAddingLink ? 'rotate-45' : ''}`} />
                  </button>
               </div>
             </div>

             {isAddingLink && (
               <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                 <input 
                   type="text" 
                   value={newLink}
                   onChange={e => setNewLink(e.target.value)}
                   placeholder="粘贴视频链接..."
                   className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition-colors"
                   autoFocus
                   onKeyDown={e => e.key === 'Enter' && addVideoLink()}
                 />
                 <button 
                   onClick={addVideoLink}
                   className="px-4 bg-blue-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                 >
                   确定
                 </button>
               </div>
             )}

             <input 
               type="file" 
               accept="video/*"
               className="hidden" 
               ref={videoInputRef}
               onChange={handleVideoUpload}
             />

             {videos.length === 0 ? (
               <div className="py-4 border-2 border-dashed border-gray-50 rounded-xl flex flex-col items-center justify-center space-y-1">
                 <Video className="w-8 h-8 text-gray-100" />
                 <p className="text-[10px] text-gray-300 font-bold uppercase">暂无演示视频</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-2">
                 {videos.map((vid, idx) => (
                   <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group border border-transparent hover:border-gray-100">
                     <div className="flex items-center space-x-3 overflow-hidden">
                       <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                         {vid.url.startsWith('data:') ? <Video className="w-4 h-4 text-blue-500" /> : <LinkIcon className="w-4 h-4 text-blue-500" />}
                       </div>
                       <div className="flex flex-col min-w-0">
                         <span className="text-sm font-bold text-gray-900 truncate">{vid.title}</span>
                         <span className="text-[10px] text-gray-400 truncate">{vid.url}</span>
                       </div>
                     </div>
                     <button 
                       onClick={() => removeVideo(idx)}
                       className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col divide-y divide-gray-50">
            <button 
              onClick={() => setActiveSheet('type')}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-900 font-bold">运动类型</span>
                <span className={type ? "text-sm text-gray-500 mt-0.5" : "text-sm text-gray-400 mt-0.5 italic"}>
                  {type ? EXERCISE_TYPES.find(t => t.id === type)?.label : '请选择运动类型'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('equipment')}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-900 font-bold">器械</span>
                <span className={equipment ? "text-sm text-gray-500 mt-0.5" : "text-sm text-gray-400 mt-0.5 italic"}>
                  {equipment || '请选择器械'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('category')}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-900 font-bold">运动分类</span>
                <span className={category ? "text-sm text-gray-500 mt-0.5" : "text-sm text-gray-400 mt-0.5 italic"}>
                  {category || '请选择分类'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('primary')}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-900 font-bold">主要肌肉群</span>
                <span className={primaryMuscle ? "text-sm text-gray-500 mt-0.5" : "text-sm text-gray-400 mt-0.5 italic"}>
                  {primaryMuscle || '请选择主要肌肉群'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('secondary')}
              className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="text-gray-900 font-bold">其他肌肉</span>
                <span className="text-sm text-gray-500 mt-0.5">
                  {secondaryMuscles.length > 0 ? secondaryMuscles.join(', ') : '无'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </main>

      {/* Slide-over menus */}
      {activeSheet && (
        <div className="fixed inset-0 z-[80] bg-white flex flex-col font-sans transition-transform transform translate-y-0">
          <header className="h-14 border-b border-gray-100 px-4 flex items-center justify-between shrink-0">
            <button onClick={() => setActiveSheet(null)} className="text-gray-700 p-1 flex items-center space-x-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span className="text-sm font-medium">返回</span>
            </button>
            <span className="font-bold text-base text-gray-900 hidden sm:block">
              {activeSheet === 'type' ? '运动类型' : 
               activeSheet === 'equipment' ? '选择设备' : 
               activeSheet === 'category' ? '选择分类' :
               activeSheet === 'primary' ? '主要肌肉群' : '其他肌肉'}
            </span>
            <div className="w-10"></div> {/* Placeholder */}
          </header>

          <main className="flex-1 overflow-y-auto">
            {activeSheet === 'type' && (
              <div className="divide-y divide-gray-100">
                {EXERCISE_TYPES.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => { setType(t.id); setActiveSheet(null); }}
                    className="w-full text-left p-4 active:bg-gray-50 transition-colors group relative"
                  >
                    <div className="flex flex-col pr-8">
                       <span className={`text-base font-bold ${type === t.id ? 'text-blue-500' : 'text-gray-900'}`}>{t.label}</span>
                       <span className="text-sm text-gray-500 mt-1 block leading-relaxed line-clamp-2">示例：{t.example}</span>
                       <div className="flex items-center space-x-1.5 mt-2">
                         {t.badges.map(b => (
                           <span key={b} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold tracking-wider">{b}</span>
                         ))}
                       </div>
                    </div>
                    {type === t.id && <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />}
                  </button>
                ))}
              </div>
            )}

            {activeSheet === 'equipment' && (
               <div className="p-2 space-y-1">
                 {equipments.map(eq => (
                   <button 
                     key={eq}
                     onClick={() => { setEquipment(eq); setActiveSheet(null); }}
                     className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors rounded-xl"
                   >
                     <span className={`text-base font-bold ${equipment === eq ? 'text-blue-500' : 'text-gray-900'}`}>{eq}</span>
                     {equipment === eq && <Check className="w-5 h-5 text-blue-500" />}
                   </button>
                 ))}
               </div>
            )}

            {activeSheet === 'category' && (
               <div className="p-2 space-y-1">
                 {[
                   '核心训练', '胸部训练', '背部训练', '肩部训练', '手臂训练', 
                   '腿部训练', '腰部训练', '心肺训练', '柔韧训练', '其他'
                 ].map(c => (
                   <button 
                     key={c}
                     onClick={() => { setCategory(c); setActiveSheet(null); }}
                     className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors rounded-xl"
                   >
                     <span className={`text-base font-bold ${category === c ? 'text-blue-500' : 'text-gray-900'}`}>{c}</span>
                     {category === c && <Check className="w-5 h-5 text-blue-500" />}
                   </button>
                 ))}
               </div>
            )}

            {activeSheet === 'primary' && (
              <div className="p-2 space-y-4">
                {MUSCLE_HIERARCHY.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-widest">{group.name}</div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {group.muscles.map((ms) => (
                        <button
                          key={ms.name}
                          onClick={() => {
                            setPrimaryMuscle(ms.name);
                            if (secondaryMuscles.includes(ms.name)) {
                              setSecondaryMuscles(prev => prev.filter(x => x !== ms.name));
                            }
                            setActiveSheet(null);
                          }}
                          className={`text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${primaryMuscle === ms.name ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-transparent text-gray-700'}`}
                        >
                          <span className="text-sm font-semibold truncate">{ms.name}</span>
                          {primaryMuscle === ms.name && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSheet === 'secondary' && (
              <div className="p-2 space-y-4">
                {MUSCLE_HIERARCHY.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-widest">{group.name}</div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {group.muscles.filter(m => m.name !== primaryMuscle).map((ms) => {
                        const isSelected = secondaryMuscles.includes(ms.name);
                        return (
                          <button
                            key={ms.name}
                            onClick={() => toggleSecondaryMuscle(ms.name)}
                            className={`text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-transparent text-gray-700'}`}
                          >
                            <span className="text-sm font-semibold truncate">{ms.name}</span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-200 shadow-inner'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </main>
        </div>
      )}

    </div>
  );
}
