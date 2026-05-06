import React, { useState, useEffect } from 'react';
import { X, Save, Info } from 'lucide-react';
import { useAppStore } from '../store';
import Body from 'react-muscle-highlighter';
import { Slug } from 'react-muscle-highlighter';

interface BodyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BodyStatsModal({ isOpen, onClose }: BodyStatsModalProps) {
  const { userStats, updateUserStats } = useAppStore();
  
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyweight, setBodyweight] = useState<string>('70');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('25');
  const [bodyFat, setBodyFat] = useState<string>('');
  
  const [neck, setNeck] = useState<string>('');
  const [shoulder, setShoulder] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [waist, setWaist] = useState<string>('');
  const [hip, setHip] = useState<string>('');
  const [leftArm, setLeftArm] = useState<string>('');
  const [rightArm, setRightArm] = useState<string>('');
  const [leftForearm, setLeftForearm] = useState<string>('');
  const [rightForearm, setRightForearm] = useState<string>('');
  const [leftThigh, setLeftThigh] = useState<string>('');
  const [rightThigh, setRightThigh] = useState<string>('');
  const [leftCalf, setLeftCalf] = useState<string>('');
  const [rightCalf, setRightCalf] = useState<string>('');

  const [activeMeasurement, setActiveMeasurement] = useState<string | null>(null);

  const getHighlightedMuscles = (): (Slug | { slug: Slug, side: 'left' | 'right' })[] => {
    const isBack = getSide() === 'back';
    const anatomicalLeft = isBack ? 'left' : 'right';
    const anatomicalRight = isBack ? 'right' : 'left';

    switch(activeMeasurement) {
      case 'neck': return ['neck', 'trapezius'];
      case 'shoulder': return ['deltoids'];
      case 'chest': return ['chest'];
      case 'waist': return ['abs', 'obliques'];
      case 'hip': return ['gluteal'];
      case 'leftArm': return [{ slug: 'biceps', side: anatomicalLeft }, { slug: 'triceps', side: anatomicalLeft }];
      case 'rightArm': return [{ slug: 'biceps', side: anatomicalRight }, { slug: 'triceps', side: anatomicalRight }];
      case 'leftForearm': return [{ slug: 'forearm', side: anatomicalLeft }];
      case 'rightForearm': return [{ slug: 'forearm', side: anatomicalRight }];
      case 'leftThigh': return [{ slug: 'quadriceps', side: anatomicalLeft }, { slug: 'hamstring', side: anatomicalLeft }];
      case 'rightThigh': return [{ slug: 'quadriceps', side: anatomicalRight }, { slug: 'hamstring', side: anatomicalRight }];
      case 'leftCalf': return [{ slug: 'calves', side: anatomicalLeft }];
      case 'rightCalf': return [{ slug: 'calves', side: anatomicalRight }];
      default: return [];
    }
  };

  const getMeasurementFeedback = () => {
    if (!activeMeasurement) return <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">点击指标部位</span>;
    
    let currentValue = '';
    let oldVal = 0;
    let name = '';
    let unit = 'cm';
    
    switch (activeMeasurement) {
      case 'neck': currentValue = neck; oldVal = userStats?.neck || 0; name = '颈围'; break;
      case 'shoulder': currentValue = shoulder; oldVal = userStats?.shoulder || 0; name = '肩围'; break;
      case 'chest': currentValue = chest; oldVal = userStats?.chest || 0; name = '胸围'; break;
      case 'leftArm': currentValue = leftArm; oldVal = userStats?.leftArm || userStats?.arm || 0; name = '左侧大臂'; break;
      case 'rightArm': currentValue = rightArm; oldVal = userStats?.rightArm || userStats?.arm || 0; name = '右侧大臂'; break;
      case 'leftForearm': currentValue = leftForearm; oldVal = userStats?.leftForearm || userStats?.forearm || 0; name = '左侧小臂'; break;
      case 'rightForearm': currentValue = rightForearm; oldVal = userStats?.rightForearm || userStats?.forearm || 0; name = '右侧小臂'; break;
      case 'waist': currentValue = waist; oldVal = userStats?.waist || 0; name = '腰围'; break;
      case 'hip': currentValue = hip; oldVal = userStats?.hip || 0; name = '臀围'; break;
      case 'leftThigh': currentValue = leftThigh; oldVal = userStats?.leftThigh || userStats?.thigh || 0; name = '左侧大腿'; break;
      case 'rightThigh': currentValue = rightThigh; oldVal = userStats?.rightThigh || userStats?.thigh || 0; name = '右侧大腿'; break;
      case 'leftCalf': currentValue = leftCalf; oldVal = userStats?.leftCalf || userStats?.calf || 0; name = '左侧小腿'; break;
      case 'rightCalf': currentValue = rightCalf; oldVal = userStats?.rightCalf || userStats?.calf || 0; name = '右侧小腿'; break;
      default: return <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">填写此项指标</span>;
    }
    
    const numVal = parseFloat(currentValue);
    if (!isNaN(numVal) && oldVal > 0 && numVal !== oldVal) {
      const diff = numVal - oldVal;
      const up = diff > 0;
      let isGood = false;
      if (['waist'].includes(activeMeasurement)) {
        isGood = !up;
      } else {
        isGood = up;
      }
      
      const diffStr = Math.abs(diff).toFixed(1);
      
      return (
        <span className="flex flex-col sm:flex-row items-center gap-1.5 justify-center mt-2 normal-case tracking-normal">
          <span className="text-gray-500 text-xs sm:text-sm">
            {name}从 <span className="font-semibold text-gray-400 line-through">{oldVal}</span> 变为 <span className="font-semibold text-gray-900">{numVal}</span>
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {up ? '+' : '-'}{diffStr}{unit}
          </span>
        </span>
      );
    }
    
    return <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">填写此项指标</span>;
  };

  const getSide = () => {
    if (activeMeasurement === 'hip' || activeMeasurement === 'leftCalf' || activeMeasurement === 'rightCalf') return 'back';
    return 'front';
  };

  const getBodyData = () => {
    const highlights = getHighlightedMuscles();
    return highlights.map(item => {
      if (typeof item === 'string') {
        return { slug: item as Slug, color: '#3B82F6' };
      }
      return { slug: item.slug as Slug, side: item.side, color: '#3B82F6' };
    });
  };

  useEffect(() => {
    if (userStats) {
      setGender(userStats.gender);
      setBodyweight(userStats.bodyweight.toString());
      if (userStats.height) setHeight(userStats.height.toString());
      if (userStats.age) setAge(userStats.age.toString());
      if (userStats.bodyFat) setBodyFat(userStats.bodyFat.toString());
      if (userStats.neck) setNeck(userStats.neck.toString());
      if (userStats.shoulder) setShoulder(userStats.shoulder.toString());
      if (userStats.chest) setChest(userStats.chest.toString());
      if (userStats.waist) setWaist(userStats.waist.toString());
      if (userStats.hip) setHip(userStats.hip.toString());
      
      if (userStats.leftArm) setLeftArm(userStats.leftArm.toString());
      else if (userStats.arm) setLeftArm(userStats.arm.toString());
      
      if (userStats.rightArm) setRightArm(userStats.rightArm.toString());
      else if (userStats.arm) setRightArm(userStats.arm.toString());

      if (userStats.leftForearm) setLeftForearm(userStats.leftForearm.toString());
      else if (userStats.forearm) setLeftForearm(userStats.forearm.toString());

      if (userStats.rightForearm) setRightForearm(userStats.rightForearm.toString());
      else if (userStats.forearm) setRightForearm(userStats.forearm.toString());

      if (userStats.leftThigh) setLeftThigh(userStats.leftThigh.toString());
      else if (userStats.thigh) setLeftThigh(userStats.thigh.toString());

      if (userStats.rightThigh) setRightThigh(userStats.rightThigh.toString());
      else if (userStats.thigh) setRightThigh(userStats.thigh.toString());

      if (userStats.leftCalf) setLeftCalf(userStats.leftCalf.toString());
      else if (userStats.calf) setLeftCalf(userStats.calf.toString());

      if (userStats.rightCalf) setRightCalf(userStats.rightCalf.toString());
      else if (userStats.calf) setRightCalf(userStats.calf.toString());
    }
  }, [userStats, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const bw = parseFloat(bodyweight);
    const a = parseInt(age, 10);
    const h = parseFloat(height);
    const bf = parseFloat(bodyFat);
    const n = parseFloat(neck);
    const s = parseFloat(shoulder);
    const c = parseFloat(chest);
    const w = parseFloat(waist);
    const hp = parseFloat(hip);
    const l_ar = parseFloat(leftArm);
    const r_ar = parseFloat(rightArm);
    const l_fa = parseFloat(leftForearm);
    const r_fa = parseFloat(rightForearm);
    const l_t = parseFloat(leftThigh);
    const r_t = parseFloat(rightThigh);
    const l_ca = parseFloat(leftCalf);
    const r_ca = parseFloat(rightCalf);

    if (!isNaN(bw) && bw > 0) {
      updateUserStats({ 
        gender, 
        bodyweight: bw,
        ...(!isNaN(a) && a > 0 ? { age: a } : {}),
        ...(!isNaN(h) && h > 0 ? { height: h } : {}),
        ...(!isNaN(bf) && bf > 0 ? { bodyFat: bf } : {}),
        ...(!isNaN(n) && n > 0 ? { neck: n } : {}),
        ...(!isNaN(s) && s > 0 ? { shoulder: s } : {}),
        ...(!isNaN(c) && c > 0 ? { chest: c } : {}),
        ...(!isNaN(w) && w > 0 ? { waist: w } : {}),
        ...(!isNaN(hp) && hp > 0 ? { hip: hp } : {}),
        ...(!isNaN(l_ar) && l_ar > 0 ? { leftArm: l_ar } : {}),
        ...(!isNaN(r_ar) && r_ar > 0 ? { rightArm: r_ar } : {}),
        ...(!isNaN(l_fa) && l_fa > 0 ? { leftForearm: l_fa } : {}),
        ...(!isNaN(r_fa) && r_fa > 0 ? { rightForearm: r_fa } : {}),
        ...(!isNaN(l_t) && l_t > 0 ? { leftThigh: l_t } : {}),
        ...(!isNaN(r_t) && r_t > 0 ? { rightThigh: r_t } : {}),
        ...(!isNaN(l_ca) && l_ca > 0 ? { leftCalf: l_ca } : {}),
        ...(!isNaN(r_ca) && r_ca > 0 ? { rightCalf: r_ca } : {})
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-50/50 shrink-0">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">个人身体数据</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-lg font-bold text-gray-900">基础数据</h3>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-3xl divide-y divide-gray-50 overflow-hidden">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/40">
                  <label className="text-sm font-bold text-gray-700">性别</label>
                  <div className="flex bg-gray-200/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`px-3 sm:px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        gender === 'male' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      男性
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`px-3 sm:px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        gender === 'female' 
                          ? 'bg-white text-pink-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      女性
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/40">
                  <label className="text-sm font-bold text-gray-700">体重</label>
                  <div className="relative flex items-center w-24 sm:w-36">
                    <input
                      type="number"
                      value={bodyweight}
                      onChange={e => setBodyweight(e.target.value)}
                      placeholder="70"
                      className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2.5 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-right pr-9 sm:pr-10 shadow-sm"
                    />
                    <span className="absolute right-3 sm:right-4 text-gray-400 font-medium text-sm pointer-events-none select-none">kg</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/40">
                  <label className="text-sm font-bold text-gray-700">年龄</label>
                  <div className="relative flex items-center w-24 sm:w-36">
                    <input
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      placeholder="25"
                      className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2.5 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-right pr-8 sm:pr-9 shadow-sm"
                    />
                    <span className="absolute right-3 sm:right-4 text-gray-400 font-medium text-sm pointer-events-none select-none">岁</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/40">
                  <label className="text-sm font-bold text-gray-700">身高</label>
                  <div className="relative flex items-center w-24 sm:w-36">
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="175"
                      className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2.5 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-right pr-9 sm:pr-10 shadow-sm"
                    />
                    <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50/40">
                  <label className="text-sm font-bold text-gray-700">体脂率</label>
                  <div className="relative flex items-center w-24 sm:w-36">
                    <input
                      type="number"
                      value={bodyFat}
                      onChange={e => setBodyFat(e.target.value)}
                      placeholder="15"
                      className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2.5 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-right pr-7 sm:pr-8 shadow-sm"
                    />
                    <span className="absolute right-3 sm:right-4 text-gray-400 font-medium text-sm pointer-events-none select-none">%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-gray-900">身体围度</h3>
              </div>
              <div className="grid grid-cols-[1fr_140px] sm:grid-cols-[240px_1fr] gap-4 sm:gap-8 items-start">
                <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden divide-y divide-gray-50">
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">颈围</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={neck}
                        onChange={e => setNeck(e.target.value)}
                        onFocus={() => setActiveMeasurement('neck')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">肩围</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={shoulder}
                        onChange={e => setShoulder(e.target.value)}
                        onFocus={() => setActiveMeasurement('shoulder')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">胸围</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={chest}
                        onChange={e => setChest(e.target.value)}
                        onFocus={() => setActiveMeasurement('chest')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">左大臂</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={leftArm}
                        onChange={e => setLeftArm(e.target.value)}
                        onFocus={() => setActiveMeasurement('leftArm')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">右大臂</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={rightArm}
                        onChange={e => setRightArm(e.target.value)}
                        onFocus={() => setActiveMeasurement('rightArm')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">左小臂</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={leftForearm}
                        onChange={e => setLeftForearm(e.target.value)}
                        onFocus={() => setActiveMeasurement('leftForearm')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">右小臂</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={rightForearm}
                        onChange={e => setRightForearm(e.target.value)}
                        onFocus={() => setActiveMeasurement('rightForearm')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">腰围</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={waist}
                        onChange={e => setWaist(e.target.value)}
                        onFocus={() => setActiveMeasurement('waist')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">臀围</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={hip}
                        onChange={e => setHip(e.target.value)}
                        onFocus={() => setActiveMeasurement('hip')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">左大腿</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={leftThigh}
                        onChange={e => setLeftThigh(e.target.value)}
                        onFocus={() => setActiveMeasurement('leftThigh')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">右大腿</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={rightThigh}
                        onChange={e => setRightThigh(e.target.value)}
                        onFocus={() => setActiveMeasurement('rightThigh')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">左小腿</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={leftCalf}
                        onChange={e => setLeftCalf(e.target.value)}
                        onFocus={() => setActiveMeasurement('leftCalf')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-3 sm:p-4 bg-gray-50/40 gap-2">
                    <label className="text-sm font-bold text-gray-700">右小腿</label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="number"
                        value={rightCalf}
                        onChange={e => setRightCalf(e.target.value)}
                        onFocus={() => setActiveMeasurement('rightCalf')}
                        onBlur={() => setActiveMeasurement(null)}
                        placeholder="—"
                        className="w-full bg-white border-2 border-transparent focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all font-mono text-base font-bold text-gray-900 placeholder:text-gray-300 text-left pr-8 sm:pr-9 shadow-sm"
                      />
                      <span className="absolute right-3 text-gray-400 font-medium text-sm pointer-events-none select-none">cm</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-start min-h-[300px] sm:min-h-[400px] sticky top-0">
              <div className="relative w-full flex items-center justify-center">
                <Body 
                  data={getBodyData()} 
                  side={getSide()} 
                  scale={1.2}
                  defaultStroke="#E5E7EB"
                  defaultStrokeWidth={1}
                  onBodyPartPress={(part, side) => {
                    const slug = part.slug;
                    if (!slug) return;
                    
                    const isBack = getSide() === 'back';
                    let prefix = '';
                    if (side === 'left') {
                      prefix = isBack ? 'left' : 'right';
                    } else if (side === 'right') {
                      prefix = isBack ? 'right' : 'left';
                    }
                    
                    if (['neck', 'trapezius'].includes(slug)) setActiveMeasurement('neck');
                    else if (['deltoids'].includes(slug)) setActiveMeasurement('shoulder');
                    else if (['chest'].includes(slug)) setActiveMeasurement('chest');
                    else if (['biceps', 'triceps'].includes(slug)) setActiveMeasurement(`${prefix}Arm`);
                    else if (['forearm'].includes(slug)) setActiveMeasurement(`${prefix}Forearm`);
                    else if (['abs', 'obliques'].includes(slug)) setActiveMeasurement('waist');
                    else if (['gluteal'].includes(slug)) setActiveMeasurement('hip');
                    else if (['quadriceps', 'hamstring'].includes(slug)) setActiveMeasurement(`${prefix}Thigh`);
                    else if (['calves'].includes(slug)) setActiveMeasurement(`${prefix}Calf`);
                  }}
                />
              </div>
              <div className="text-center mt-4 sm:mt-8 min-h-[40px] flex justify-center items-center">
                {getMeasurementFeedback()}
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-50/50 bg-gray-50/30 shrink-0">
          <button 
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-gray-900/20"
          >
            <Save className="w-5 h-5" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
