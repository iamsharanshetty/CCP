import json
from collections import deque

class MyStack:
    def __init__(self):
        self.q1 = deque()
        self.q2 = deque()

    def push(self, x: int) -> None:
        self.q1.append(x)

    def pop(self) -> int:
        while len(self.q1) > 1:
            self.q2.append(self.q1.popleft())
        res = self.q1.popleft()
        self.q1, self.q2 = self.q2, self.q1
        return res

    def top(self) -> int:
        while len(self.q1) > 1:
            self.q2.append(self.q1.popleft())
        res = self.q1.popleft()
        self.q2.append(res)
        self.q1, self.q2 = self.q2, self.q1
        return res

    def empty(self) -> bool:
        return len(self.q1) == 0

def solve():
    operations = json.loads(input())
    values = json.loads(input())

    output = []
    stack = None

    for i in range(len(operations)):
        op = operations[i]
        val = values[i] if i < len(values) else []

        if op == "MyStack":
            stack = MyStack()
            output.append(None)
        elif op == "push":
            stack.push(val[0])
            output.append(None)
        elif op == "pop":
            output.append(stack.pop())
        elif op == "top":
            output.append(stack.top())
        elif op == "empty":
            output.append(stack.empty())

    # Convert None to null to match expected output format
    print(json.dumps(output))

