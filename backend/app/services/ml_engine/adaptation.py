class AdaptationEngine:
    def __init__(self):
        self.miss_penalty = 1.2
        self.complete_reward = 0.9

    def update_difficulty_multiplier(self, current_difficulty: int, completed: bool) -> int:
        """
        Basic RL: If missed, increase the perceived difficulty so it scales up in Priority next time.
        If completed, reduce it slightly to balance load.
        """
        if completed:
            new_diff = current_difficulty * self.complete_reward
        else:
            new_diff = current_difficulty * self.miss_penalty
            
        return max(1, min(10, int(round(new_diff))))
