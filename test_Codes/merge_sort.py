def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    # Merge the two sorted halves
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    # Append remaining elements
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged

def solve():
    import sys
    input = sys.stdin.read
    data = input().split()
    
    if not data:
        print()
        return
    
    n = int(data[0])
    if n == 0:
        print()
        return
    
    arr = list(map(int, data[1:]))
    sorted_arr = merge_sort(arr)
    print(" ".join(map(str, sorted_arr)))
