def solve():
    import sys
    input = sys.stdin.read
    data = input().strip().split()
    
    if not data:
        print("")
        return
    
    n = int(data[0])
    strs = data[1:]
    
    if n == 0 or not strs:
        print("")
        return
    
    # Start with the first string as prefix
    prefix = strs[0]
    
    for s in strs[1:]:
        # Reduce prefix until it matches the start of s
        while not s.startswith(prefix):
            prefix = prefix[:-1]
            if prefix == "":
                print("")
                return
    
    print(prefix)
