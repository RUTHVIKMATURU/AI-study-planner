import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import {
  MdAutoAwesome, MdRefresh, MdCheckCircle,
  MdRadioButtonUnchecked, MdMenuBook, MdLoop, MdCode, MdTableChart,
} from 'react-icons/md'

const SUBJECT_COLORS = [
  'bg-indigo-900/40 text-indigo-300 border-indigo-800/40',
  'bg-cyan-900/40 text-cyan-300 border-cyan-800/40',
  'bg-rose-900/40 text-rose-300 border-rose-800/40',
  'bg-amber-900/40 text-amber-300 border-amber-800/40',
  'bg-emerald-900/40 text-emerald-300 border-emerald-800/40',
  'bg-purple-900/40 text-purple-300 border-purple-800/40',
]

function subjectColor(name, allSubjects) {
  const idx = allSubjects.indexOf(name)
  return SUBJECT_COLORS[(idx >= 0 ? idx : 0) % SUBJECT_COLORS.length]
}

const TASK_ICONS = {
  study:    <MdMenuBook className="text-indigo-400 text-base flex-shrink-0" />,
  revision: <MdLoop    className="text-yellow-400 text-base flex-shrink-0" />,
  practice: <MdCode    className="text-blue-400   text-base flex-shrink-0" />,
}

const TASK_BADGE = {
  study:    'bg-indigo-900/50 text-indigo-300',
  revision: 'bg-yellow-900/50 text-yellow-300',
  practice: 'bg-blue-900/50   text-blue-300',
}

export default function StudyPlan() {
  const [plan, setPlan]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [hours, setHours]             = useState(6)
  const [selectedDay, setSelectedDay] = useState(null)
  const [allSubjects, setAllSubjects] = useState([])
  const [view, setView]               = useState('day') // 'day' | 'week'

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/planner/current-plan')
      setPlan(data)
      setSelectedDay(data.weekly_plan?.[0]?.date || null)
      setAllSubjects([...new Set(data.weekly_plan.flatMap(d => d.tasks.map(t => t.subject)))])
    } catch { /* no plan yet */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPlan() }, [])

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post('/planner/generate-plan', { study_hours_per_day: hours })
      setPlan(data)
      setSelectedDay(data.weekly_plan?.[0]?.date || null)
      setAllSubjects([...new Set(data.weekly_plan.flatMap(d => d.tasks.map(t => t.subject)))])
      toast.success(`Plan generated via ${data.generated_by === 'ai' ? '✨ Gemini AI' : '⚙️ Smart Rules'}`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to generate plan'
      toast.error(msg)
    } finally { setGenerating(false) }
  }

  const toggleTask = async (day, task) => {
    try {
      await api.post('/progress/update-progress', {
        plan_id: plan.id, date: day.date,
        subject: task.subject, topic: task.topic,
        completed: !task.completed, time_spent_minutes: task.duration_minutes,
      })
      task.completed = !task.completed
      setPlan({ ...plan })
    } catch { toast.error('Failed to update task') }
  }

  const reschedule = async (date) => {
    try {
      await api.post('/planner/reschedule', null, { params: { missed_date: date } })
      toast.success('Missed tasks rescheduled')
      fetchPlan()
    } catch { toast.error('Reschedule failed') }
  }

  const currentDay = plan?.weekly_plan?.find(d => d.date === selectedDay)
  const today      = new Date().toISOString().split('T')[0]
  const dayDone    = currentDay?.tasks?.filter(t => t.completed).length || 0
  const dayTotal   = currentDay?.tasks?.length || 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Study Plan</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Hours/day:</label>
            <input type="number" min="1" max="16" className="input w-20" value={hours}
              onChange={e => setHours(+e.target.value)} />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={generatePlan} disabled={generating}>
            <MdAutoAwesome /> {generating ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
      </div>

      {plan && (
        <>
          {/* Summary + badge */}
          <div className="card flex items-center justify-between flex-wrap gap-2 text-sm">
            <span className="text-gray-400">{plan.summary}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              plan.generated_by === 'ai' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-gray-700 text-gray-300'
            }`}>
              {plan.generated_by === 'ai' ? '✨ Gemini AI' : '⚙️ Rule-Based'}
            </span>
          </div>

          {/* Subject legend */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">Subjects:</span>
            {allSubjects.map(s => (
              <span key={s} className={`text-xs px-2 py-1 rounded-full border ${subjectColor(s, allSubjects)}`}>{s}</span>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-2">
            <button onClick={() => setView('day')}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${view === 'day' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              Day View
            </button>
            <button onClick={() => setView('week')}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${view === 'week' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <MdTableChart /> Weekly Overview
            </button>
          </div>

          {/* ── WEEKLY OVERVIEW TABLE ── */}
          {view === 'week' && (
            <div className="card overflow-x-auto">
              <h2 className="font-semibold mb-4">7-Day Topic Schedule</h2>
              <table className="w-full text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 font-medium pb-2 pr-3 w-24">Day</th>
                    {allSubjects.map(s => (
                      <th key={s} className={`text-left pb-2 px-2 font-medium rounded-t`}>
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${subjectColor(s, allSubjects)}`}>{s}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.weekly_plan.map(day => {
                    // Group tasks by subject for this day
                    const bySubject = {}
                    allSubjects.forEach(s => { bySubject[s] = [] })
                    day.tasks.forEach(t => {
                      if (bySubject[t.subject]) bySubject[t.subject].push(t)
                    })
                    return (
                      <tr key={day.date}
                        className={`border-t border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${day.date === today ? 'bg-primary/5' : ''}`}
                        onClick={() => { setSelectedDay(day.date); setView('day') }}
                      >
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium text-gray-300">{day.day_label.slice(0,3)}</div>
                          <div className="text-gray-600">{day.date.slice(5)}</div>
                          {day.is_revision_day && <div className="text-yellow-500 text-xs mt-0.5">Rev</div>}
                          {day.date === today && <div className="text-primary text-xs mt-0.5">Today</div>}
                        </td>
                        {allSubjects.map(s => (
                          <td key={s} className="py-2 px-2 align-top">
                            {bySubject[s].length === 0
                              ? <span className="text-gray-700">—</span>
                              : bySubject[s].map((t, i) => (
                                <div key={i} className={`mb-1 flex items-start gap-1 ${t.completed ? 'opacity-40' : ''}`}>
                                  <span className="mt-0.5 flex-shrink-0">{TASK_ICONS[t.task_type]}</span>
                                  <div>
                                    <div className={`leading-tight ${t.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                      {t.topic}
                                    </div>
                                    <div className="text-gray-600">{t.duration_minutes}min</div>
                                  </div>
                                </div>
                              ))
                            }
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-600 mt-3">Click any row to open that day's detail view.</p>
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {view === 'day' && (
            <>
              {/* Day tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {plan.weekly_plan.map(day => {
                  const done  = day.tasks.filter(t => t.completed).length
                  const total = day.tasks.length
                  const pct   = total ? Math.round(done / total * 100) : 0
                  return (
                    <button key={day.date} onClick={() => setSelectedDay(day.date)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm transition-colors text-center min-w-[62px] ${
                        selectedDay === day.date ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      } ${day.date === today ? 'ring-2 ring-primary/60' : ''}`}
                    >
                      <div className="font-semibold">{day.day_label.slice(0, 3)}</div>
                      <div className="text-xs opacity-70">{day.date.slice(5)}</div>
                      {day.is_revision_day
                        ? <div className="text-xs text-yellow-400 mt-0.5">Rev</div>
                        : <div className="text-xs mt-0.5 opacity-60">{pct}%</div>
                      }
                    </button>
                  )
                })}
              </div>

              {/* Day detail */}
              {currentDay && (
                <div className="card">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="font-semibold text-lg">
                        {currentDay.day_label}
                        <span className="text-gray-500 font-normal text-sm ml-2">{currentDay.date}</span>
                        {currentDay.is_revision_day && (
                          <span className="ml-2 text-xs bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">
                            Revision Day
                          </span>
                        )}
                        {currentDay.date === today && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Today</span>
                        )}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {currentDay.total_hours}h planned · {dayDone}/{dayTotal} tasks completed
                      </p>
                      <div className="h-1.5 w-48 bg-gray-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${dayTotal ? (dayDone / dayTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                    {currentDay.date < today && (
                      <button onClick={() => reschedule(currentDay.date)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                        <MdRefresh /> Reschedule missed
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {currentDay.tasks.map((task, i) => (
                      <div key={i} onClick={() => toggleTask(currentDay, task)}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                          task.completed
                            ? 'bg-green-900/10 border-green-800/30 opacity-60'
                            : 'bg-gray-800/80 border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="mt-0.5">
                          {task.completed
                            ? <MdCheckCircle className="text-green-400 text-xl" />
                            : <MdRadioButtonUnchecked className="text-gray-600 text-xl" />
                          }
                        </div>
                        <div className="mt-0.5">{TASK_ICONS[task.task_type] || TASK_ICONS.study}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                            {task.topic}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${subjectColor(task.subject, allSubjects)}`}>
                              {task.subject}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TASK_BADGE[task.task_type]}`}>
                              {task.task_type}
                            </span>
                            <span className="text-xs text-gray-500">{task.duration_minutes} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!plan && !loading && (
        <div className="card text-center py-14">
          <MdAutoAwesome className="text-primary text-5xl mx-auto mb-3 opacity-60" />
          <p className="text-gray-400 mb-1 font-medium">No study plan yet</p>
          <p className="text-gray-600 text-sm mb-5">Add subjects with their syllabus, enter marks, then generate.</p>
          <button className="btn-primary" onClick={generatePlan} disabled={generating}>
            {generating ? 'Generating...' : 'Generate My Plan'}
          </button>
        </div>
      )}

      {loading && (
        <div className="card text-center py-10 text-gray-500 text-sm">Loading plan...</div>
      )}
    </div>
  )
}
