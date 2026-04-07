import { useState, useEffect } from 'react'

export default function QuizTimer({ initialMinutes = 15, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire()
      return
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [timeLeft, onExpire])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className={`p-3 rounded-lg border flex flex-col items-center justify-center font-mono text-xl ${timeLeft < 60 ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-surface border-border'}`}>
      <span>Time Remaining</span>
      <strong className="text-3xl mt-1">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </strong>
    </div>
  )
}
