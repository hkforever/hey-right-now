import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Plus, Play, MoreHorizontal, Copy, Pencil, Trash2, Download, Upload } from 'lucide-react';
import PlanEditor from './PlanEditor';

export default function HomeTab() {
  const { plans, activeWorkout, setIsWorkoutMinimized, startWorkout, deletePlan, addPlan, customExercises, addCustomExercise } = useAppStore();
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpenPlanId, setMenuOpenPlanId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.type !== 'workout_plan_export') {
        throw new Error('无效的导出文件格式');
      }

      const { plan, customExercises: importedExercises } = data;

      // 1. Import custom exercises if missing
      if (importedExercises && Array.isArray(importedExercises)) {
        for (const ex of importedExercises) {
          const exists = customExercises.find(e => e.id === ex.id);
          if (!exists) {
            await addCustomExercise({
              ...ex,
              id: ex.id // Keep original ID to maintain plan references
            });
          }
        }
      }

      // 2. Import the plan
      const newPlanId = crypto.randomUUID();
      await addPlan({
        ...plan,
        id: newPlanId,
        title: plan.title + ' (已导入)',
        createdAt: Date.now()
      });

      setToastMessage('计划已成功导入');
    } catch (err) {
      console.error('Import failed:', err);
      setToastMessage('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDuplicate = (plan: any) => {
    addPlan({
      ...plan,
      id: crypto.randomUUID(),
      title: plan.title + ' (副本)',
      createdAt: Date.now()
    });
    setMenuOpenPlanId(null);
  };

  const handleExport = (plan: any) => {
    try {
      // Find custom exercises referenced in this plan
      const exerciseIds = new Set(plan.items.map((item: any) => item.exerciseId));
      const referencedCustomExercises = customExercises.filter(ex => exerciseIds.has(ex.id));

      const exportData = {
        type: 'workout_plan_export',
        version: '1.0',
        exportDate: new Date().toISOString(),
        plan: plan,
        customExercises: referencedCustomExercises
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `计划_${plan.title}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage('计划及相关自定义动作已导出并开始下载');
    } catch (err) {
      console.error('Export failed:', err);
      setToastMessage('导出失败');
    }
    setTimeout(() => setToastMessage(null), 3000);
    setMenuOpenPlanId(null);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
    setMenuOpenPlanId(null);
  };

  const handleStartWorkout = (plan: any) => {
    if (activeWorkout) {
      setPendingPlan(plan);
    } else {
      startWorkout(plan);
      setIsWorkoutMinimized(false);
    }
  };

  return (
    <div className="min-h-full p-4 space-y-6">
      <div className="flex items-center gap-8 mt-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">训练计划</h1>
      </div>

      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm font-medium">暂无计划。新建一个吧！</p>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex flex-col space-y-4 transition-all">
              <div className="flex justify-between items-start">
                <div 
                  className="flex-1 cursor-pointer group"
                  onClick={() => setEditingPlanId(plan.id)}
                >
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-500 transition-colors">{plan.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{plan.items.length} 个动作</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setMenuOpenPlanId(menuOpenPlanId === plan.id ? null : plan.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {menuOpenPlanId === plan.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setMenuOpenPlanId(null)}
                      />
                      <div className="absolute right-0 top-10 w-40 bg-white border border-gray-200 shadow-lg rounded-xl z-50 py-1 overflow-hidden">
                        <button 
                          onClick={() => handleExport(plan)}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4 text-gray-400" />
                          <span>导出</span>
                        </button>
                        <button 
                          onClick={() => handleDuplicate(plan)}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Copy className="w-4 h-4 text-gray-400" />
                          <span>复制</span>
                        </button>
                        <button 
                          onClick={() => {
                            setEditingPlanId(plan.id);
                            setMenuOpenPlanId(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Pencil className="w-4 h-4 text-gray-400" />
                          <span>编辑</span>
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button 
                          onClick={() => handleDelete(plan.id)}
                          className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          <span>删除</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleStartWorkout(plan)}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-opacity text-sm shadow-md shadow-blue-500/20"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>开始训练</span>
              </button>
            </div>
          ))
        )}

        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => setIsCreating(true)}
            className="flex-1 py-5 border border-dashed border-gray-300 hover:border-blue-500 bg-white rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors text-gray-400 hover:text-blue-500"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">新建计划</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-5 border border-dashed border-gray-300 hover:border-blue-500 bg-white rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors text-gray-400 hover:text-blue-500"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">导入计划</span>
          </button>
        </div>

        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* Plan Editor Modal */}
      {(isCreating || editingPlanId) && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <PlanEditor 
            planId={editingPlanId} 
            onClose={() => {
              setIsCreating(false);
              setEditingPlanId(null);
            }} 
          />
        </div>
      )}

      {/* Workout Conflict Modal */}
      {pendingPlan && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setPendingPlan(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight text-center">您正在进行一项锻炼</h3>
            <p className="text-sm text-gray-500 font-medium tracking-tight leading-relaxed text-center px-4">
              如果您开始新的锻炼，那么旧的锻炼会被永久删除。
            </p>
            <div className="flex flex-col space-y-3 pt-2">
              <button 
                onClick={() => {
                  setIsWorkoutMinimized(false);
                  setPendingPlan(null);
                }}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                恢复正在进行的训练
              </button>
              <button 
                onClick={() => {
                  startWorkout(pendingPlan);
                  setIsWorkoutMinimized(false);
                  setPendingPlan(null);
                }}
                className="w-full py-4 bg-white text-red-500 border border-gray-100 font-bold rounded-xl active:scale-95 transition-transform shadow-sm"
              >
                开始新的训练
              </button>
              <button 
                onClick={() => setPendingPlan(null)}
                className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 transition-opacity">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">删除计划</h3>
            <p className="text-sm text-gray-500">确定要删除此训练计划吗？此操作无法撤销，但不会影响历史记录中的数据。</p>
            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  deletePlan(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg shadow-md shadow-red-500/20"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium transition-opacity">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
