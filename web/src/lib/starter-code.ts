import type { ProblemLanguage } from './catalog';

const templates: Record<ProblemLanguage, string> = {
  python: `import sys

def solve():
    data = sys.stdin.read().strip().splitlines()
    # 在这里编写你的解法

if __name__ == "__main__":
    solve()
`,
  javascript: `const fs = require('fs');

const input = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);

function solve(lines) {
  // 在这里编写你的解法
}

solve(input);
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        // 在这里编写你的解法
    }
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // 在这里编写你的解法
    return 0;
}
`,
};

export function starterCode(language: ProblemLanguage): string {
  return templates[language];
}

export function initialEditorCode(language: ProblemLanguage, draft: string | undefined, reference: string | undefined): string {
  if (!draft?.trim()) return starterCode(language);
  if (reference?.trim() && draft.trim() === reference.trim()) return starterCode(language);
  return draft;
}
