from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
import os
import json
import subprocess
import tempfile
import time
import uuid

# Try to import database functions, falling back gracefully if not available.
try:
    from database import init_db, create_user, verify_user
    DATABASE_AVAILABLE = True
    print("✓ Database module imported successfully")
except ImportError as e:
    DATABASE_AVAILABLE = False
    print(f"⚠ Warning: Database module not available - {e}")
    print("⚠ Authentication will not work.")

from grader import grade_submission

app = FastAPI()

# CRITICAL: Add CORS middleware FIRST, before any routes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development/deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("✓ CORS middleware configured")

# Load existing submissions from a JSON file.
leaderboard_file = "leaderboard.json"
if os.path.exists(leaderboard_file):
    with open(leaderboard_file, "r") as f:
        submissions = json.load(f)
else:
    submissions = []

# Initialize the database on application startup.
@app.on_event("startup")
async def startup():
    print("🚀 Starting server...")
    if DATABASE_AVAILABLE:
        try:
            init_db()
            print("✓ Database initialized successfully")
        except Exception as e:
            print(f"✗ Database initialization failed: {e}")
    else:
        print("⚠ Running without database support")

# --- Pydantic Models for API Request Body Validation ---
class Submission(BaseModel):
    user_id: str
    problem_id: str
    code: str

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str
    
# --- API Endpoints ---
# All API endpoints are prefixed with '/api' to avoid conflicts with frontend paths.

@app.get("/api")
async def root_api():
    """Root API endpoint for health checks."""
    return {
        "message": "Coding Challenge API is running!",
        "status": "ok",
        "database_available": DATABASE_AVAILABLE
    }

# @app.post("/api/signup")
# async def signup_api(request: SignupRequest):
#     """User signup endpoint."""
#     if not DATABASE_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Database service unavailable.")
#     try:
#         result = create_user(request.username, request.email, request.password)
#         if not result["success"]:
#             raise HTTPException(status_code=400, detail=result["error"])
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/login")
# async def login_api(request: LoginRequest):
#     """User login endpoint."""
#     if not DATABASE_AVAILABLE:
#         raise HTTPException(status_code=503, detail="Database service unavailable")
#     try:
#         result = verify_user(request.username, request.password)
#         if not result["success"]:
#             raise HTTPException(status_code=401, detail=result["error"])
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/problems")
def list_problems_api():
    """List all available problems from test cases."""
    problems = []
    test_cases_dir = "test_cases"
    if not os.path.exists(test_cases_dir):
        return {"problems": []}
    for file in os.listdir(test_cases_dir):
        if file.endswith(".json"):
            try:
                with open(os.path.join(test_cases_dir, file), "r") as f:
                    data = json.load(f)
                if "public_tests" in data or "hidden_tests" in data:
                    problems.append(file.replace(".json", ""))
            except Exception:
                continue
    return {"problems": problems}

@app.get("/api/problem/{problem_id}")
def get_problem_details_api(problem_id: str):
    """Get detailed information about a specific problem."""
    try:
        test_case_path = os.path.join("test_cases", f"{problem_id}.json")
        if not os.path.exists(test_case_path):
            raise HTTPException(status_code=404, detail="Problem not found")
        with open(test_case_path, "r") as f:
            problem_data = json.load(f)
        return {
            "problem_id": problem_id,
            "public_tests": problem_data.get("public_tests", []),
            "hidden_tests_count": len(problem_data.get("hidden_tests", [])),
            "total_tests": len(problem_data.get("public_tests", [])) + len(problem_data.get("hidden_tests", []))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading problem: {str(e)}")

@app.post("/api/submit")
async def submit_code_api(submission: Submission):
    """Submit code for grading and update leaderboard."""
    test_case_path = os.path.join("test_cases", f"{submission.problem_id}.json")
    if not os.path.exists(test_case_path):
        raise HTTPException(status_code=404, detail="Problem test cases not found")
    try:
        result = grade_submission(
            code=submission.code,
            problem_id=submission.problem_id,
            user_id=submission.user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")

    submission_entry = {
        "submission_id": str(uuid.uuid4()),
        "user_id": submission.user_id,
        "problem_id": submission.problem_id,
        "score": result["score"],
        "replay_result": f"{result['score']}/{result['total']} tests passed",
        "timestamp": datetime.now().isoformat(),
        "execution_time": result.get("execution_time", 0.0),
        "error_details": result.get("error_details", [])
    }
    global submissions
    existing_index = next((i for i, entry in enumerate(submissions)
                           if entry["user_id"] == submission.user_id and entry["problem_id"] == submission.problem_id), None)
    if existing_index is not None:
        # Update if score is better, or if score is same but time is better
        existing_submission = submissions[existing_index]
        should_update = (
            submission_entry["score"] > existing_submission["score"] or
            (submission_entry["score"] == existing_submission["score"] and 
             submission_entry["execution_time"] < existing_submission.get("execution_time", float('inf')))
        )
        if should_update:
            submissions[existing_index] = submission_entry
    else:
        submissions.append(submission_entry)
    try:
        with open(leaderboard_file, "w") as f:
            json.dump(submissions, f, indent=2, default=str)
    except Exception as e:
        print(f"Warning: Failed to save leaderboard: {e}")
    return {
        "grade": {
            "score": result["score"],
            "total": result["total"],
            "replay_result": result["replay_result"],
            "error_details": result.get("error_details", [])[:3]
        },
        "leaderboard_entry": submission_entry
    }

# @app.post("/api/run")
# async def run_code_api(request: dict):
#     """Run code without grading."""
#     try:
#         problem_id = request.get("problem_id")
#         code = request.get("code")
#         if not problem_id or not code:
#             return {"success": False, "error": "Missing problem_id or code"}
#         test_case_path = os.path.join("test_cases", f"{problem_id}.json")
#         test_input = ""
#         if os.path.exists(test_case_path):
#             with open(test_case_path, "r") as f:
#                 test_data = json.load(f)
#             public_tests = test_data.get("public_tests", [])
#             if public_tests:
#                 test_input = public_tests[0].get("input", "")
#         tmp_file = None
#         try:
#             with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as tmp:
#                 tmp_file = tmp.name
#                 tmp.write(code + "\n")
#                 tmp.write(f"""
# if __name__ == "__main__":
#     import sys
#     from io import StringIO
    
#     input_data = '''{test_input}'''
#     sys.stdin = StringIO(input_data)
    
#     solve()
# """)
#                 tmp.flush()
#             start_time = time.time()
#             result = subprocess.run(
#                 ["python", tmp_file],
#                 capture_output=True,
#                 text=True,
#                 timeout=5
#             )
#             execution_time = round(time.time() - start_time, 3)
#             if result.returncode != 0:
#                 return {
#                     "success": False,
#                     "error": result.stderr or "Runtime error occurred",
#                     "execution_time": execution_time
#                 }
#             return {
#                 "success": True,
#                 "output": result.stdout or "(No output)",
#                 "execution_time": execution_time,
#                 "test_input": test_input
#             }
#         finally:
#             if tmp_file and os.path.exists(tmp_file):
#                 try:
#                     os.unlink(tmp_file)
#                 except:
#                     pass
#     except subprocess.TimeoutExpired:
#         return {"success": False, "error": "Execution timeout (5 seconds)"}
#     except Exception as e:
#         return {"success": False, "error": f"Execution error: {str(e)}"}

@app.post("/api/run")
async def run_code_api(request: dict):
    """Run code with multiple public test cases without grading."""
    try:
        problem_id = request.get("problem_id")
        code = request.get("code")
        
        if not problem_id or not code:
            return {"success": False, "error": "Missing problem_id or code"}
        
        # Load test cases
        test_case_path = os.path.join("test_cases", f"{problem_id}.json")
        
        if not os.path.exists(test_case_path):
            return {"success": False, "error": "Test cases not found"}
        
        with open(test_case_path, "r") as f:
            test_data = json.load(f)
        
        # Get all public test cases (limit to 4)
        public_tests = test_data.get("public_tests", [])[:4]
        
        if not public_tests:
            return {"success": False, "error": "No public test cases available"}
        
        # Run code against all public test cases
        results = []
        
        for idx, test_case in enumerate(public_tests):
            test_input = test_case.get("input", "")
            expected_output = test_case.get("expected_output", "").strip()
            
            tmp_file = None
            try:
                # Create temporary file with the code
                with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as tmp:
                    tmp_file = tmp.name
                    tmp.write(code + "\n")
                    tmp.write(f"""
if __name__ == "__main__":
    import sys
    from io import StringIO
    
    input_data = '''{test_input}'''
    sys.stdin = StringIO(input_data)
    
    solve()
""")
                    tmp.flush()
                
                # Run the code
                start_time = time.time()
                result = subprocess.run(
                    ["python", tmp_file],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                execution_time = round(time.time() - start_time, 3)
                
                # Check if execution was successful
                if result.returncode != 0:
                    results.append({
                        "test_number": idx + 1,
                        "success": False,
                        "error": result.stderr or "Runtime error occurred",
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": None,
                        "execution_time": execution_time,
                        "passed": False
                    })
                else:
                    actual_output = result.stdout.strip()
                    
                    # Check if output matches expected
                    passed = actual_output.replace(" ", "") == expected_output.replace(" ", "")
                    
                    results.append({
                        "test_number": idx + 1,
                        "success": True,
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": actual_output,
                        "execution_time": execution_time,
                        "passed": passed
                    })
                    
            except subprocess.TimeoutExpired:
                results.append({
                    "test_number": idx + 1,
                    "success": False,
                    "error": "Execution timeout (5 seconds)",
                    "input": test_input,
                    "expected_output": expected_output,
                    "actual_output": None,
                    "execution_time": 5.0,
                    "passed": False
                })
            except Exception as e:
                results.append({
                    "test_number": idx + 1,
                    "success": False,
                    "error": f"Execution error: {str(e)}",
                    "input": test_input,
                    "expected_output": expected_output,
                    "actual_output": None,
                    "execution_time": 0,
                    "passed": False
                })
            finally:
                # Clean up temporary file
                if tmp_file and os.path.exists(tmp_file):
                    try:
                        os.unlink(tmp_file)
                    except:
                        pass
        
        # Calculate summary
        passed_count = sum(1 for r in results if r.get("passed", False))
        total_count = len(results)
        
        return {
            "success": True,
            "results": results,
            "summary": {
                "passed": passed_count,
                "total": total_count,
                "percentage": round((passed_count / total_count) * 100, 1) if total_count > 0 else 0
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

@app.get("/api/leaderboard")
async def get_leaderboard_api():
    """Get the leaderboard."""
    if not submissions:
        return {"leaderboard": []}
    problems = {}
    for entry in submissions:
        pid = entry.get("problem_id", "unknown")
        if pid not in problems:
            problems[pid] = []
        problems[pid].append(entry)
    leaderboard = []
    for problem_id, entries in problems.items():
        sorted_entries = sorted(entries, key=lambda x: (-x["score"], x.get("execution_time", float('inf')), x["timestamp"]))
        seen_users = set()
        for entry in sorted_entries:
            uid = entry["user_id"]
            if uid not in seen_users:
                leaderboard.append({
                    "user_id": uid,
                    "problem_id": problem_id,
                    "score": entry["score"],
                    "replay_result": entry["replay_result"],
                    "timestamp": entry["timestamp"],
                    "execution_time": entry.get("execution_time", 0.0)
                })
                seen_users.add(uid)
    leaderboard.sort(key=lambda x: (-x["score"], x.get("execution_time", float('inf')), x["timestamp"]))
    return {"leaderboard": leaderboard}

# --- Serve Static Frontend Files ---
# This MUST be the last route defined to act as a fallback for all non-API paths.
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# --- Main Entry Point for Local Development ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)