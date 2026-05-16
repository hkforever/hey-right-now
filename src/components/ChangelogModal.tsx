import React from 'react';
import { X, ScrollText, Rocket, Sparkles, Bug } from 'lucide-react';

interface VersionInfo {
  version: string;
  date: string;
  features?: string[];
  improvements?: string[];
  fixes?: string[];
}

export const changelog: VersionInfo[] = [
  {
    version: '1.5.0',
    date: '2026-05-14',
    features: [
      '动作详情新增“训练要点”板块：提供详细的动作指导步骤，助力标准训练'
    ],
    improvements: [
      '搜索体验深度优化：新增输入防抖（Debounce），支持关键词高亮显示，并优化搜索结果排序逻辑',
      '搜索列表精简：进入搜索模式后自动隐藏“近期训练”，整合为纯粹的全局搜索结果视图',
      '云端媒体加载优化：引入请求批处理与智能缓存机制，彻底解决资源频繁请求限制，提升流畅度'
    ],
    fixes: [
      '修复多词搜索及含特殊字符时的正则表达式匹配错误',
      '优化无限滚动加载逻辑，修复搜索结果展示不全及占位符卡死问题'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-05-12',
    features: [
      '全新训练日历系统：支持蓝色训练日点击直接查看详情',
      '日历交互升级：实现连续滚动的多月视图，支持快速定位当前月份',
      '数据看板重构：连续周数与休息天数统计改为顶部悬浮常驻'
    ],
    improvements: [
      '训练数据排版优化：勋章与成绩采用并列布局，提升小屏显示兼容性',
      '布局细节微调：压缩日历高度密度，提升信息呈现效率'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-05-02',
    features: [
      '训练详情页重构：封面图调整为 1:1 比例并支持全屏点击查看',
      '训练列表体验升级：新增单双组行颜色区分（Zebra Striping）',
      '视觉风格优化：训练详情页采用更紧凑集中的布局设计'
    ],
    improvements: [
      '将肌肉分布示意图调整至训练项目列表头部，方便快速预览',
      '由于隐私和简洁考虑，移除了历史列表中的媒体预览图',
      '统一全站用户身份展示逻辑，优先显示用户名而非头像'
    ]
  },
  {
    version: '1.2.0',
    date: '2024-05-01',
    features: [
      '新增肌肉部位分布示意图指示，点击肌肉名称对应部位会闪烁互动',
      '增加了健身语音引导自动连播逻辑'
    ],
    improvements: [
      '优化了语音播放不打断后台背景音乐',
      '提升了语音提示的语速并加入了更清脆的人声效果'
    ]
  },
  {
    version: '1.1.0',
    date: '2024-04-28',
    features: [
      '新增 AI 一键导入锻炼计划功能',
      '新增动作补充示范视频和文字说明',
      '引入动作库的肌肉类别筛选'
    ],
    improvements: [
      '优化历史记录呈现样式，增加云端媒体库'
    ]
  },
  {
    version: '1.0.0',
    date: '2024-04-15',
    features: [
      '首次发布核心训练记录功能',
      '支持自定义健身动作库',
      '提供 RPE 个性化疲劳度记录',
      '数据云端同步功能正式上线'
    ]
  }
];

export default function ChangelogModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tighter">更新日志</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {changelog.map((release, index) => (
            <div key={release.version} className="relative pl-6">
              {/* Timeline line */}
              {index !== changelog.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-32px] w-[2px] bg-gray-100"></div>
              )}
              
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>

              <div className="flex items-baseline space-x-3 mb-4">
                <h3 className="text-xl font-black text-gray-900 tracking-tighter">v{release.version}</h3>
                <span className="text-xs font-bold text-gray-400">{release.date}</span>
                {index === 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Latest
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {release.features && release.features.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-sm font-bold text-purple-600 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span>新特性</span>
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-sm font-medium text-gray-600 marker:text-gray-300">
                      {release.features.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {release.improvements && release.improvements.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-sm font-bold text-blue-600 mb-2">
                      <Rocket className="w-4 h-4" />
                      <span>细节优化</span>
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-sm font-medium text-gray-600 marker:text-gray-300">
                      {release.improvements.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {release.fixes && release.fixes.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1.5 text-sm font-bold text-amber-600 mb-2">
                      <Bug className="w-4 h-4" />
                      <span>问题修复</span>
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside text-sm font-medium text-gray-600 marker:text-gray-300">
                      {release.fixes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
