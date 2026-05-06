import React from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { MediaItem } from '../types';
import { isVideo } from '../lib/utils';
import CloudMedia from './CloudMedia';

interface MediaPlayerModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export default function MediaPlayerModal({ item, onClose }: MediaPlayerModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
      <header className="h-16 px-4 flex items-center justify-between z-10 shrink-0">
        <button onClick={onClose} className="p-2 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-white font-bold">{item.type === 'video' ? '视频播放' : '查看图片'}</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {item.type === 'video' || isVideo(item.url) ? (
          <CloudMedia 
            src={item.url} 
            type="video"
            controls 
            autoPlay 
            playsInline
            preload="auto"
            className="max-w-full max-h-full rounded-2xl shadow-2xl" 
          />
        ) : (
          <CloudMedia 
            src={item.url} 
            alt="Full size" 
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" 
          />
        )}
      </main>
      
      <div className="h-20 shrink-0" />
    </div>
  );
}
