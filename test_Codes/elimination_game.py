def solve():
    import sys
    input = sys.stdin.read
    n = int(input().strip())
    
    head = 1       # first number
    step = 1       # distance between remaining numbers
    left = True    # direction of elimination
    remaining = n  # number of remaining elements
    
    while remaining > 1:
        # update head if eliminating from left or if remaining count is odd
        if left or remaining % 2 == 1:
            head += step
        step *= 2
        remaining //= 2
        left = not left  # change direction
    
    print(head)
