import sys
import json

def solve():
    input_data = sys.stdin.read().strip()
    if not input_data or input_data == '[]':
        print("[]")
        return

    try:
        values = json.loads(input_data)
    except:
        print("[]")
        return

    if not isinstance(values, list):
        print("[]")
        return

    result = []
    sorted_list = []

    for item in values:
        # Insertion sort logic
        inserted = False
        for i in range(len(sorted_list)):
            if item <= sorted_list[i]:
                sorted_list.insert(i, item)
                inserted = True
                break
        if not inserted:
            sorted_list.append(item)
        # Append a copy of current sorted state
        result.append(list(sorted_list))

    # Print as JSON to keep double quotes
    print(json.dumps(result))
