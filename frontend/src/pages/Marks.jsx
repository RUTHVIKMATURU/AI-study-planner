import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { MdAdd, MdWarning, MdDelete } from 'react-icons/md'

const EXAM_TYPES = ['mid', 'final', 'quiz', 'assignment']
const DEFAULTS   = { subject_name: '', marks_obtained: '', total_marks: 100, exam_type: 'mid' }

export default function Marks() {
  const [marks,    setMarks]    = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [subjects, setSubjects] = useState([])   // for dropdown
  const [form,     setForm]     = useState(DEFAULTS)
  const [loading,  setLoading]  = useState(false)

  const fetchAll = async () => {
    const [m, a, s] = await Promise.all([
      api.get('/marks').catch(() => ({ data: [] })),
      api.get('/marks/analysis').catch(() => ({ data: null })),
      api.get('/subjects').catch(() => ({ data: [] })),
    ])
    setMarks(m.data)
    setAnalysis(a.data)
    setSubjects(s.data)
  }

  useEffect(() => { fetchAll() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.subject_name) { toast.error('Select a subject'); return }
    setLoading(true)
    try {
      await api.post('/marks', {
        subject_id:      form.subject_name,
        subject_name:    form.subject_name,
        marks_obtained:  +form.marks_obtained,
        total_marks:     +form.total_marks,
        exam_type:       form.exam_type,
      })
      toast.success('Marks saved')
      setForm(DEFAULTS)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save marks')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/marks/${id}`)
      toast.success('Deleted')
      fetchAll()
    } catch { toast.error('Failed to delete') }
  }

  const badgeClass = p => ({ weak: 'badge-weak', moderate: 'badge-moderate', strong: 'badge-strong' }[p] || '')

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Marks & Analysis</h1>

      {/* Summary cards */}
      {analysis?.summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Weak',     val: analysis.summary.weak,     cls: 'text-red-400'    },
            { label: 'Moderate', val: analysis.summary.moderate, cls: 'text-yellow-400' },
            { label: 'Strong',   val: analysis.summary.strong,   cls: 'text-green-400'  },
          ].map(({ label, val, cls }) => (
            <div key={label} className="card text-center">
              <div className={`text-2xl font-bold ${cls}`}>{val}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk alert */}
      {analysis?.risk_subjects?.length > 0 && (
        <div className="card border-red-800/50 bg-red-950/20">
          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
            <MdWarning /> Risk Subjects (&lt;40%) — needs daily attention
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.risk_subjects.map(s => (
              <span key={s.subject_name} className="badge-weak">
                {s.subject_name} ({s.percentage}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add / Update form */}
      <div className="card">
        <h2 className="font-semibold mb-4">Add / Update Marks</h2>

        {subjects.length === 0 && (
          <p className="text-yellow-500 text-xs mb-3">
            ⚠️ No subjects found. <a href="/subjects" className="underline">Add subjects first</a>.
          </p>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
          {/* Subject dropdown */}
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Subject *</label>
            {subjects.length > 0 ? (
              <select className="input" required value={form.subject_name}
                onChange={e => set('subject_name', e.target.value)}>
                <option value="">— Select subject —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                ))}
              </select>
            ) : (
              <input className="input" required placeholder="e.g. DSA" value={form.subject_name}
                onChange={e => set('subject_name', e.target.value)} />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Marks Obtained *</label>
            <input className="input" type="number" min="0" max={form.total_marks} required
              value={form.marks_obtained} onChange={e => set('marks_obtained', e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Total Marks</label>
            <input className="input" type="number" min="1"
              value={form.total_marks} onChange={e => set('total_marks', e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Exam Type</label>
            <select className="input" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}>
              {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button className="btn-primary flex items-center gap-2 w-full justify-center" disabled={loading}>
              <MdAdd /> {loading ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </form>
      </div>

      {/* Priority ranking */}
      {analysis?.ranked?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Priority Ranking (weakest = highest priority)</h2>
          <div className="space-y-2">
            {analysis.ranked.map((m, i) => (
              <div key={m.id || i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-red-500/30 text-red-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{m.subject_name}</div>
                  <div className="text-xs text-gray-500">{m.exam_type} · {m.marks_obtained}/{m.total_marks}</div>
                </div>
                <div className="text-sm font-bold">{m.percentage}%</div>
                <span className={badgeClass(m.performance)}>{m.performance}</span>
                <button onClick={() => handleDelete(m.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-1">
                  <MdDelete className="text-base" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!analysis?.ranked || analysis.ranked.length === 0) && (
        <div className="card text-center py-8 text-gray-500 text-sm">
          No marks added yet. Add marks above to see analysis.
        </div>
      )}
    </div>
  )
}
