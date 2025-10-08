from collections import deque

# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(level_order):
    if not level_order or level_order[0] == 'null':
        return None

    root = TreeNode(int(level_order[0]))
    queue = deque([root])
    i = 1
    while queue and i < len(level_order):
        node = queue.popleft()
        if i < len(level_order) and level_order[i] != 'null':
            node.left = TreeNode(int(level_order[i]))
            queue.append(node.left)
        i += 1
        if i < len(level_order) and level_order[i] != 'null':
            node.right = TreeNode(int(level_order[i]))
            queue.append(node.right)
        i += 1
    return root

def maxPathSum(root):
    max_sum = float('-inf')

    def dfs(node):
        nonlocal max_sum
        if not node:
            return 0
        left = max(dfs(node.left), 0)
        right = max(dfs(node.right), 0)
        max_sum = max(max_sum, node.val + left + right)
        return node.val + max(left, right)

    dfs(root)
    return max_sum

def solve():
    import sys
    input = sys.stdin.read
    data = input().strip()
    
    if data == "[]":
        print(0)
        return
    
    # Split level-order by commas and remove extra spaces
    data = [x.strip() for x in data.strip('[]').split(',')]
    root = build_tree(data)
    print(maxPathSum(root))
