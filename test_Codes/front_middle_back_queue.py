import sys
import json
from collections import deque

class FrontMiddleBackQueue:
    def __init__(self):
        self.q = deque()

    def pushFront(self, val: int):
        self.q.appendleft(val)

    def pushMiddle(self, val: int):
        mid = len(self.q) // 2
        self.q.insert(mid, val)

    def pushBack(self, val: int):
        self.q.append(val)

    def popFront(self) -> int:
        if not self.q:
            return -1
        return self.q.popleft()

    def popMiddle(self) -> int:
        if not self.q:
            return -1
        mid = (len(self.q) - 1) // 2
        val = self.q[mid]
        del self.q[mid]
        return val

    def popBack(self) -> int:
        if not self.q:
            return -1
        return self.q.pop()


def solve():
    input_data = sys.stdin.read().strip().split("\n")
    operations = json.loads(input_data[0])
    values = json.loads(input_data[1])

    obj = None
    output = []

    for i in range(len(operations)):
        op = operations[i]
        val = values[i] if i < len(values) else []

        if op == "FrontMiddleBackQueue":
            obj = FrontMiddleBackQueue()
            output.append(None)
        elif op == "pushFront":
            obj.pushFront(val[0])
            output.append(None)
        elif op == "pushMiddle":
            obj.pushMiddle(val[0])
            output.append(None)
        elif op == "pushBack":
            obj.pushBack(val[0])
            output.append(None)
        elif op == "popFront":
            output.append(obj.popFront())
        elif op == "popMiddle":
            output.append(obj.popMiddle())
        elif op == "popBack":
            output.append(obj.popBack())

    print(json.dumps(output))
