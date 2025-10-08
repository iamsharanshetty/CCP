def solve():
    import sys
    input = sys.stdin.read
    data = input().split()
    s = data[0]
    p = data[1]

    m, n = len(s), len(p)

    # dp[i][j] is True if s[:i] matches p[:j]
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True  # empty string matches empty pattern

    # Initialize for patterns like a*, a*b*, a*b*c* matching empty string
    for j in range(2, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 2]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == s[i - 1] or p[j - 1] == '.':
                dp[i][j] = dp[i - 1][j - 1]
            elif p[j - 1] == '*':
                # zero occurrence of the char before '*'
                dp[i][j] = dp[i][j - 2]
                # one or more occurrence of the char before '*'
                if p[j - 2] == s[i - 1] or p[j - 2] == '.':
                    dp[i][j] |= dp[i - 1][j]

    print("True" if dp[m][n] else "False")
