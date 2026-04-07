import axios from 'axios'
import useAuthStore from '../store/useAuthStore'

const API_URL = 'http://localhost:8000/api/quiz'

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
}

const quizService = {
  generateQuiz: async (topics, difficulty = 'moderate') => {
    const response = await axios.post(`${API_URL}/generate`, { topics, difficulty }, getAuthHeaders())
    return response.data
  },
  submitQuiz: async (quizId, answers, timeTakenSeconds) => {
    const response = await axios.post(`${API_URL}/submit`, {
      quiz_id: quizId,
      answers,
      time_taken_seconds: timeTakenSeconds
    }, getAuthHeaders())
    return response.data
  },
  getHistory: async () => {
    const response = await axios.get(`${API_URL}/history`, getAuthHeaders())
    return response.data
  }
}

export default quizService
