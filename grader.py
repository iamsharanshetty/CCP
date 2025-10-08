import subprocess
import tempfile
import json
import uuid
import os
import time
import re
from datetime import datetime

def transform_code_returns_to_prints(code: str) -> str:
    """
    Transform return statements in solve() function to print statements.
    Handles multiple returns and preserves function exit behavior.
    """
    lines = code.split('\n')
    transformed_lines = []
    inside_solve = False
    solve_indent = 0
    
    for line in lines:
        # Check if we're entering the solve function
        if re.match(r'^def\s+solve\s*\(', line.strip()):
            inside_solve = True
            solve_indent = len(line) - len(line.lstrip())
            transformed_lines.append(line)
            continue
        
        # Check if we've exited the solve function (new function or unindented code)
        if inside_solve:
            current_indent = len(line) - len(line.lstrip())
            # Empty lines or comments don't change scope
            if line.strip() and not line.strip().startswith('#'):
                # If we hit code at same or less indentation as 'def solve', we've exited
                if current_indent <= solve_indent:
                    inside_solve = False
        
        # Transform return statements inside solve()
        if inside_solve:
            stripped = line.strip()
            # Match return statements (but not in strings or comments)
            if stripped.startswith('return ') and not line.strip().startswith('#'):
                # Get the indentation
                indent = line[:len(line) - len(line.lstrip())]
                # Extract what's being returned
                return_value = stripped[7:].strip()  # Remove 'return '
                
                if return_value and return_value != 'None':
                    # Replace with print + return (to maintain exit behavior)
                    transformed_lines.append(f"{indent}print({return_value})")
                    transformed_lines.append(f"{indent}return")
                else:
                    # Just return (no value to print)
                    transformed_lines.append(line)
            else:
                transformed_lines.append(line)
        else:
            transformed_lines.append(line)
    
    return '\n'.join(transformed_lines)

def grade_submission(code: str, problem_id: str, user_id: str):
    """
    Grade a code submission against test cases.
    Automatically converts return statements to prints in solve() function.
    """
    try:
        with open(f"test_cases/{problem_id}.json", "r") as f:
            test_data = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Test cases for '{problem_id}' not found.")

    # Transform the code to convert returns to prints
    transformed_code = transform_code_returns_to_prints(code)
    
    all_tests = test_data.get("public_tests", []) + test_data.get("hidden_tests", [])
    total_cases = len(all_tests)
    passed_count = 0
    error_details = []
    total_execution_time = 0.0

    for i, case in enumerate(all_tests):
        tmp_file = None
        try:
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as tmp:
                tmp_file = tmp.name
                # Use transformed code instead of original
                tmp.write(transformed_code + "\n")
                tmp.write("""
if __name__ == "__main__":
    import sys
    from io import StringIO

    input_data = \"\"\"{}\"\"\"
    sys.stdin = StringIO(input_data)

    solve()
""".format(case["input"]))
                tmp.flush()

            try:
                start_time = time.time()
                result = subprocess.run(
                    ["python", tmp_file],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                execution_time = time.time() - start_time
                total_execution_time += execution_time
                
                if result.returncode != 0:
                    error_details.append(f"Test {i+1}: Runtime error - {result.stderr.strip()}")
                    continue
                
                user_output = result.stdout.strip()
                expected_output = case["expected_output"].strip()

                # Normalize whitespace for comparison
                user_output_normalized = user_output.replace(" ", "")
                expected_output_normalized = expected_output.replace(" ", "")

                if user_output_normalized == expected_output_normalized:
                    passed_count += 1
                else:
                    error_details.append(f"Test {i+1}: Expected '{expected_output}', got '{user_output}'")
                    
            except subprocess.TimeoutExpired:
                error_details.append(f"Test {i+1}: Timeout (exceeded 5 seconds)")
                total_execution_time += 5.0
                continue
            except Exception as e:
                error_details.append(f"Test {i+1}: Execution error - {str(e)}")
                continue
                
        finally:
            if tmp_file and os.path.exists(tmp_file):
                try:
                    os.unlink(tmp_file)
                except OSError:
                    pass

    replay_result = "passed" if passed_count == total_cases else (
        "partially" if passed_count > 0 else "failed"
    )

    submission_entry = {
        "submission_id": str(uuid.uuid4()),
        "user_id": user_id,
        "problem_id": problem_id,
        "score": passed_count,
        "replay_result": replay_result,
        "timestamp": datetime.utcnow(),
        "execution_time": round(total_execution_time, 3),
        "error_details": error_details[:3]
    }

    return {
        "score": passed_count,
        "total": total_cases,
        "replay_result": replay_result,
        "execution_time": round(total_execution_time, 3),
        "submission_entry": submission_entry,
        "error_details": error_details[:5]
    }