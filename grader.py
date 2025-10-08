import subprocess
import tempfile
import json
import uuid
import os
from datetime import datetime

def transform_input(problem_id: str, raw_input: str) -> str:
    """
    Transform test case input to match expected format for specific problems.
    """
    if problem_id == "find-town-judge":
        lines = raw_input.strip().split('\n')
        
        # Get n from first line
        n = lines[0].strip() if len(lines) > 0 else "1"
        
        # Get trust array from second line (if exists)
        trust_str = lines[1].strip() if len(lines) > 1 else "[]"
        
        # Parse the trust array
        try:
            trust = json.loads(trust_str)
            m = len(trust)
            
            # Build the transformed input
            transformed = f"{n} {m}"
            for a, b in trust:
                transformed += f"\n{a} {b}"
            
            return transformed
        except Exception as e:
            # If parsing fails, return original input
            print(f"Warning: Failed to transform input for {problem_id}: {e}")
            return raw_input
    
    # Add more problem-specific transformations here as needed
    # elif problem_id == "another-problem":
    #     ...
    
    return raw_input

def grade_submission(code: str, problem_id: str, user_id: str):
    try:
        with open(f"test_cases/{problem_id}.json", "r") as f:
            test_data = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Test cases for '{problem_id}' not found.")

    all_tests = test_data.get("public_tests", []) + test_data.get("hidden_tests", [])
    total_cases = len(all_tests)
    passed_count = 0
    error_details = []

    for i, case in enumerate(all_tests):
        tmp_file = None
        try:
            # Transform the input based on problem type
            transformed_input = transform_input(problem_id, case["input"])
            
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as tmp:
                tmp_file = tmp.name
                tmp.write(code + "\n")
                tmp.write("""
if __name__ == "__main__":
    import sys
    from io import StringIO

    input_data = \"\"\"{}\"\"\"
    sys.stdin = StringIO(input_data)

    solve()
""".format(transformed_input))
                tmp.flush()

            try:
                result = subprocess.run(
                    ["python", tmp_file],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode != 0:
                    error_details.append(f"Test {i+1}: Runtime error - {result.stderr.strip()}")
                    continue
                
                user_output = result.stdout.strip()
                expected_output = case["expected_output"].strip()

                if user_output == expected_output:
                    passed_count += 1
                else:
                    error_details.append(f"Test {i+1}: Expected '{expected_output}', got '{user_output}'")
                    
            except subprocess.TimeoutExpired:
                error_details.append(f"Test {i+1}: Timeout (exceeded 5 seconds)")
                continue
            except Exception as e:
                error_details.append(f"Test {i+1}: Execution error - {str(e)}")
                continue
                
        finally:
            # Clean up temporary file
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
        "error_details": error_details[:3]
    }

    return {
        "score": passed_count,
        "total": total_cases,
        "replay_result": replay_result,
        "submission_entry": submission_entry,
        "error_details": error_details[:5]
    }