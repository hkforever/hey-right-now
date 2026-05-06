import React, { useState } from 'react';
import { X, Settings, ChevronRight, ScrollText, LogOut, Sparkles, Shield, Info } from 'lucide-react';
import { useAppStore } from '../store';
import ChangelogModal from './ChangelogModal';
import IllustrationGeneratorModal from './IllustrationGeneratorModal';
import BodyStatsModal from './BodyStatsModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { logout } = useAppStore();
  const [showChangelog, setShowChangelog] = useState(false);
  const [showIllustrationGenerator, setShowIllustrationGenerator] = useState(false);
  const [showBodyStats, setShowBodyStats] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isOpen) return null;

  const menuGroups = [
    {
      title: '账户与数据',
      items: [
        {
          id: 'body-stats',
          title: '个人身体数据',
          icon: <Shield className="w-5 h-5 text-indigo-500" />,
          onClick: () => setShowBodyStats(true),
          description: '设置性别、体重、年龄以获得科学的力量评估'
        }
      ]
    },
    {
      title: '功能工具',
      items: [
        {
          id: 'ai-gen',
          title: 'AI 运动示意图生成',
          icon: <Sparkles className="w-5 h-5 text-blue-500" />,
          onClick: () => setShowIllustrationGenerator(true),
          description: '使用 AI 生成专业健身动作示意图'
        },
      ]
    },
    {
      title: '关于应用',
      items: [
        {
          id: 'changelog',
          title: '更新日志',
          icon: <ScrollText className="w-5 h-5 text-purple-500" />,
          onClick: () => setShowChangelog(true),
          description: '查看版本更新内容与新特性'
        },
        {
          id: 'privacy',
          title: '隐私策略',
          icon: <Shield className="w-5 h-5 text-green-500" />,
          onClick: () => {},
          description: '了解我们如何保护您的数据'
        },
        {
          id: 'about',
          title: '关于补齐健身',
          icon: <Info className="w-5 h-5 text-gray-500" />,
          onClick: () => {},
          description: '版本 1.2.0'
        },
      ]
    }
  ];

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
        <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 text-gray-900 rounded-2xl flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tighter">设置</h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4 py-6 space-y-8">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className="w-full flex items-center p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left group"
                    >
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center shadow-sm transition-colors">
                        {item.icon}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-sm font-bold text-gray-900">{item.title}</div>
                        <div className="text-[10px] font-medium text-gray-400">{item.description}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 px-2">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-black tracking-tight">退出登录</div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      <ChangelogModal 
        isOpen={showChangelog} 
        onClose={() => setShowChangelog(false)} 
      />
      
      <IllustrationGeneratorModal 
        isOpen={showIllustrationGenerator}
        onClose={() => setShowIllustrationGenerator(false)}
      />
      
      <BodyStatsModal
        isOpen={showBodyStats}
        onClose={() => setShowBodyStats(false)}
      />

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-2">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">确认退出</h3>
              <p className="text-sm text-gray-500 font-medium tracking-tight px-4 leading-relaxed">
                确定要退出登录吗？退出后您将无法即时同步和保存您的训练进度。
              </p>
            </div>
            <div className="flex flex-col space-y-3 pt-2">
              <button 
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  onClose();
                }}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
              >
                点此退出
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl active:scale-95 transition-transform"
              >
                让我再练练
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
