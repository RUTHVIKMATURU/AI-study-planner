import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdPlayArrow, MdCheckCircle, MdWarning } from 'react-icons/md'
import quizService from '../services/quizService'
import QuizTimer from '../components/QuizTimer'

export default function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const autoTopics = searchParams.get('topics') ? searchParams.get('topics').split(',') : []

  const [state, setState] = useState('setup') // setup, active, loading, results
  const [topicsInput, setTopicsInput] = useState(autoTopics.join(', '))
  const [quizData, setQuizData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [resultData, setResultData] = useState(null)
  const [timeTaken, setTimeTaken] = useState(0)

  // Start time tracker
  const [startTime, setStartTime] = useState(null)

  const handleGenerate = async () => {
    if (!topicsInput.trim()) return
    const topicsList = topicsInput.split(',').map(t => t.trim()).filter(Boolean)
    
    setState('loading')
    try {
      const data = await quizService.generateQuiz(topicsList)
      setQuizData(data)
      setStartTime(Date.now())
      setState('active')
    } catch (err) {
      alert("Failed to generate quiz. Try again.")
      setState('setup')
    }
  }

  const handleSubmit = async () => {
    setState('loading')
    const finalTime = Math.floor((Date.now() - startTime) / 1000)
    setTimeTaken(finalTime)

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      question_id: qId,
      answer: ans
    }))

    try {
      const results = await quizService.submitQuiz(quizData.id, formattedAnswers, finalTime)
      setResultData(results)
      setState('results')
    } catch (err) {
      alert("Failed to submit quiz. Try again.")
      setState('active')
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <h2 className="text-xl text-gray-300">AI is working on it...</h2>
      </div>
    )
  }

  if (state === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Smart AI Quiz</h1>
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <p className="text-gray-300">Enter topics to generate a custom assessment test. Separate multiple topics with commas.</p>
          <textarea
            className="input h-32"
            value={topicsInput}
            onChange={e => setTopicsInput(e.target.value)}
            placeholder="e.g. Data Structures, Linked Lists, Binary Trees"
          />
          <button onClick={handleGenerate} disabled={!topicsInput.trim()} className="btn-primary w-full py-3 flex justify-center items-center gap-2">
            <MdPlayArrow size={24} /> Generate Custom Test
          </button>
        </div>
      </div>
    )
  }

  if (state === 'active' && quizData) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl">
            <h2 className="text-xl font-bold">Quiz Active</h2>
            <div className="text-gray-400 text-sm">Testing: {quizData.topics.join(', ')}</div>
          </div>

          <div className="space-y-6">
            {quizData.questions.map((q, i) => (
              <div key={q.id} className="bg-surface border border-border p-6 rounded-xl space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium mb-4">{q.text}</h3>
                    {q.type === 'mcq' ? (
                      <div className="space-y-2">
                        {q.options.map(opt => (
                          <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors ${answers[q.id] === opt ? 'bg-primary/20 border-primary' : 'border-border'}`}>
                            <input 
                              type="radio" 
                              name={`q_${q.id}`} 
                              value={opt} 
                              checked={answers[q.id] === opt}
                              onChange={() => setAnswers({...answers, [q.id]: opt})}
                              className="w-4 h-4 text-primary"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className="input h-32"
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSubmit} className="btn-primary w-full py-4 text-lg font-bold">
            Submit Test
          </button>
        </div>

        {/* Sticky Timer Sidebar */}
        <div className="w-full md:w-64 sticky top-6 space-y-4">
           <QuizTimer initialMinutes={15} onExpire={handleSubmit} />
        </div>
      </div>
    )
  }

  if (state === 'results' && resultData) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-4 py-8 bg-surface border border-border rounded-xl">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            {resultData.total_score} / {resultData.max_score}
          </h1>
          <p className="text-gray-400">Score &bull; {Math.floor(timeTaken / 60)}m {timeTaken % 60}s taken</p>
        </div>

        <div className="space-y-6">
          {resultData.graded_answers.map((ans, i) => (
             <div key={ans.question_id} className={`p-6 rounded-xl border ${ans.is_correct ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
               <div className="flex gap-2">
                 {ans.is_correct ? <MdCheckCircle className="text-green-500 mt-1" size={20} /> : <MdWarning className="text-red-500 mt-1" size={20} />}
                 <div>
                    <h3 className="font-bold text-lg mb-2">Question {i+1}</h3>
                    <p className="text-gray-300 mb-4"><strong>Your Answer:</strong> {ans.user_answer}</p>
                    <div className="p-4 bg-black/30 rounded-lg border border-white/10 space-y-2">
                      <p className="text-sm font-semibold text-gray-200">AI Feedback:</p>
                      <p className="text-sm text-gray-400">{ans.feedback}</p>
                      <p className="text-sm mt-2 text-green-400"><strong>Expected Answer:</strong> {ans.correct_answer}</p>
                    </div>
                 </div>
               </div>
             </div>
          ))}
        </div>

        <button onClick={() => navigate('/study-plan')} className="btn-secondary w-full py-3">Return to Study Plan</button>
      </div>
    )
  }

  return null
}
