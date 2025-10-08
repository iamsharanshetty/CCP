def solve():
    import sys, json
    input = sys.stdin.read
    data = input().splitlines()
    
    operations = json.loads(data[0])
    values = json.loads(data[1])
    
    obj = {}
    output = []
    
    for op, val in zip(operations, values):
        if op == "encode":
            # store mapping of <short> to original URL
            obj["<short>"] = val[0]
            output.append("<short>")
        elif op == "decode":
            output.append(obj.get("<short>", ""))
    
    import json
    print(json.dumps(output))
