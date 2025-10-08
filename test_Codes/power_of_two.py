def solve():
    import sys
    input = sys.stdin.read
    n = int(input().strip())
    
    # Check if n is positive and has only one bit set
    if n > 0 and (n & (n - 1)) == 0:
        print("true")
    else:
        print("false")
