from locust import HttpUser, task, between
import random

# This is a base class that knows how to make requests to the host
class WebsiteUser(HttpUser):
    # This URL should be your deployed Railway app URL
    host = "https://web-production-f7c0c.up.railway.app"    
    # Wait time between tasks: simulate users thinking for 1 to 5 seconds
    wait_time = between(1, 5)

    @task(10)
    def list_problems(self):
        """Simulate a user listing problems."""
        # This will hit https://web-production-92e6.up.railway.app/api/problems
        self.client.get("/api/problems", name="1. /api/problems")

    @task(5)
    def submit_code(self):
        """Simulate a user submitting a solution."""
        problem_id = "power-of-two"
        solution_code = """
def solve():
    n = int(input())
    result = n > 0 and (n & (n-1) == 0)
    print(str(result).lower())
"""
        # This will hit https://web-production-92e6.up.railway.app/api/submit
        self.client.post("/api/submit", json={
            "user_id": f"test_user_{random.randint(1, 1000)}",
            "problem_id": problem_id,
            "code": solution_code
        }, name="2. /api/submit")

    @task(1)
    def get_leaderboard(self):
        """Simulate a user viewing the leaderboard."""
        # This will hit https://web-production-92e6.up.railway.app/api/leaderboard
        self.client.get("/api/leaderboard", name="3. /api/leaderboard")