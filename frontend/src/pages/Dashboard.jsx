import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/useAuthStore'
import {
  MdLocalFireDepartment, MdWarning, MdCheckCircle,
  MdCalendarToday, MdTrendingUp, MdAutoAwesome,
} from 'react-icons/md'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [progress, setProgress] = useState(null)
  const [plan, setPlan]         = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/progress/progress').catch(() => ({ data: null })),
      api.get('/planner/current-plan').catch(() => ({ data: null })),
    ]).then(([p, pl]) => {
      setProgress(p?.data)
      setPlan(pl?.data)
      setLoading(false)
    })
  }, [])

  const today     = new Date().toISOString().split('T')[0]
  const todayPlan = plan?.weekly_plan?.find(d => d.date === today)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hey, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's your study overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<MdLocalFireDepartment className="text-orange-400 text-2xl" />}
          label="Streak" value={`${progress?.streak ?? 0} days`} />
        <StatCard icon={<MdCheckCircle className="text-green-400 text-2xl" />}
          label="Completion" value={`${progress?.completion_rate ?? 0}%`} />
        <StatCard icon={<MdCalendarToday className="text-primary text-2xl" />}
          label="Today's Tasks" value={todayPlan?.tasks?.length ?? 0} />
        <StatCard icon={<MdWarning className="text-red-400 text-2xl" />}
          label="Weak Alerts" value={progress?.weak_alerts?.length ?? 0} />
      </div>

      {/* Weak alerts */}
      {(progress?.weak_alerts?.length ?? 0) > 0 && (
        <div className="card border-red-800/50 bg-red-950/20">
          <div className="flex items-center gap-2 mb-2 text-red-400 font-medium">
            <MdWarning /> Subjects needing attention
          </div>
          <div className="flex flex-wrap gap-2">
            {progress.weak_alerts.map(s => (
              <span key={s} className="badge-weak">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Today's plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Today's Schedule</h2>
          <Link to="/plan" className="text-primary text-sm hover:underline">View full plan →</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : todayPlan ? (
          <div className="space-y-2">
            {todayPlan.tasks.slice(0, 5).map((t, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${t.completed ? 'bg-green-900/20' : 'bg-gray-800'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.task_type === 'revision' ? 'bg-yellow-400'
                  : t.task_type === 'practice' ? 'bg-blue-400'
                  : 'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.topic}</div>
                  <div className="text-xs text-gray-500">{t.subject} · {t.duration_minutes} min · {t.task_type}</div>
                </div>
                {t.completed && <MdCheckCircle className="text-green-400 flex-shrink-0" />}
              </div>
            ))}
            {todayPlan.tasks.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{todayPlan.tasks.length - 5} more tasks —{' '}
                <Link to="/plan" className="text-primary hover:underline">view all</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <MdAutoAwesome className="text-primary text-4xl mx-auto mb-2 opacity-50" />
            <p className="text-gray-500 text-sm mb-3">No study plan yet</p>
            <Link to="/plan" className="btn-primary text-sm inline-block">Generate Plan</Link>
          </div>
        )}
      </div>

      {/* Exam readiness */}
      {plan && (progress?.exam_readiness && Object.keys(progress.exam_readiness).length > 0) && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MdTrendingUp /> Exam Readiness
          </h2>
          <div className="space-y-3">
            {Object.entries(progress.exam_readiness).map(([subject, pct]) => (
              <div key={subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{subject}</span>
                  <span className={pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No plan CTA */}
      {!loading && !plan && (
        <div className="card border-dashed border-gray-700 text-center py-6">
          <p className="text-gray-500 text-sm">
            Start by adding{' '}
            <Link to="/subjects" className="text-primary hover:underline">subjects</Link>
            {' '}and{' '}
            <Link to="/marks" className="text-primary hover:underline">marks</Link>
            , then generate your plan.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card flex items-center gap-3">
      {icon}
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-bold text-lg">{value}</div>
      </div>
    </div>
  )
}
