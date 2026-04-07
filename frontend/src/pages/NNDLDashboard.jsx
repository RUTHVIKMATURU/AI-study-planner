import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

export default function NNDLDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realSubjects, setRealSubjects] = useState([]);
  const [availableHours, setAvailableHours] = useState(8);
  const [predictData, setPredictData] = useState({ name: '', past_score: 0.5, study_hours: 4, difficulty_level: 6 });
  const [predictedScore, setPredictedScore] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  useEffect(() => {
    init();
    
    // Auto-sync when user returns to this tab
    const handleFocus = () => fetchUserContext();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const init = async () => {
    setLoading(true);
    await checkStatus();
    await fetchUserContext();
    setLoading(false);
  };

  const checkStatus = async () => {
    try {
      const res = await api.get('/api/ml/status');
      setStatus(res.data);
    } catch (error) {
      console.error("Status check failed", error);
      setStatus({ status: 'unavailable', message: 'Backend unreachable or ML down' });
    }
  };

  const fetchUserContext = async () => {
    setSyncing(true);
    try {
      const res = await api.get('/api/ml/user-context');
      const subjects = res.data.subjects || [];
      setRealSubjects(subjects);
      
      // Update currently selected subject data if it exists in the new list
      if (subjects.length > 0) {
        setPredictData(prev => {
          const currentName = prev.name;
          const updatedSelected = subjects.find(s => s.name === currentName) || subjects[0];
          return {
            ...updatedSelected,
            study_hours: prev.study_hours
          };
        });
      }
    } catch (error) {
      console.error("Failed to fetch user context", error);
    } finally {
      setSyncing(false);
    }
  };

  const handlePredict = async () => {
    try {
      const res = await api.post('/api/ml/predict-performance', predictData);
      setPredictedScore(res.data.predicted_score);
    } catch (error) {
      alert("Failed to predict score. Check backend connection.");
    }
  };

  const handleGenerateSchedule = async () => {
    try {
      if (realSubjects.length === 0) {
        alert("Please add subjects in the Subjects tab first.");
        return;
      }
      const req = { subjects: realSubjects, total_study_hours: availableHours };
      const res = await api.post('/api/ml/generate-schedule', req);
      setSchedule(res.data.schedule);
    } catch (error) {
      alert("Failed to generate schedule.");
    }
  };

  const onSubjectSelect = (name) => {
    const selected = realSubjects.find(s => s.name === name);
    if (selected) {
      setPredictData({
        ...selected,
        study_hours: predictData.study_hours // Keep the current hours input
      });
    }
  };

  if (loading) return (
    <div className="p-10 text-center animate-pulse flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Synchronizing with Database...</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white dark:bg-gray-900 min-h-screen rounded-xl shadow-inner text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            AI NNDL Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Deep Learning-Powered Academic Planning</p>
        </div>
        <button 
          onClick={fetchUserContext} 
          disabled={syncing}
          className={`flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition-all shadow-md active:scale-95 ${syncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
        >
          <span>{syncing ? '⌛' : '🔄'}</span> {syncing ? 'Syncing Database...' : 'Sync Data'}
        </button>
      </div>
      
      {/* Real-time Status Card */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Engine Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status?.status === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-bold">{status?.status === 'ready' ? 'Deep Learning Ready' : 'System Offline'}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Subjects</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{realSubjects.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ML Backend</p>
          <p className="text-sm font-medium opacity-80">Pure-Python NNDL v1.0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Prediction Module */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-50 dark:border-transparent">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-2xl">🔮</div>
            <h2 className="text-2xl font-bold">Predict Performance</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold opacity-60 mb-2">Target Subject</label>
              <select 
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                value={predictData.name}
                onChange={e => onSubjectSelect(e.target.value)}
              >
                {realSubjects.length > 0 ? (
                  realSubjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                ) : (
                  <option disabled>No subjects found</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Base Performance</p>
                <p className="text-2xl font-black text-blue-600 capitalize">{(predictData.past_score * 100).toFixed(0)}%</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Complexity</p>
                <p className="text-2xl font-black text-indigo-600">{predictData.difficulty_level}/10</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold opacity-60 mb-2">Weekly Effort (Hrs)</label>
              <input 
                type="number" 
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xl font-bold" 
                value={predictData.study_hours} 
                onChange={e => setPredictData({...predictData, study_hours: parseFloat(e.target.value)})} 
              />
            </div>
            
            <button 
              onClick={handlePredict}
              disabled={realSubjects.length === 0}
              className="w-full py-5 bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Analyze Prediction
            </button>
            
            {predictedScore !== null && (
              <div className="mt-6 p-6 bg-indigo-600 text-white rounded-3xl text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Predicted Target Grade</p>
                <p className="text-6xl font-black mt-2">{(predictedScore * 100).toFixed(1)}%</p>
                <p className="text-xs mt-3 opacity-70">Based on manual backpropagation inference</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Module */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-50 dark:border-transparent">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl text-2xl">📅</div>
            <h2 className="text-2xl font-bold">Smart Allocation</h2>
          </div>
          
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
             <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold opacity-60">Daily Available Time</label>
                <span className="px-3 py-1 bg-green-500 text-white text-xs font-black rounded-full shadow-sm">{availableHours} HOURS</span>
             </div>
             <input 
               type="range" 
               min="1" 
               max="16" 
               className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600" 
               value={availableHours} 
               onChange={e => setAvailableHours(parseInt(e.target.value))} 
             />
             <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold">
                <span>1 HOUR (LIGHT)</span>
                <span>16 HOURS (INTENSE)</span>
             </div>
          </div>

          <button 
            onClick={handleGenerateSchedule}
            disabled={realSubjects.length === 0}
            className="w-full py-5 bg-gradient-to-br from-green-500 to-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-green-500/30 transition-all active:scale-[0.98] mb-8 disabled:opacity-50"
          >
            Construct Adaptive Plan
          </button>
          
          {schedule && (
            <div className="space-y-4">
                {schedule.map((item, idx) => (
                  <div key={idx} className="group relative p-5 bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-green-500/50 transition-all shadow-sm flex justify-between items-center overflow-hidden">
                    {item.priority === 2 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                    {item.priority === 1 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>}
                    {item.priority === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                    
                    <div>
                      <p className="font-black text-lg">{item.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.priority === 2 && <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">High Priority</span>}
                        {item.priority === 1 && <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-tighter bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded">Moderate</span>}
                        {item.priority === 0 && <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Standard</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{item.allocated_hours}<span className="text-sm ml-1 opacity-40">h</span></div>
                      <p className="text-[10px] font-bold opacity-40 uppercase">{item.sessions} Sessions</p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {realSubjects.length === 0 && (
            <div className="p-12 text-center rounded-3xl border-4 border-dashed border-gray-100 dark:border-gray-800">
               <div className="text-4xl mb-4 opacity-20">📂</div>
               <p className="text-sm font-bold opacity-40 mb-4">No real subjects found in your database.</p>
               <a href="/subjects" className="text-blue-600 font-bold hover:underline">Add Your Courses First &rarr;</a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
