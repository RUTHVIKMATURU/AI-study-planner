import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../store/useAuthStore'
import { MdAutoAwesome } from 'react-icons/md'

const BRANCHES = ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'CSE (Cyber Security)', 'CSE (IoT)', 'AI & DS', 'CSBS', 'IT', 'ECE', 'EEE', 'EIE', 'MECH', 'CIVIL', 'AE']

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', branch: 'CSE', semester: 1 })
  const [loading, setLoading] = useState(false)
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <MdAutoAwesome className="text-primary text-3xl" />
          <h1 className="text-2xl font-bold">StudyAI</h1>
        </div>
        <h2 className="text-lg font-semibold mb-4">Create account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['name', 'Full Name', 'text'], ['email', 'Email', 'email'], ['password', 'Password', 'password']].map(([k, label, type]) => (
            <div key={k}>
              <label className="text-sm text-gray-400 mb-1 block">{label}</label>
              <input className="input" type={type} required value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Branch</label>
              <select className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                {BRANCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Semester</label>
              <select className="input" value={form.semester} onChange={(e) => set('semester', +e.target.value)}>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
