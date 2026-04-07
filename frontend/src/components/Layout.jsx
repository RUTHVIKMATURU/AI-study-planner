import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import {
  MdDashboard, MdMenuBook, MdBarChart, MdCalendarToday,
  MdTrendingUp, MdLogout, MdAutoAwesome, MdQuiz,
} from 'react-icons/md'

const nav = [
  { to: '/', label: 'Dashboard', icon: MdDashboard },
  { to: '/subjects', label: 'Subjects', icon: MdMenuBook },
  { to: '/marks', label: 'Marks', icon: MdBarChart },
  { to: '/plan', label: 'Study Plan', icon: MdCalendarToday },
  { to: '/progress', label: 'Progress', icon: MdTrendingUp },
  { to: '/quiz', label: 'Smart Quiz', icon: MdQuiz },
  { to: '/nndl', label: 'AI NNDL', icon: MdAutoAwesome },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800 flex items-center gap-2">
          <MdAutoAwesome className="text-primary text-2xl" />
          <span className="font-bold text-lg">StudyAI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="text-lg" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-1">{user?.name}</div>
          <div className="text-xs text-gray-600 mb-3">{user?.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
            <MdLogout /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
