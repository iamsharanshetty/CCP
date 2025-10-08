def solve():
    import sys
    import ast
    input = sys.stdin.read
    data = input().split("\n")
    
    # Parse inputs
    nums = ast.literal_eval(data[0].strip())
    target = int(data[1].strip())
    
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            print(mid)
            return
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    # If not found, left is the insert position
    print(left)
