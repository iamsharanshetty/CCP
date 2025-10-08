def solve():
    import sys
    input = sys.stdin.read
    data = input().split()
    
    n = int(data[0])
    if n == 0:
        print([])
        return
    
    nums = list(map(int, data[1:]))
    nums.sort()
    res = []
    
    for i in range(n):
        if i > 0 and nums[i] == nums[i-1]:
            continue  # skip duplicates
        
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                res.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                # Skip duplicates
                while left < right and nums[left] == nums[left-1]:
                    left += 1
                while left < right and nums[right] == nums[right+1]:
                    right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
                
    print(res)
