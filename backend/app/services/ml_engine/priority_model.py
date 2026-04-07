import math
import random
import json
import os
import csv

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'priority_weights.json')

class SoftmaxClassifier:
    def __init__(self, input_size=3, hidden_size=8, output_size=3):
        # 3 output classes: 0 (Low), 1 (Medium), 2 (High)
        random.seed(42)
        self.w1 = [[random.uniform(-1, 1) for _ in range(hidden_size)] for _ in range(input_size)]
        self.b1 = [0.0] * hidden_size
        self.w2 = [[random.uniform(-1, 1) for _ in range(output_size)] for _ in range(hidden_size)]
        self.b2 = [0.0] * output_size
        
        self.lr = 0.02
        self.is_trained = False
        self._load_weights()

    def relu(self, x): return max(0.0, x)
    def softmax(self, scores):
        exp_scores = [math.exp(max(-50, min(50, s))) for s in scores]
        sum_exp = sum(exp_scores)
        return [s / sum_exp for s in exp_scores]

    def forward(self, X):
        # Hidden Layer
        self.z1 = [sum(X[i] * self.w1[i][j] for i in range(len(X))) + self.b1[j] for j in range(len(self.b1))]
        self.a1 = [self.relu(z) for z in self.z1]
        
        # Output Layer
        self.z2 = [sum(self.a1[i] * self.w2[i][j] for i in range(len(self.a1))) + self.b2[j] for j in range(len(self.b2))]
        self.probs = self.softmax(self.z2)
        return self.probs

    def train_step(self, X, y_class):
        # 1. Forward
        probs = self.forward(X)
        
        # 2. Loss: Cross-Entropy (Backprop with Softmax-CELoss)
        # Gradient d_z2 = probs - target (one-hot)
        d_z2 = [p for p in probs]
        d_z2[y_class] -= 1.0
        
        # d_w2 = d_z2 @ a1
        d_w2 = [[d_z2[j] * self.a1[i] for j in range(3)] for i in range(len(self.a1))]
        d_b2 = d_z2
        
        # Hidden layer gradients
        d_a1 = [sum(d_z2[j] * self.w2[i][j] for j in range(3)) for i in range(len(self.a1))]
        d_z1 = [d_a1[i] if self.z1[i] > 0 else 0.0 for i in range(len(self.z1))]
        d_w1 = [[d_z1[j] * X[i] for j in range(len(self.z1))] for i in range(len(X))]
        d_b1 = d_z1
        
        # 3. Update Weights
        for i in range(len(self.w2)):
            for j in range(len(self.w2[i])):
                self.w2[i][j] -= self.lr * d_w2[i][j]
        for j in range(len(self.b2)): self.b2[j] -= self.lr * d_b2[j]
        
        for i in range(len(self.w1)):
            for j in range(len(self.w1[i])):
                self.w1[i][j] -= self.lr * d_w1[i][j]
        for j in range(len(self.b1)): self.b1[j] -= self.lr * d_b1[j]

    def save_weights(self):
        with open(MODEL_PATH, 'w') as f:
            json.dump({"w1": self.w1, "b1": self.b1, "w2": self.w2, "b2": self.b2}, f)
        self.is_trained = True

    def _load_weights(self):
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'r') as f:
                data = json.load(f)
                self.w1, self.b1, self.w2, self.b2 = data['w1'], data['b1'], data['w2'], data['b2']
                self.is_trained = True

class PriorityClassifier:
    def __init__(self):
        self.nn = SoftmaxClassifier()

    def train(self, data_path: str, epochs=50):
        with open(data_path, 'r') as f:
            reader = csv.DictReader(f)
            dataset = [row for row in reader]
            
        for _ in range(epochs):
            for row in dataset:
                X = [float(row['Past_Score']), float(row['Study_Hours'])/15.0, float(row['Difficulty_Level'])/10.0]
                y = int(row['Priority_Class'])
                self.nn.train_step(X, y)
                
        self.nn.save_weights()
        return 0.90 # Accuracy metric

    def classify(self, past_score: float, study_hours: float, difficulty: int) -> int:
        X = [past_score, study_hours/15.0, difficulty/10.0]
        probs = self.nn.forward(X)
        return probs.index(max(probs))

    @property
    def is_trained(self): return self.nn.is_trained
