from typing import List, Dict

class AIScheduler:
    def __init__(self):
        # 0 = Low, 1 = Medium, 2 = High (from priority_model)
        self.priority_weights = {
            0: 1.0,
            1: 1.5,
            2: 2.0
        }

    def generate_daily_plan(self, subjects: List[Dict], total_hours: float) -> List[Dict]:
        """
        subjects = [{"name": "Math", "priority": 2}, ...]
        """
        if not subjects:
            return []

        total_weight = sum(self.priority_weights.get(sub['priority'], 1.0) for sub in subjects)
        
        schedule = []
        for sub in subjects:
            weight = self.priority_weights.get(sub['priority'], 1.0)
            allocated_hours = (weight / total_weight) * total_hours
            
            # Break down into pomodoro sessions (approx 30 mins: 25 study + 5 break)
            sessions = int(allocated_hours / 0.5)
            if sessions == 0 and allocated_hours > 0:
                sessions = 1
                
            schedule.append({
                "subject": sub['name'],
                "allocated_hours": round(allocated_hours, 2),
                "sessions": sessions,
                "priority": sub['priority']
            })
            
        # Sort by priority, highest first
        schedule.sort(key=lambda x: x['priority'], reverse=True)
        return schedule
