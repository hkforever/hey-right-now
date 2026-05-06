import React, { useState, useRef } from 'react';
import { ChevronLeft, X, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { cn, formatDuration, isVideo } from '../lib/utils';
import { uploadFile, auth } from '../lib/cloudbase';
import CloudMedia from './CloudMedia';
import { resizeImage } from '../lib/image-utils';
import { v4 as uuidv4 } from 'uuid';

import { MediaItem } from '../types';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: { title: string, notes: string, mediaItems: MediaItem[] }) => void;
  onDiscard: () => void;
  stats: {
    duration: number;
    volume: number;
    sets: number;
    title: string;
    notes?: string;
    mediaItems?: MediaItem[];
    startTime?: number;
  };
}

export default function WorkoutSummaryModal({ isOpen, onClose, onSave, onDiscard, stats }: WorkoutSummaryModalProps) {
  const [notes, setNotes] = useState(stats.notes || '');
  const [title, setTitle] = useState(stats.title);
  const [mediaItems, setMediaItems] = useState<{ 
    id: string,
    item: MediaItem, 
    file?: File, 
    progress: number, 
    status: 'pending' | 'uploading' | 'completed' | 'error' 
  }[]>(
    stats.mediaItems ? stats.mediaItems.map(item => ({ id: uuidv4(), item, progress: 100, status: 'completed' })) : []
  );
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const startUpload = async (file: File, itemId: string) => {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${uuidv4()}_${file.name.replace(/\s+/g, '_')}`;
      const path = `workouts/${userId}/${fileName}`;

      const downloadUrl = await uploadFile(file, path, (progress) => {
        setMediaItems(prev => prev.map(m => 
          m.id === itemId 
            ? { ...m, status: 'uploading', progress: Math.max(m.progress, progress) } 
            : m
        ));
      });

      setMediaItems(prev => prev.map(m => 
        m.id === itemId 
          ? { ...m, status: 'completed', progress: 100, item: { ...m.item, url: downloadUrl } } 
          : m
      ));
    } catch (error) {
      console.error('Upload failed:', error);
      setMediaItems(prev => prev.map(m => 
        m.id === itemId ? { ...m, status: 'error' } : m
      ));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !auth.currentUser) return;
    
    setShowMediaPicker(false);
    
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        const isVideoFile = file.type.startsWith('video/');
        
        // Resize if image
        if (!isVideoFile) {
          try {
            const resizedBlob = await resizeImage(file, 1024, 1024);
            file = new File([resizedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
          } catch (err) {
            console.error('Resize failed, using original:', err);
          }
        }

        const url = URL.createObjectURL(file);
        const type = isVideoFile ? 'video' : 'image';
        const id = uuidv4();
        
        const newItem = { 
          id,
          item: { url, type }, 
          file, 
          progress: 0, 
          status: 'pending' as const
        };
        
        setMediaItems(prev => [...prev, newItem]);

        // Trigger upload
        startUpload(file, id);
    }
  };

  const removeMedia = (id: string) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    // Check for uploading status
    const isUploading = mediaItems.some(m => m.status === 'uploading' || m.status === 'pending');
    if (isUploading) {
      alert('请等待所有媒体文件上传完成');
      return;
    }

    const hasErrors = mediaItems.some(m => m.status === 'error');
    if (hasErrors) {
      alert('部分文件上传失败，请移除后再重试');
      return;
    }

    setIsSaving(true);
    try {
      const finalMediaItems = mediaItems.map(m => m.item);
      onSave({ title, notes, mediaItems: finalMediaItems });
    } catch (error: any) {
      console.error('Save failed:', error);
      alert('保存记录失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const date = stats.startTime ? new Date(stats.startTime) : new Date();
  const day = date.getDate();
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? '下午' : '上午';
  const displayHours = String(hours % 12 || 12).padStart(2, '0');
  const dateString = `${year} ${month} ${day} 日，${period} ${displayHours}:${minutes}`;

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col font-sans animate-in slide-in-from-bottom duration-300">
        <header className="h-14 px-4 flex items-center justify-between shrink-0">
        <button onClick={onClose} className="p-1 text-gray-900">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <span className="font-bold text-lg text-gray-900">保存锻炼</span>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center min-w-[100px]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>保存</span>
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*" 
          multiple 
          onChange={handleFileChange}
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment" 
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-between">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-3xl font-black text-gray-900 bg-transparent border-none outline-none w-full tracking-tight"
          />
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full text-gray-500 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase mb-1 tracking-wider">时长</span>
            <span className="text-xl font-bold text-blue-500 font-mono tracking-tight">{formatDuration(stats.duration)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase mb-1 tracking-wider">运动量</span>
            <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">{stats.volume.toLocaleString()} kg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase mb-1 tracking-wider">组数</span>
            <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">{stats.sets}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase block tracking-wider">时刻</span>
          <span className="text-lg font-bold text-blue-500">{dateString}</span>
          <div className="h-px bg-gray-100 mt-4" />
        </div>

        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setShowMediaPicker(true)}
              className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 shrink-0 bg-white active:bg-gray-50 transition-colors"
            >
              <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
            </button>

            {mediaItems.map((entry) => (
              <div key={entry.id} className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                  <CloudMedia 
                    src={entry.item.url} 
                    type={entry.item.type} 
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* Progress Overlay */}
                  {entry.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                      <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden mb-1">
                        <div 
                          className="h-full bg-white transition-all duration-300" 
                          style={{ width: `${entry.progress}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-black">{Math.round(entry.progress)}%</span>
                    </div>
                  )}

                  {/* Error Overlay */}
                  {entry.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center text-white p-2 text-center backdrop-blur-sm">
                      <span className="text-[10px] font-bold leading-tight mb-1">上传失败</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (entry.file) startUpload(entry.file, entry.id);
                        }}
                        className="bg-white text-red-600 text-[10px] px-3 py-1 rounded-full font-black shadow-sm active:scale-95 transition-transform"
                      >
                        重试
                      </button>
                    </div>
                  )}

                  {/* Completed Checkmark */}
                  {entry.status === 'completed' && entry.file && (
                    <div className="absolute bottom-1 right-1 bg-green-500 text-white p-0.5 rounded-full shadow-sm">
                      <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => removeMedia(entry.id)}
                  className="absolute -top-1 -right-1 bg-gray-900/80 text-white p-1 rounded-full shadow-lg backdrop-blur-sm z-10"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">添加照片/视频</p>
        </div>

        {/* Media Picker Bottom Sheet */}
        {showMediaPicker && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowMediaPicker(false)} />
            <div className="relative bg-white rounded-t-[32px] overflow-hidden p-3 pt-6 animate-in slide-in-from-bottom duration-300">
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 opacity-50" />
              <div className="space-y-3">
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-gray-900">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">拍照</span>
                </button>
                <div className="h-px bg-gray-50 mx-4" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-gray-900">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">选择图库照片或视频</span>
                </button>
              </div>
              <div className="h-4" />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase block tracking-wider">描述</span>
            <textarea 
              placeholder="您的锻炼情况怎么样？在这里留下一些笔记..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-lg leading-relaxed text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none resize-none h-24"
            />
          </div>
          <div className="h-px bg-gray-100" />
        </div>

        <div className="pt-10 pb-12 flex justify-center">
          <button 
            onClick={onDiscard}
            className="text-red-500 font-bold text-xl active:scale-95 transition-transform tracking-tight"
          >
            舍弃锻炼
          </button>
        </div>
      </main>
    </div>
  );
}
