// Global state
let currentProblems = [];
let currentUser = "";
let currentProblem = "";
let codeEditor; // CodeMirror instance
// const API_BASE =
//   window.location.hostname === "localhost" ? "http://127.0.0.1:8000" : "/api";
// At the top of challenge.js, replace the API_BASE line with:
// At the top of challenge.js, replace the API_BASE line with:
// const API_BASE = (() => {
//   const hostname = window.location.hostname;
//   const protocol = window.location.protocol;

//   if (
//     protocol === "file:" ||
//     hostname === "localhost" ||
//     hostname === "127.0.0.1" ||
//     hostname === ""
//   ) {
//     return "http://127.0.0.1:8000";
//   }
//   return "/api";
// })();

const API_BASE = (() => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Local development
  if (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === ""
  ) {
    return "http://127.0.0.1:8000/api";
  }

  // Production (Render or other deployment)
  return "/api";
})();

console.log("API_BASE set to:", API_BASE);
// DOM Elements
const elements = {
  username: document.getElementById("username"),
  problemSelect: document.getElementById("problemSelect"),
  problemDescription: document.getElementById("problemDescription"),
  problemDetails: document.getElementById("problemDetails"),
  sampleTests: document.getElementById("sampleTests"),
  codeEditorTextarea: document.getElementById("codeEditor"),
  submitBtn: document.getElementById("submitBtn"),
  runBtn: document.getElementById("runBtn"),
  resultsSection: document.getElementById("resultsSection"),
  resultsContent: document.getElementById("resultsContent"),
  leaderboardSection: document.getElementById("leaderboardSection"),
  leaderboardTable: document.getElementById("leaderboardTable"),
  successModal: document.getElementById("successModal"),
  modalResults: document.getElementById("modalResults"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  darkToggle: document.getElementById("darkToggle"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  closeModal: document.getElementById("closeModal"),
  viewLeaderboard: document.getElementById("viewLeaderboard"),
  tryAnother: document.getElementById("tryAnother"),
};

// Check authentication - DISABLED FOR TESTING
// const userData = JSON.parse(localStorage.getItem("user") || "null");
// if (!userData) {
//   window.location.href = "auth.html";
// }
// const userData = { username: "" }; // Allow custom username for testing

// Check authentication and get user data
const userData = (() => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      console.error("Error parsing user data:", e);
      return null;
    }
  }
  return null;
})();

// Optional: Redirect to login if not authenticated
// Uncomment below if you want to enforce login
if (!userData) {
  window.location.href = "auth.html";
}

// Initialize CodeMirror
function initializeCodeEditor() {
  const textarea = document.getElementById("codeEditor");

  codeEditor = CodeMirror.fromTextArea(textarea, {
    // Basic settings
    mode: "python",
    theme: document.body.classList.contains("dark") ? "monokai" : "default",

    // Editor features
    lineNumbers: true,
    indentUnit: 4,
    indentWithTabs: false,
    smartIndent: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: true,

    // Linting configuration
    gutters: ["CodeMirror-lint-markers"],
    lint: {
      getAnnotations: pythonLinter,
      async: false, // Changed to false for immediate feedback
      delay: 500, // Wait 500ms after typing stops
    },

    // Extra key bindings
    extraKeys: {
      Enter: handleEnterKey,
      Tab: handleTabKey,
      "Shift-Tab": handleShiftTabKey,
      "Ctrl-/": handleCommentToggle, // Bonus: toggle comments
    },
  });

  // Set initial value
  codeEditor.setValue(`# Write your Python solution here
def solve():
    # Your code goes here
    pass`);

  // Listen for changes to validate form
  codeEditor.on("change", () => {
    validateForm();
  });

  console.log("CodeMirror initialized successfully");
}

// Python Linter - checks for basic syntax errors
function pythonLinter(text) {
  const errors = [];
  const lines = text.split("\n");
  const indentStack = [0]; // Track indentation levels

  lines.forEach((line, lineNum) => {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    // ===== ERROR 1: Unclosed brackets/parentheses/braces =====
    const openCount = (line.match(/[\(\[\{]/g) || []).length;
    const closeCount = (line.match(/[\)\]\}]/g) || []).length;

    if (openCount > closeCount) {
      errors.push({
        from: CodeMirror.Pos(
          lineNum,
          line.indexOf("(") !== -1 ? line.indexOf("(") : 0
        ),
        to: CodeMirror.Pos(lineNum, line.length),
        message: "Unclosed bracket, parenthesis, or brace",
        severity: "error",
      });
    }

    // ===== ERROR 2: Missing colon after def, if, else, etc. =====
    const colonKeywords =
      /^(def|if|elif|else|for|while|try|except|finally|class|with)\s+/;
    const hasColon = line.includes(":");

    if (colonKeywords.test(trimmed) && !hasColon) {
      errors.push({
        from: CodeMirror.Pos(lineNum, 0),
        to: CodeMirror.Pos(lineNum, line.length),
        message: `Missing colon (:) at the end of ${
          trimmed.split(/\s+/)[0]
        } statement`,
        severity: "error",
      });
    }

    // ===== ERROR 3: Invalid indentation =====
    const currentIndent = line.search(/\S/);
    if (currentIndent !== -1 && currentIndent % 4 !== 0) {
      errors.push({
        from: CodeMirror.Pos(lineNum, 0),
        to: CodeMirror.Pos(lineNum, currentIndent),
        message: "Indentation should be a multiple of 4 spaces",
        severity: "warning",
      });
    }

    // ===== ERROR 4: Common typos =====
    const typos = {
      prnt: "print",
      retrun: "return",
      eslif: "elif",
      esle: "else",
      dfe: "def",
      improt: "import",
      form: "from",
    };

    Object.keys(typos).forEach((typo) => {
      const regex = new RegExp(`\\b${typo}\\b`, "g");
      let match;
      while ((match = regex.exec(line)) !== null) {
        errors.push({
          from: CodeMirror.Pos(lineNum, match.index),
          to: CodeMirror.Pos(lineNum, match.index + typo.length),
          message: `Did you mean '${typos[typo]}'?`,
          severity: "error",
        });
      }
    });

    // ===== ERROR 5: Assignment in conditions =====
    if (/^(if|while|elif)\s+.*[^=!<>]=[^=]/.test(trimmed)) {
      const assignIndex = line.indexOf("=");
      errors.push({
        from: CodeMirror.Pos(lineNum, assignIndex),
        to: CodeMirror.Pos(lineNum, assignIndex + 1),
        message: "Use '==' for comparison, not '=' (assignment)",
        severity: "warning",
      });
    }

    // ===== ERROR 6: Multiple statements on one line =====
    if ((trimmed.match(/;/g) || []).length > 0) {
      errors.push({
        from: CodeMirror.Pos(lineNum, line.indexOf(";")),
        to: CodeMirror.Pos(lineNum, line.indexOf(";") + 1),
        message: "Avoid multiple statements on one line (PEP 8)",
        severity: "warning",
      });
    }

    // ===== ERROR 7: Missing whitespace around operators =====
    if (/\w+[+\-*/%]=\w+/.test(trimmed) && !trimmed.includes("==")) {
      errors.push({
        from: CodeMirror.Pos(lineNum, 0),
        to: CodeMirror.Pos(lineNum, line.length),
        message: "Missing whitespace around operator (PEP 8)",
        severity: "info",
      });
    }
  });

  return errors;
}

// Handle Enter key for smart indentation
function handleEnterKey(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const trimmed = line.trim();

  // Get current indentation
  const currentIndent = line.search(/\S/);
  const indent = currentIndent === -1 ? "" : line.substring(0, currentIndent);

  // Insert newline
  cm.replaceSelection("\n", "end");

  // Determine new indentation
  let newIndent = indent;

  // If line ends with colon, increase indentation
  if (trimmed.endsWith(":")) {
    newIndent = indent + "    ";
  }
  // If line is 'pass', 'break', 'continue', 'return', decrease next indent
  else if (/^(pass|break|continue|return|raise)(\s|$)/.test(trimmed)) {
    // Keep current indent but prepare to dedent next
    newIndent = indent;
  }
  // If current line only contains 'pass', 'break', etc, and we're pressing enter
  else if (
    trimmed === "pass" ||
    trimmed === "break" ||
    trimmed === "continue"
  ) {
    // Decrease indentation for next line
    if (indent.length >= 4) {
      newIndent = indent.substring(0, indent.length - 4);
    }
  }

  // Apply the new indentation
  cm.replaceSelection(newIndent, "end");
}

// Handle Tab key
function handleTabKey(cm) {
  if (cm.somethingSelected()) {
    // Indent selected lines
    cm.indentSelection("add");
  } else {
    // Insert 4 spaces at cursor
    cm.replaceSelection("    ", "end");
  }
}

// Handle Shift-Tab key
function handleShiftTabKey(cm) {
  // Dedent current line or selection
  cm.indentSelection("subtract");
}

// STEP 4: Bonus - Toggle Comments
// ========================================

function handleCommentToggle(cm) {
  const selection = cm.getSelection();
  const cursor = cm.getCursor();

  if (selection) {
    // Comment/uncomment selection
    const lines = selection.split("\n");
    const allCommented = lines.every((line) => line.trim().startsWith("#"));

    if (allCommented) {
      // Uncomment
      const uncommented = lines
        .map((line) => {
          const match = line.match(/^(\s*)#\s?/);
          return match ? line.substring(match[0].length) : line;
        })
        .join("\n");
      cm.replaceSelection(uncommented);
    } else {
      // Comment
      const commented = lines
        .map((line) => {
          if (line.trim()) {
            const indent = line.search(/\S/);
            return line.substring(0, indent) + "# " + line.substring(indent);
          }
          return line;
        })
        .join("\n");
      cm.replaceSelection(commented);
    }
  } else {
    // Toggle current line
    const line = cm.getLine(cursor.line);
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      // Uncomment
      const match = line.match(/^(\s*)#\s?/);
      if (match) {
        const newLine = line.substring(match[0].length);
        cm.replaceRange(
          newLine,
          CodeMirror.Pos(cursor.line, 0),
          CodeMirror.Pos(cursor.line, line.length)
        );
      }
    } else {
      // Comment
      const indent = line.search(/\S/);
      const newLine = line.substring(0, indent) + "# " + line.substring(indent);
      cm.replaceRange(
        newLine,
        CodeMirror.Pos(cursor.line, 0),
        CodeMirror.Pos(cursor.line, line.length)
      );
    }
  }
}

// Update theme when dark mode is toggled
function updateEditorTheme() {
  if (codeEditor) {
    const isDark = document.body.classList.contains("dark");
    codeEditor.setOption("theme", isDark ? "monokai" : "default");
  }
}

// Get code from editor
function getEditorCode() {
  return codeEditor ? codeEditor.getValue() : "";
}

// Set code in editor
function setEditorCode(code) {
  if (codeEditor) {
    codeEditor.setValue(code);
  }
}

// Pre-fill username - ENABLED FOR TESTING
// document.addEventListener("DOMContentLoaded", () => {
//   if (userData) {
//     elements.username.value = userData.username;
//     elements.username.disabled = false; // Allow editing username
//   }
//   initializeCodeEditor();
// });

// Pre-fill username from localStorage after login
document.addEventListener("DOMContentLoaded", () => {
  // Try to get user data from localStorage
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      if (userData && userData.username) {
        elements.username.value = userData.username;
        console.log("Username auto-filled:", userData.username);
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  // Always allow editing username
  elements.username.disabled = false;

  initializeCodeEditor();
});

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  await loadProblems();
  setupEventListeners();
  loadTheme();
});

// Event Listeners
function setupEventListeners() {
  elements.username.addEventListener("input", validateForm);
  elements.problemSelect.addEventListener("change", onProblemSelect);

  elements.submitBtn.addEventListener("click", submitSolution);
  elements.runBtn.addEventListener("click", runCode);
  elements.darkToggle.addEventListener("click", toggleTheme);
  elements.leaderboardBtn.addEventListener("click", showLeaderboard);
  elements.closeModal.addEventListener("click", closeModal);
  elements.viewLeaderboard.addEventListener("click", () => {
    closeModal();
    showLeaderboard();
  });
  elements.tryAnother.addEventListener("click", () => {
    closeModal();
    resetForm();
  });

  elements.successModal.addEventListener("click", (e) => {
    if (e.target === elements.successModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      if (!elements.submitBtn.disabled) {
        submitSolution();
      }
    }
    if (e.key === "Escape") {
      closeModal();
    }
  });

  elements.logoutBtn = document.getElementById("logoutBtn");
  elements.logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.location.href = "auth.html";
    }
  });
}

// Load problems from the backend
async function loadProblems() {
  try {
    console.log("DEBUG: Starting loadProblems()");
    showLoading("Loading problems...");
    console.log(`DEBUG: Fetching from ${API_BASE}/problems`);
    // const response = await fetch(`${API_BASE}/api/problems`);
    const response = await fetch(`${API_BASE}/problems`);
    console.log("DEBUG: Response received:", response.status, response.ok);
    const data = await response.json();
    console.log("DEBUG: Data received:", data);

    currentProblems = data.problems;
    console.log("DEBUG: currentProblems set to:", currentProblems);
    populateProblemsDropdown();
    hideLoading();
    console.log("DEBUG: loadProblems() completed successfully");
  } catch (error) {
    console.error("DEBUG: Error in loadProblems():", error);
    showError("Failed to load problems. Please ensure the backend is running.");
    hideLoading();
  }
}

// Populate the problems dropdown
function populateProblemsDropdown() {
  console.log("DEBUG: Starting populateProblemsDropdown()");
  console.log("DEBUG: elements.problemSelect:", elements.problemSelect);
  console.log("DEBUG: currentProblems:", currentProblems);

  elements.problemSelect.innerHTML =
    '<option value="">Select a problem...</option>';

  currentProblems.forEach((problem) => {
    console.log("DEBUG: Adding problem:", problem);
    const option = document.createElement("option");
    option.value = problem;
    option.textContent = formatProblemName(problem);
    elements.problemSelect.appendChild(option);
  });

  console.log(
    "DEBUG: Final dropdown innerHTML:",
    elements.problemSelect.innerHTML
  );
  console.log("DEBUG: populateProblemsDropdown() completed");
}

// Format problem name for display
function formatProblemName(problemId) {
  return problemId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Problem descriptions database
const problemDescriptions = {
  "power-of-two": {
    title: "Power of Two",
    description:
      "Given an integer n, return true if it is a power of two. Otherwise, return false. An integer n is a power of two, if there exists an integer x such that n == 2^x.",
    inputFormat: "A single integer n",
    outputFormat: "Print 'true' if n is a power of two, 'false' otherwise",
    constraints: ["-2^31 ≤ n ≤ 2^31 - 1"],
    examples: [
      {
        input: "1",
        output: "true",
        explanation: "2^0 = 1",
      },
      {
        input: "16",
        output: "true",
        explanation: "2^4 = 16",
      },
      {
        input: "3",
        output: "false",
        explanation: "3 is not a power of 2",
      },
    ],
  },
  "three-sum": {
    title: "Three Sum",
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.",
    inputFormat:
      "First line: integer n (array length)\nSecond line: n space-separated integers (if n > 0)",
    outputFormat:
      "Print the triplets in the format [[a,b,c],[d,e,f]] or [] if no triplets found",
    constraints: ["0 ≤ n ≤ 3000", "-10^5 ≤ nums[i] ≤ 10^5"],
    examples: [
      {
        input: "6\n-1 0 1 2 -1 -4",
        output: "[[-1,-1,2],[-1,0,1]]",
        explanation: "The triplets that sum to 0 are: [-1,-1,2] and [-1,0,1]",
      },
      {
        input: "0\n",
        output: "[]",
        explanation: "Empty array has no triplets",
      },
    ],
  },
  "binary-search-insert-position": {
    title: "Search Insert Position",
    description:
      "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order. You must write an algorithm with O(log n) runtime complexity.",
    inputFormat:
      "First line: sorted array in format [1,3,5,6]\nSecond line: target integer",
    outputFormat: "Print the index position as an integer",
    constraints: [
      "1 ≤ nums.length ≤ 10^4",
      "-10^4 ≤ nums[i] ≤ 10^4",
      "nums contains distinct values sorted in ascending order",
      "-10^4 ≤ target ≤ 10^4",
    ],
    examples: [
      {
        input: "[1,3,5,6]\n5",
        output: "2",
        explanation: "Target 5 is found at index 2",
      },
      {
        input: "[1,3,5,6]\n2",
        output: "1",
        explanation: "Target 2 should be inserted at index 1",
      },
    ],
  },
  "elimination-game": {
    title: "Elimination Game",
    description:
      "You have a list arr of all integers in the range [1, n] sorted in a strictly increasing order. Apply the following algorithm: Starting from left to right, remove the first number and every other number afterward until you reach the end of the list. Repeat the previous step again, but this time from right to left. Keep repeating the steps again, alternating left to right and right to left, until a single number remains. Given the integer n, return the last number that remains in arr.",
    inputFormat: "A single integer n",
    outputFormat: "Print the last remaining number",
    constraints: ["1 ≤ n ≤ 10^9"],
    examples: [
      {
        input: "9",
        output: "6",
        explanation:
          "arr = [1,2,3,4,5,6,7,8,9]\narr = [2,4,6,8] (left to right)\narr = [2,6] (right to left)\narr = [6] (left to right)",
      },
    ],
  },
  "find-town-judge": {
    title: "Find the Town Judge",
    description:
      "In a town, there are n people labeled from 1 to n. There is a rumor that one of these people is secretly the town judge. If the town judge exists, then: (1) The town judge trusts nobody. (2) Everybody (except for the town judge) trusts the town judge. (3) There is exactly one person that satisfies properties 1 and 2. You are given an array trust where trust[i] = [ai, bi] representing that the person labeled ai trusts the person labeled bi. Return the label of the town judge if the town judge exists and can be identified, or return -1 otherwise.",
    inputFormat:
      "First line: integer n (number of people)\nSecond line: integer m (number of trust relationships)\nNext m lines: two integers ai bi (ai trusts bi)",
    outputFormat: "Print the label of the town judge, or -1 if no judge exists",
    constraints: [
      "1 ≤ n ≤ 1000",
      "0 ≤ trust.length ≤ 10^4",
      "trust[i].length == 2",
      "All the pairs of trust are unique",
    ],
    examples: [
      {
        input: "2\n1\n1 2",
        output: "2",
        explanation:
          "Person 1 trusts person 2, and person 2 trusts nobody, so person 2 is the judge",
      },
    ],
  },
  "front-middle-back-queue": {
    title: "Design Front Middle Back Queue",
    description:
      "Design a queue that supports push and pop operations in the front, middle, and back. Implement the FrontMiddleBack class with various operations like pushFront, pushMiddle, pushBack, popFront, popMiddle, popBack.",
    inputFormat: "Series of operations to perform on the queue",
    outputFormat: "Return values for pop operations, -1 if queue is empty",
    constraints: [
      "1 ≤ val ≤ 10^9",
      "At most 1000 calls will be made to each function",
    ],
    examples: [
      {
        input: "pushFront(1)\npushBack(2)\npushMiddle(3)\npopFront()",
        output: "1",
        explanation: "Queue becomes [1,3,2], then pop front returns 1",
      },
    ],
  },
  "insertion-sort-pairs": {
    title: "Insertion Sort List",
    description:
      "Given the head of a singly linked list, sort the list using insertion sort, and return the sorted list's head. The algorithm of insertion sort is: Insertion sort iterates, consuming one input element each repetition, and growing a sorted output list. At each iteration, insertion sort removes one element from the input data, finds the location it belongs within the sorted list, and inserts it there.",
    inputFormat: "Linked list values as space-separated integers",
    outputFormat: "Print the sorted linked list values",
    constraints: [
      "The number of nodes in the list is in the range [1, 5000]",
      "-5000 ≤ Node.val ≤ 5000",
    ],
    examples: [
      {
        input: "4 2 1 3",
        output: "1 2 3 4",
        explanation: "Sort the linked list using insertion sort",
      },
    ],
  },
  "longest-common-prefix": {
    title: "Longest Common Prefix",
    description:
      "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string.",
    inputFormat: "First line: number of strings\nNext lines: the strings",
    outputFormat: "Print the longest common prefix string",
    constraints: [
      "1 ≤ strs.length ≤ 200",
      "0 ≤ strs[i].length ≤ 200",
      "strs[i] consists of only lower-case English letters",
    ],
    examples: [
      {
        input: "3\nflower\nflow\nflight",
        output: "fl",
        explanation: "The longest common prefix is 'fl'",
      },
    ],
  },
  "max-path-sum-binary-tree": {
    title: "Binary Tree Maximum Path Sum",
    description:
      "A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. The path does not need to pass through the root. The path sum of a path is the sum of the node's values in the path. Given the root of a binary tree, return the maximum path sum of any non-empty path.",
    inputFormat: "Binary tree nodes in level order (null for missing nodes)",
    outputFormat: "Print the maximum path sum",
    constraints: [
      "The number of nodes in the tree is in the range [1, 3 * 10^4]",
      "-1000 ≤ Node.val ≤ 1000",
    ],
    examples: [
      {
        input: "1 2 3",
        output: "6",
        explanation:
          "The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6",
      },
    ],
  },
  "merge-sort": {
    title: "Merge Sort",
    description:
      "Implement the merge sort algorithm to sort an array of integers in ascending order. Merge sort is a divide-and-conquer algorithm that divides the input array into two halves, recursively sorts them, and then merges the sorted halves.",
    inputFormat:
      "First line: number of elements\nSecond line: space-separated integers",
    outputFormat: "Print the sorted array as space-separated integers",
    constraints: ["1 ≤ n ≤ 10^5", "-10^9 ≤ arr[i] ≤ 10^9"],
    examples: [
      {
        input: "6\n5 2 4 7 1 3",
        output: "1 2 3 4 5 7",
        explanation: "Sort the array using merge sort algorithm",
      },
    ],
  },
  "merge-two-sorted-lists": {
    title: "Merge Two Sorted Lists",
    description:
      "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
    inputFormat:
      "First line: first sorted list values\nSecond line: second sorted list values",
    outputFormat: "Print the merged sorted list values",
    constraints: [
      "The number of nodes in both lists is in the range [0, 50]",
      "-100 ≤ Node.val ≤ 100",
      "Both list1 and list2 are sorted in non-decreasing order",
    ],
    examples: [
      {
        input: "1 2 4\n1 3 4",
        output: "1 1 2 3 4 4",
        explanation: "Merge the two sorted linked lists",
      },
    ],
  },
  "regex-matching": {
    title: "Regular Expression Matching",
    description:
      "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where: '.' Matches any single character. '*' Matches zero or more of the preceding element. The matching should cover the entire input string (not partial).",
    inputFormat: "First line: input string s\nSecond line: pattern p",
    outputFormat: "Print 'true' if s matches p, 'false' otherwise",
    constraints: [
      "1 ≤ s.length ≤ 20",
      "1 ≤ p.length ≤ 30",
      "s contains only lowercase English letters",
      "p contains only lowercase English letters, '.', and '*'",
    ],
    examples: [
      {
        input: "aa\na*",
        output: "true",
        explanation: "'a*' means zero or more 'a's, so it matches 'aa'",
      },
    ],
  },
  "stack-using-queues": {
    title: "Implement Stack using Queues",
    description:
      "Implement a last-in-first-out (LIFO) stack using only two queues. The implemented stack should support all the functions of a normal stack (push, top, pop, and empty).",
    inputFormat: "Series of operations to perform on the stack",
    outputFormat: "Return values for top and pop operations",
    constraints: [
      "1 ≤ x ≤ 9",
      "At most 100 calls will be made to push, pop, top, and empty",
    ],
    examples: [
      {
        input: "push(1)\npush(2)\ntop()\npop()",
        output: "2\n2",
        explanation: "Stack operations using queues underneath",
      },
    ],
  },
  "tiny-url-encoder": {
    title: "Encode and Decode TinyURL",
    description:
      "TinyURL is a URL shortening service where you enter a URL and it returns a short URL. Design a class to encode a URL and decode a tiny URL. There is no restriction on how your encode/decode algorithm should work. You just need to ensure that a URL can be encoded to a tiny URL and the tiny URL can be decoded to the original URL.",
    inputFormat: "URL to encode or tiny URL to decode",
    outputFormat: "Encoded tiny URL or decoded original URL",
    constraints: [
      "1 ≤ url.length ≤ 10^4",
      "url is guaranteed to be a valid URL",
    ],
    examples: [
      {
        input: "https://leetcode.com/problems/design-tinyurl",
        output: "http://tinyurl.com/4e9iAk",
        explanation: "Encode the long URL to a short one",
      },
    ],
  },
};

// Handle problem selection
async function onProblemSelect() {
  const selectedProblem = elements.problemSelect.value;

  if (!selectedProblem) {
    elements.problemDescription.classList.add("hidden");
    validateForm();
    return;
  }

  currentProblem = selectedProblem;
  await loadProblemDetails(selectedProblem);
  validateForm();
}

// Load problem details and sample tests
async function loadProblemDetails(problemId) {
  try {
    // First try to get test cases from the backend API
    // const response = await fetch(`${API_BASE}/api/problem/${problemId}`);
    const response = await fetch(`${API_BASE}/problem/${problemId}`);
    let problemData;

    if (response.ok) {
      problemData = await response.json();
    } else {
      // If API fails, create mock data from our descriptions
      const problemInfo = problemDescriptions[problemId];
      if (problemInfo) {
        problemData = {
          problem_id: problemId,
          public_tests: problemInfo.examples.map((example) => ({
            input: example.input,
            expected_output: example.output,
          })),
          total_tests: problemInfo.examples.length + 5, // Assume 5 hidden tests
        };
      } else {
        throw new Error("Problem not found");
      }
    }

    displayProblemDetails(problemData);
    elements.problemDescription.classList.remove("hidden");

    // Add animation
    setTimeout(() => {
      elements.problemDescription.style.animation = "slideUp 0.5s ease";
    }, 100);
  } catch (error) {
    console.error("Error loading problem details:", error);
    // Even if loading fails, still show the problem description if we have it
    const problemInfo = problemDescriptions[problemId];
    if (problemInfo) {
      const mockData = {
        problem_id: problemId,
        public_tests: problemInfo.examples.map((example) => ({
          input: example.input,
          expected_output: example.output,
        })),
        total_tests: problemInfo.examples.length + 5,
      };
      displayProblemDetails(mockData);
      elements.problemDescription.classList.remove("hidden");
    } else {
      showError("Failed to load problem details.");
    }
  }
}

// Display problem details and sample tests
function displayProblemDetails(problemData) {
  const problemId = problemData.problem_id || currentProblem;
  const problemInfo = problemDescriptions[problemId];

  if (problemInfo) {
    // Display comprehensive problem description
    elements.problemDetails.innerHTML = `
            <div class="problem-header">
                <h4 class="problem-title">${problemInfo.title}</h4>
                <div class="problem-meta">
                    <span class="difficulty-badge">📊 Difficulty: Medium</span>
                    <span class="language-badge">🐍 Python</span>
                    <span class="test-count-badge">📝 ${
                      (problemData.public_tests?.length || 0) +
                      (problemData.hidden_tests?.length || 0)
                    } Test Cases</span>
                </div>
            </div>

            <div class="problem-content">
                <div class="section-block">
                    <h5>📋 Problem Description</h5>
                    <p class="problem-description">${
                      problemInfo.description
                    }</p>
                </div>

                <div class="section-block">
                    <h5>📥 Input Format</h5>
                    <p class="format-description">${problemInfo.inputFormat}</p>
                </div>

                <div class="section-block">
                    <h5>📤 Output Format</h5>
                    <p class="format-description">${
                      problemInfo.outputFormat
                    }</p>
                </div>

                <div class="section-block">
                    <h5>⚡ Constraints</h5>
                    <ul class="constraints-list">
                        ${problemInfo.constraints
                          .map((constraint) => `<li>${constraint}</li>`)
                          .join("")}
                    </ul>
                </div>

                <div class="section-block">
                    <h5>💡 Examples</h5>
                    ${problemInfo.examples
                      .map(
                        (example, index) => `
                        <div class="example-case">
                            <strong>Example ${index + 1}:</strong>
                            <div class="example-content">
                                <div class="example-input">
                                    <strong>Input:</strong>
                                    <pre>${escapeHtml(example.input)}</pre>
                                </div>
                                <div class="example-output">
                                    <strong>Output:</strong>
                                    <pre>${escapeHtml(example.output)}</pre>
                                </div>
                                <div class="example-explanation">
                                    <strong>Explanation:</strong>
                                    <p>${example.explanation}</p>
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>

                <div class="section-block">
                    <h5>🎯 Implementation Note</h5>
                    <p class="implementation-note">
                        Implement a function called <code>solve()</code> that reads input from stdin and prints the result to stdout. 
                        Make sure your output format exactly matches the expected format.
                    </p>
                </div>
            </div>
        `;
  } else {
    // Fallback for problems without detailed descriptions
    const problemName = formatProblemName(problemId);
    elements.problemDetails.innerHTML = `
            <div class="problem-header">
                <h4 class="problem-title">${problemName}</h4>
                <div class="problem-meta">
                    <span class="language-badge">🐍 Python</span>
                    <span class="test-count-badge">📝 ${
                      (problemData.public_tests?.length || 0) +
                      (problemData.hidden_tests?.length || 0)
                    } Test Cases</span>
                </div>
            </div>
            <div class="problem-content">
                <p>Implement a function called <code>solve()</code> that reads input and produces the correct output.</p>
                <p><strong>Note:</strong> Analyze the sample test cases below to understand the problem requirements.</p>
            </div>
        `;
  }

  // Display sample test cases
  if (problemData.public_tests && problemData.public_tests.length > 0) {
    const sampleHtml = `
            <div class="sample-tests-section">
                <h5>🧪 Sample Test Cases</h5>
                ${problemData.public_tests
                  .slice(0, 3)
                  .map(
                    (test, index) => `
                    <div class="test-case">
                        <div class="test-header">
                            <strong>Sample ${index + 1}:</strong>
                        </div>
                        <div class="test-content">
                            <div class="test-input">
                                <strong>Input:</strong>
                                <pre>${escapeHtml(test.input)}</pre>
                            </div>
                            <div class="test-output">
                                <strong>Expected Output:</strong>
                                <pre>${escapeHtml(test.expected_output)}</pre>
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
                ${
                  problemData.public_tests.length > 3
                    ? `<div class="more-tests-note">
                        <p><em>💼 ${
                          problemData.public_tests.length - 3
                        } more public test cases + ${
                        problemData.hidden_tests?.length || 0
                      } hidden test cases</em></p>
                    </div>`
                    : ""
                }
            </div>
        `;
    elements.sampleTests.innerHTML = sampleHtml;
  }
}

// Validate form and enable/disable submit button
function validateForm() {
  const username = elements.username.value.trim();
  const problemId = elements.problemSelect.value;
  const code = getEditorCode().trim();

  console.log("Validating form:", {
    hasUsername: !!username,
    hasProblemId: !!problemId,
    hasCode: !!code,
    codeLength: code.length,
  });

  const isValid = username && problemId && code;

  elements.submitBtn.disabled = !isValid;

  if (isValid) {
    elements.submitBtn.classList.add("ready");
    console.log("Form is valid - submit button enabled");
  } else {
    elements.submitBtn.classList.remove("ready");
    console.log("Form is invalid - submit button disabled");
  }

  return isValid;
}

// Add this debugging function to check CodeMirror state
function debugCodeEditor() {
  console.log("CodeMirror Debug Info:");
  console.log("- Editor exists:", !!codeEditor);
  console.log("- Code length:", getEditorCode().length);
  console.log("- Code preview:", getEditorCode().substring(0, 100));
  console.log("- Submit button disabled:", elements.submitBtn.disabled);
}

// Call this in browser console to debug: window.debugCodeEditor()
window.debugCodeEditor = debugCodeEditor;
window.validateForm = validateForm;

// Run code without submitting
async function runCode() {
  const code = getEditorCode().trim();
  const problemId = elements.problemSelect.value;

  if (!code) {
    showError("Please write some code first.");
    return;
  }

  if (!problemId) {
    showError("Please select a problem first.");
    return;
  }

  try {
    showLoading("Running your code with public test cases...");

    // const response = await fetch(`${API_BASE}/api/run`, {
    const response = await fetch(`${API_BASE}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        problem_id: problemId,
        code: code,
      }),
    });

    const result = await response.json();
    hideLoading();

    displayRunResults(result);
  } catch (error) {
    console.error("Error running code:", error);
    hideLoading();
    showError("Failed to run code. Please try again.");
  }
}

// Display run results
function displayRunResults(result) {
  if (!result.success) {
    const errorHtml = `
      <div class="result-card failed">
        <h4>❌ Execution Failed</h4>
        <div class="result-details">
          <strong>Error:</strong>
          <pre style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin-top: 0.5rem; color: #dc2626;">${escapeHtml(
            result.error || "Unknown error"
          )}</pre>
        </div>
      </div>
    `;
    elements.resultsContent.innerHTML = errorHtml;
    elements.resultsSection.classList.remove("hidden");
    elements.resultsSection.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Build HTML for multiple test results
  const summary = result.summary;
  const testResults = result.results || [];

  let statusClass = "failed";
  let statusIcon = "❌";

  if (summary.passed === summary.total) {
    statusClass = "passed";
    statusIcon = "✅";
  } else if (summary.passed > 0) {
    statusClass = "partial";
    statusIcon = "⚠️";
  }

  let runResultsHtml = `
    <div class="result-card ${statusClass}">
      <h4>${statusIcon} Test Results: ${summary.passed}/${summary.total} Passed (${summary.percentage}%)</h4>
      <p style="margin: 0.5rem 0; color: #666;">Running against public test cases</p>
    </div>
  `;

  // Add individual test case results
  testResults.forEach((test) => {
    const testClass = test.passed ? "passed" : "failed";
    const testIcon = test.passed ? "✅" : "❌";

    runResultsHtml += `
      <div class="result-card ${testClass}" style="margin-top: 1rem;">
        <h5>${testIcon} Test Case ${test.test_number}</h5>
        
        <div class="test-case-details" style="margin-top: 1rem;">
          <div style="margin-bottom: 0.75rem;">
            <strong>Input:</strong>
            <pre style="background: rgba(248, 250, 252, 0.8); padding: 0.75rem; border-radius: 8px; margin-top: 0.25rem; font-size: 0.9rem;">${escapeHtml(
              test.input || "(empty)"
            )}</pre>
          </div>
          
          ${
            test.success
              ? `
            <div style="margin-bottom: 0.75rem;">
              <strong>Expected Output:</strong>
              <pre style="background: rgba(248, 250, 252, 0.8); padding: 0.75rem; border-radius: 8px; margin-top: 0.25rem; font-size: 0.9rem;">${escapeHtml(
                test.expected_output
              )}</pre>
            </div>
            
            <div style="margin-bottom: 0.75rem;">
              <strong>Your Output:</strong>
              <pre style="background: ${
                test.passed
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)"
              }; padding: 0.75rem; border-radius: 8px; margin-top: 0.25rem; font-size: 0.9rem;">${escapeHtml(
                  test.actual_output || "(no output)"
                )}</pre>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(248, 250, 252, 0.6); border-radius: 8px;">
              <span><strong>Status:</strong> ${
                test.passed
                  ? '<span style="color: #10b981;">Passed ✓</span>'
                  : '<span style="color: #ef4444;">Failed ✗</span>'
              }</span>
              <span><strong>Time:</strong> ${test.execution_time}s</span>
            </div>
          `
              : `
            <div style="margin-bottom: 0.75rem;">
              <strong>Error:</strong>
              <pre style="background: rgba(239, 68, 68, 0.1); padding: 0.75rem; border-radius: 8px; margin-top: 0.25rem; color: #dc2626; font-size: 0.9rem;">${escapeHtml(
                test.error || "Unknown error"
              )}</pre>
            </div>
          `
          }
        </div>
      </div>
    `;
  });

  elements.resultsContent.innerHTML = runResultsHtml;
  elements.resultsSection.classList.remove("hidden");
  elements.resultsSection.scrollIntoView({ behavior: "smooth" });
}

// Submit solution
async function submitSolution() {
  if (elements.submitBtn.disabled) {
    console.log("Submit button is disabled");
    return;
  }

  const username = elements.username.value.trim();
  const problemId = elements.problemSelect.value;
  const code = getEditorCode().trim();

  console.log("Submitting solution:", {
    username,
    problemId,
    codeLength: code.length,
  });

  if (!username || !problemId || !code) {
    showError("Please fill in all fields before submitting.");
    return;
  }

  try {
    showLoading("Evaluating your solution...");
    setSubmitButtonLoading(true);

    console.log("Sending request to:", `${API_BASE}/api/submit`);

    // const response = await fetch(`${API_BASE}/api/submit`, {
    const response = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_id: username,
        problem_id: problemId,
        code: code,
      }),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Result received:", result);

    hideLoading();
    setSubmitButtonLoading(false);

    displayResults(result);
    showSuccessModal(result);

    // Trigger confetti for good results
    if (result.grade.replay_result === "passed") {
      triggerConfetti();
    }
  } catch (error) {
    console.error("Error submitting solution:", error);
    hideLoading();
    setSubmitButtonLoading(false);
    showError(
      `Failed to submit solution: ${error.message}. Please check the console for details.`
    );
  }
}

// Display submission results
function displayResults(result) {
  const grade = result.grade;
  const score = grade.score;
  const total = grade.total;
  const status = grade.replay_result;

  let statusClass = "failed";
  let statusIcon = "❌";
  let statusText = "Failed";

  if (status === "passed") {
    statusClass = "passed";
    statusIcon = "✅";
    statusText = "All Tests Passed!";
  } else if (status === "partially") {
    statusClass = "partial";
    statusIcon = "⚠️";
    statusText = "Partially Correct";
  }

  const resultHtml = `
        <div class="result-card ${statusClass}">
            <div class="result-score ${statusClass}">
                ${statusIcon} ${score}/${total} Test Cases Passed
            </div>
            <div class="result-status">
                <strong>Status:</strong> ${statusText}
            </div>
            <div class="result-details">
                <strong>Problem:</strong> ${formatProblemName(
                  currentProblem
                )}<br>
                <strong>User:</strong> ${elements.username.value}<br>
                <strong>Submission Time:</strong> ${new Date().toLocaleString()}
            </div>
        </div>
        ${
          grade.error_details && grade.error_details.length > 0
            ? `
    <div class="error-details" style="margin-top: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
        <strong style="color: #ef4444;">Failed Tests:</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: #7f1d1d;">
            ${grade.error_details
              .map((err) => `<li>${escapeHtml(err)}</li>`)
              .join("")}
        </ul>
    </div>
`
            : ""
        }
    `;

  elements.resultsContent.innerHTML = resultHtml;
  elements.resultsSection.classList.remove("hidden");

  // Smooth scroll to results
  elements.resultsSection.scrollIntoView({ behavior: "smooth" });
}

// Show success modal
function showSuccessModal(result) {
  const grade = result.grade;
  const score = grade.score;
  const total = grade.total;

  let modalContent = `
        <div class="text-center">
            <h3>Score: ${score}/${total}</h3>
            <p><strong>Status:</strong> ${
              grade.replay_result === "passed"
                ? "Perfect Solution! 🎉"
                : grade.replay_result === "partially"
                ? "Good Progress! 🔄"
                : "Keep Trying! 💪"
            }</p>
        </div>
    `;

  elements.modalResults.innerHTML = modalContent;
  elements.successModal.classList.remove("hidden");
}

// Load and display leaderboard
async function showLeaderboard() {
  try {
    showLoading("Loading leaderboard...");

    // const response = await fetch(`${API_BASE}/api/leaderboard`);
    const response = await fetch(`${API_BASE}/leaderboard`);
    const data = await response.json();

    displayLeaderboard(data.leaderboard);
    elements.leaderboardSection.classList.remove("hidden");
    elements.leaderboardSection.scrollIntoView({ behavior: "smooth" });

    hideLoading();
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    showError("Failed to load leaderboard.");
    hideLoading();
  }
}

// Display leaderboard data
function displayLeaderboard(leaderboardData) {
  const tbody = elements.leaderboardTable.querySelector("tbody");
  tbody.innerHTML = "";

  if (!leaderboardData || leaderboardData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No submissions yet</td></tr>';
    return;
  }

  leaderboardData.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(entry.user_id)}</td>
            <td>${escapeHtml(formatProblemName(entry.problem_id))}</td>
            <td>${entry.score}</td>
            <td>${escapeHtml(entry.replay_result)}</td>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
        `;

    row.style.animation = `slideIn 0.5s ease ${index * 0.1}s both`;
    tbody.appendChild(row);
  });
}

// Theme management
function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  elements.darkToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  updateEditorTheme();
}

function loadTheme() {
  const isDark = localStorage.getItem("darkMode") === "true";
  if (isDark) {
    document.body.classList.add("dark");
    elements.darkToggle.textContent = "☀️ Light Mode";
  }
  updateEditorTheme();
}

// Utility functions
function showLoading(message = "Loading...") {
  elements.loadingOverlay.querySelector("p").textContent = message;
  elements.loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  elements.loadingOverlay.classList.add("hidden");
}

function setSubmitButtonLoading(loading) {
  const btnText = elements.submitBtn.querySelector(".btn-text");
  const spinner = elements.submitBtn.querySelector(".spinner");

  if (loading) {
    btnText.textContent = "Submitting...";
    spinner.classList.remove("hidden");
    elements.submitBtn.disabled = true;
  } else {
    btnText.textContent = "Submit Solution";
    spinner.classList.add("hidden");
    validateForm(); // Re-enable if form is valid
  }
}

function closeModal() {
  elements.successModal.classList.add("hidden");
}

function resetForm() {
  elements.username.value = "";
  elements.problemSelect.value = "";
  setEditorCode(`# Write your Python solution here
def solve():
    # Your code goes here
    pass`);
  elements.problemDescription.classList.add("hidden");
  elements.resultsSection.classList.add("hidden");
  elements.leaderboardSection.classList.add("hidden");
  validateForm();
}

function showError(message) {
  alert(`Error: ${message}`);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });

  // Additional confetti burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
    });
  }, 250);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
    });
  }, 400);
}
