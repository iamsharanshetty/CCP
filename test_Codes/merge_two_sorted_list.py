class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build_linked_list(values):
    if not values:
        return None
    head = ListNode(values[0])
    current = head
    for val in values[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def print_linked_list(head):
    res = []
    while head:
        res.append(str(head.val))
        head = head.next
    print(" ".join(res))

def merge_two_lists(l1, l2):
    dummy = ListNode(-1)
    tail = dummy
    
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    
    tail.next = l1 if l1 else l2
    return dummy.next

def solve():
    import sys
    input = sys.stdin.read
    data = input().splitlines()
    
    list1_values = list(map(int, data[0].split())) if data and data[0].strip() else []
    list2_values = list(map(int, data[1].split())) if len(data) > 1 and data[1].strip() else []
    
    # If both lists are empty, print nothing
    if not list1_values and not list2_values:
        return
    
    l1 = build_linked_list(list1_values)
    l2 = build_linked_list(list2_values)
    
    merged_head = merge_two_lists(l1, l2)
    
    print_linked_list(merged_head)
