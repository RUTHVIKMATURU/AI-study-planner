import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { MdLocalFireDepartment, MdWarning, MdAutoAwesome } from 'react-icons/md'

export default function Progress() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/progress/progress')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-800" />)}
      </div>
    </div>
  )

  // No plan yet
  if (!data || data.total_tasks === 0) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress Analytics</h1>
      <div className="card text-center py-14">
        <MdAutoAwesome className="text-primary text-5xl mx-auto mb-3 opacity-50" />
        <p className="text-gray-400 font-medium mb-1">No progress data yet</p>
        <p className="text-gray-600 text-sm mb-5">Generate a study plan and start completing tasks to see analytics here.</p>
        <Link to="/plan" className="btn-primary inline-block">Go to Study Plan</Link>
      </div>
    </div>
  )

  const readinessData = Object.entries(data.exam_readiness || {}).map(([name, value]) => ({ name, value }))
  const getColor = v => v >= 70 ? '#22c55e' : v >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress Analytics</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"     value={data.total_tasks} />
        <StatCard label="Completed"       value={data.completed_tasks}       color="text-green-400" />
        <StatCard label="Completion Rate" value={`${data.completion_rate}%`} color="text-primary" />
        <StatCard label="Streak"          value={`${data.streak} 🔥`}        color="text-orange-400" />
      </div>

      {/* Weak alerts */}
      {data.weak_alerts?.length > 0 && (
        <div className="card border-red-800/50 bg-red-950/20">
          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
            <MdWarning /> Subjects below 40% completion
          </div>
          <div className="flex flex-wrap gap-2">
            {data.weak_alerts.map(s => <span key={s} className="badge-weak">{s}</span>)}
          </div>
        </div>
      )}

      {/* Completion donut + stats */}
      <div className="card">
        <h2 className="font-semibold mb-4">Overall Completion</h2>
        <div className="flex items-center gap-8 flex-wrap">
          <ResponsiveContainer width={160} height={160}>
            <RadialBarChart
              innerRadius="60%" outerRadius="100%"
              data={[{ value: data.completion_rate }]}
              startAngle={90} endAngle={-270}
            >
              <RadialBar dataKey="value" fill="#6366f1" background={{ fill: '#1f2937' }} cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div>
            <div className="text-5xl font-bold text-primary">{data.completion_rate}%</div>
            <div className="text-sm text-gray-400 mt-1">{data.completed_tasks} of {data.total_tasks} tasks done</div>
            <div className="flex items-center gap-1 text-orange-400 mt-3">
              <MdLocalFireDepartment />
              <span className="font-semibold">{data.streak} day streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Exam readiness bar chart */}
      {readinessData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Exam Readiness by Subject</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={readinessData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={v => [`${v}%`, 'Readiness']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {readinessData.map((entry, i) => (
                  <Cell key={i} fill={getColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ≥70% Strong</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> 40–70% Moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt;40% Weak</span>
          </div>
        </div>
      )}

      {/* Per-subject readiness list */}
      {readinessData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Subject-wise Readiness</h2>
          <div className="space-y-3">
            {readinessData.map(({ name, value }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{name}</span>
                  <span className={value >= 70 ? 'text-green-400' : value >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                    {value}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
