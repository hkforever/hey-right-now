import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AppProvider, useAppStore } from './store';
import HomeTab from './components/HomeTab';
import MeTab from './components/MeTab';
import WorkoutMode from './components/WorkoutMode';
import MinimizedWorkoutBar from './components/MinimizedWorkoutBar';
import WorkoutLogDetail from './components/WorkoutLogDetail';
import { Dumbbell, User } from 'lucide-react';
import { cn } from './lib/utils';
import { changelog } from './components/ChangelogModal';
import AdminApp from './admin/AdminApp';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'me'>('home');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { 
    activeWorkout, 
    isWorkoutMinimized, 
    user, 
    isAuthReady, 
    isLoaded, 
    login, 
    loginError,
    history,
    previewLogId,
    setPreviewLogId,
    previewExerciseId,
    setPreviewExerciseId,
    updateWorkoutLog,
    deleteWorkoutLog
  } = useAppStore();

  if (!isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">启动中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center space-y-8">
        <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 rotate-12">
          <Dumbbell className="w-10 h-10 text-white -rotate-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">专业健身记录</h1>
          <p className="text-gray-500 max-w-[240px] mx-auto text-sm leading-relaxed">
            您的个人专业训练助手，数据永久云端同步。
          </p>
        </div>
        
        <div className="w-full max-w-xs space-y-4">
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="用户名" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
            />
            <input 
              type="password" 
              placeholder="密码" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
            />
          </div>

          <button 
            onClick={() => login(username, password)}
            className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
          >
            <Dumbbell className="w-5 h-5" />
            <span>登录系统</span>
          </button>

          {loginError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600 font-medium leading-relaxed">
                {loginError}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center space-y-2 opacity-60">
          <p className="text-[10px] text-gray-400 capitalize tracking-widest font-bold">
            v{changelog[0].version}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            CloudBase 云端支持
          </p>
          <p className="text-[10px] text-gray-400 font-medium">
            京ICP备2026025144号-1
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs text-gray-500 font-bold uppercase tracking-widest">同步数据中</p>
      </div>
    );
  }

  const viewingLog = previewLogId ? history.find(l => l.id === previewLogId) : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 text-gray-900 overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' ? <HomeTab /> : <MeTab />}
      </main>

      {isWorkoutMinimized && activeWorkout && <MinimizedWorkoutBar />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-40 px-4 pb-safe">
        <button 
          onClick={() => setActiveTab('home')}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            activeTab === 'home' ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">训练</span>
        </button>
        <button 
          onClick={() => setActiveTab('me')}
          className={cn(
             "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            activeTab === 'me' ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">我的</span>
        </button>
      </nav>

      <WorkoutMode />

      {viewingLog && (
        <WorkoutLogDetail 
          isOpen={!!viewingLog}
          onClose={() => {
            setPreviewLogId(null);
            setPreviewExerciseId(null);
          }}
          onSave={(summary) => {
            updateWorkoutLog({
              ...viewingLog,
              title: summary.title,
              notes: summary.notes,
              mediaItems: summary.mediaItems
            });
            setPreviewLogId(null);
            setPreviewExerciseId(null);
          }}
          onDiscard={() => {
            if (window.confirm('确定要删除这条训练记录吗？')) {
              deleteWorkoutLog(viewingLog.id);
              setPreviewLogId(null);
              setPreviewExerciseId(null);
            }
          }}
          log={viewingLog}
          scrollToExerciseId={previewExerciseId}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/admin" element={<AdminApp />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

