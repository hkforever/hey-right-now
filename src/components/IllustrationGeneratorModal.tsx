import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Check, Wand2, ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface IllustrationGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IllustrationGeneratorModal({ isOpen, onClose }: IllustrationGeneratorModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [styleImages, setStyleImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setGeneratedImages([]);
      setSelectedResult(null);
    }
  };

  const handleStyleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const readers = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(readers).then(results => {
        setStyleImages(prev => [...prev, ...results]);
        setGeneratedImages([]);
        setSelectedResult(null);
      });
      
      // Reset input value so same files can be selected again if removed
      if (styleInputRef.current) {
        styleInputRef.current.value = '';
      }
    }
  };

  const generateImages = async () => {
    if (!selectedImage) return;
    setIsLoading(true);
    setGeneratedImages([]);
    setSelectedResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64ImageData = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      
      const parts: any[] = [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        }
      ];

      if (styleImages.length > 0) {
        styleImages.forEach(img => {
          const styleBase64 = img.split(',')[1];
          const styleMime = img.split(';')[0].split(':')[1];
          parts.push({
            inlineData: {
              data: styleBase64,
              mimeType: styleMime,
            }
          });
        });
      }

      parts.push({
        text: styleImages.length > 0 
          ? `Image 1 is the exercise posture. The following ${styleImages.length} image(s) are style references. Generate a new sports illustration that perfectly matches the STYLE (colors, drawing technique, mood) of the style reference images, but shows the POSTURE from Image 1. Keep it as a 2D flat vector or exactly matching the reference style, with a clean background. Square aspect ratio.`
          : 'Convert this reference image into a professional fitness app UI illustration. Style requirements:\n- Style: Minimalist flat vector illustration (2D), clean curves, no messy shading.\n- Colors: Energetic sportswear colors (like vibrant blue or cyan) with a neutral off-white background.\n- Focus: Clearly highlight the exercise posture and movement.\n- Output format: Square aspect ratio, simple and recognizable at small sizes (like 180x180 thumbnails).'
      });

      const generateOne = async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts
          },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
        return null;
      };

      // To avoid rate-limiting issues or timeouts with 4 concurrent calls, we can do 2 parallel batches of 2 or just 4 in parallel if the SDK handles it.
      // Doing 4 in parallel:
      const results = await Promise.all([generateOne(), generateOne(), generateOne(), generateOne()]);
      setGeneratedImages(results.filter(Boolean) as string[]);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('生成图失败，请稍后重试。（可能是接口并发限制）');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shrink-0">
          <div className="flex items-center space-x-2 text-gray-900">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Wand2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black tracking-tight">生成运动示意图</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">1. 上传动作图（必须）</h3>
              {selectedImage ? (
                <div className="relative w-full aspect-square max-h-40 bg-gray-50 rounded-2xl border-2 border-gray-100 overflow-hidden group">
                  <img src={selectedImage} alt="Reference" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold"
                  >
                    <Upload className="w-6 h-6 mb-2" />
                    重新选择
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 active:scale-95"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">点击上传动作图</span>
                </button>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageSelect}
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">2. 上传风格图（可多选）</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {styleImages.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 shrink-0 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden group">
                    <img src={img} alt={`Style ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setStyleImages(prev => prev.filter((_, i) => i !== idx)); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => styleInputRef.current?.click()}
                  className="w-24 h-24 shrink-0 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 active:scale-95"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold text-center px-1 leading-tight">添加风格图</span>
                </button>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                multiple
                className="hidden" 
                ref={styleInputRef} 
                onChange={handleStyleImageSelect}
              />
            </div>
          </div>

          {/* Action Section */}
          {selectedImage && (
            <button
              onClick={generateImages}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  一键生成封面稿
                </>
              )}
            </button>
          )}

          {/* Results Section */}
          {(generatedImages.length > 0 || isLoading) && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                2. 选择最终结果 {generatedImages.length > 0 && `(180x180)`}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {isLoading && generatedImages.length === 0 ? (
                   [...Array(4)].map((_, i) => (
                     <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
                       <ImageIcon className="w-6 h-6 text-gray-300" />
                     </div>
                   ))
                ) : (
                  generatedImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedResult(index)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all active:scale-[0.98] ${
                        selectedResult === index 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                          : 'border-transparent hover:border-blue-200'
                      }`}
                    >
                      <img src={img} alt={`Result ${index}`} className="w-full h-full object-cover" />
                      {selectedResult === index && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {selectedResult !== null && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <button 
              onClick={() => {
                alert('已选择此封面图！这里可以将其保存或用于创建新动作。');
                onClose();
              }}
              className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-2xl active:scale-[0.98] transition-transform shadow-lg shadow-gray-900/20"
            >
              确认使用此图
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
