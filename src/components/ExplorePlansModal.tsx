import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ArrowRight, Download, Dumbbell, MapPin, Activity, Home, 
  Briefcase, PlayCircle, Loader2, X, Check, Plane, Zap, Flame, Building2, 
  User, Link, Anchor 
} from 'lucide-react';
import PlanDetailModal from './PlanDetailModal';
import { db } from '../lib/cloudbase';
import { TrainingPlan } from '../admin/types';
import CloudMedia from './CloudMedia';

interface ExplorePlansModalProps {
  onClose: () => void;
  onImportClick: () => void;
}

const SCENE_PLANS = [
  { name: '居家', icon: <Home className="w-10 h-10 text-blue-500/20" /> },
  { name: '旅行', icon: <Plane className="w-10 h-10 text-indigo-500/20" /> },
  { name: '哑铃专向', icon: <Dumbbell className="w-10 h-10 text-slate-500/20" /> },
  { name: '弹力带', icon: <Activity className="w-10 h-10 text-cyan-500/20" /> },
  { name: '有氧/HIIT', icon: <Flame className="w-10 h-10 text-rose-500/20" /> },
  { name: '健身房', icon: <Building2 className="w-10 h-10 text-violet-500/20" /> },
  { name: '自重训练', icon: <User className="w-10 h-10 text-amber-500/20" /> },
  { name: '悬挂带', icon: <Link className="w-10 h-10 text-emerald-500/20" /> }
];

export default function ExplorePlansModal({ onClose, onImportClick }: ExplorePlansModalProps) {
  const [levelFilter, setLevelFilter] = useState('水平');
  const [goalFilter, setGoalFilter] = useState('目标');
  const [equipmentFilter, setEquipmentFilter] = useState('器械');

  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [isGoalMenuOpen, setIsGoalMenuOpen] = useState(false);
  const [isEquipmentMenuOpen, setIsEquipmentMenuOpen] = useState(false);

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await db.collection('plans').limit(100).get();
        if (res.data) {
          setPlans(res.data as TrainingPlan[]);
        }
      } catch (err) {
        console.error('Failed to load plans', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const filterButtonClass = (isActive: boolean) => 
    `flex-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-1 overflow-hidden ${isActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-transparent text-gray-800'}`;

  const LEVELS = ['初级', '中级', '高级'];
  const GOALS = ['增肌', '减脂', '力量', '塑形'];
  const EQUIPMENTS = ['健身房', '哑铃', '自重'];

  const renderFilterMenu = (
    title: string,
    options: string[],
    currentValue: string,
    defaultValue: string,
    setFilter: (v: string) => void,
    onClose: () => void,
    isOpen: boolean
  ) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 transition-opacity">
        <div className="fixed inset-0" onClick={onClose} />
        <div 
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-xl z-10 overflow-hidden max-h-[85vh] flex flex-col relative transition-transform transform"
          onClick={e => e.stopPropagation()}
        >
          <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="font-bold text-gray-900 text-lg">选择{title}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="overflow-y-auto pb-6 p-2 space-y-2 text-sm mt-2">
            <button
              onClick={() => { setFilter(defaultValue); onClose(); }}
              className={`w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl border ${currentValue === defaultValue ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-700'}`}
            >
              <span className="text-base font-bold">所有{title}</span>
              {currentValue === defaultValue && <Check className="w-5 h-5 text-blue-500" />}
            </button>
            <div className="space-y-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setFilter(opt); onClose(); }}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl"
                >
                  <span className={`text-base font-semibold ${currentValue === opt ? 'text-blue-500' : 'text-gray-700'}`}>
                    {opt}
                  </span>
                  {currentValue === opt && <Check className="w-5 h-5 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="flex-1 text-center font-bold text-gray-900 pr-8">探索</span>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-10">
        <div className="p-4 space-y-6">
          {renderFilterMenu('水平', LEVELS, levelFilter, '水平', setLevelFilter, () => setIsLevelMenuOpen(false), isLevelMenuOpen)}
          {renderFilterMenu('目标', GOALS, goalFilter, '目标', setGoalFilter, () => setIsGoalMenuOpen(false), isGoalMenuOpen)}
          {renderFilterMenu('器械', EQUIPMENTS, equipmentFilter, '器械', setEquipmentFilter, () => setIsEquipmentMenuOpen(false), isEquipmentMenuOpen)}
          
          {/* 方案 Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">方案</h2>
            
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => setIsLevelMenuOpen(true)}
                className={filterButtonClass(levelFilter !== '水平')}
              >
                <span className="truncate">{levelFilter}</span>
              </button>
              <button 
                onClick={() => setIsGoalMenuOpen(true)}
                className={filterButtonClass(goalFilter !== '目标')}
              >
                <span className="truncate">{goalFilter}</span>
              </button>
              <button 
                onClick={() => setIsEquipmentMenuOpen(true)}
                className={filterButtonClass(equipmentFilter !== '器械')}
              >
                <span className="truncate">{equipmentFilter}</span>
              </button>
            </div>

            <div className="space-y-3">
              {loadingPlans ? (
                <div className="text-center py-6 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
              ) : plans.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">暂无方案</div>
              ) : plans.map((plan, i) => (
                <div 
                  key={plan._id || i} 
                  onClick={() => setSelectedPlan(plan)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-0 flex overflow-hidden group cursor-pointer hover:border-blue-500 transition-colors h-[100px]"
                >
                  <div className="w-1/3 h-full bg-[#f8fbff] flex relative shrink-0 items-center justify-center overflow-hidden">
                    {plan.coverImage ? (
                       <CloudMedia src={plan.coverImage} className="w-full h-full object-cover" />
                    ) : (
                       <div className="absolute -right-2 -bottom-2 text-gray-200/50">
                         <Dumbbell className="w-16 h-16" />
                       </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col justify-center flex-1">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{plan.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{plan.scene ? `(${plan.scene})` : ''}</p>
                    <p className="text-xs text-gray-400 font-medium">{plan.routines?.length || 0} 项训练计划</p>
                  </div>
                </div>
              ))}
              
              <button className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors mt-2">
                显示所有方案
              </button>
            </div>
          </div>

          {/* Trainer Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 relative">
            <div className="absolute right-0 top-0 w-2/3 h-full opacity-5 pointer-events-none">
              {/* Abstract shape background */}
              <div className="absolute right-4 top-4 w-20 h-20 rounded-full bg-blue-500 blur-2xl" />
            </div>
            
            <div className="relative z-10 flex flex-col gap-4 items-center text-center">
              <div className="flex-1 space-y-2 flex flex-col items-center">
                <h3 className="text-blue-500 font-bold text-lg flex items-center justify-center gap-1">
                  AI个性化定制
                </h3>
                <p className="text-gray-800 font-bold text-[17px] leading-snug">
                  根据您的需求与目标定制的方案
                </p>
                <div className="pt-2 flex justify-center w-full">
                  <button className="text-blue-500 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
                     即刻探索
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">训练场景</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {SCENE_PLANS.map((plan, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-[100px] flex flex-col justify-between hover:border-blue-500 transition-colors cursor-pointer group relative overflow-hidden">
                  <span className="font-bold text-gray-800 text-[15px] z-10">{plan.name}</span>
                  <div className="absolute right-3 bottom-2 opacity-100 group-hover:scale-110 transition-transform origin-bottom-right">
                    {plan.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legacy Import Section */}
          <div className="pt-4 border-t border-gray-200">
             <button 
                onClick={onImportClick}
                className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-blue-500 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-700 block">导入现有计划</span>
                  <span className="text-xs text-gray-400 font-medium">支持 .json 备份文件</span>
                </div>
              </button>
          </div>
        </div>
      </div>
      <PlanDetailModal 
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        plan={selectedPlan!}
      />
    </div>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
