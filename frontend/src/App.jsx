import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Marks from './pages/Marks'
import StudyPlan from './pages/StudyPlan'
import Progress from './pages/Progress'
import Quiz from './pages/Quiz'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="marks" element={<Marks />} />
        <Route path="plan" element={<StudyPlan />} />
        <Route path="progress" element={<Progress />} />
        <Route path="quiz" element={<Quiz />} />
      </Route>
    </Routes>
  )
}
