/**
 * Centralized Programming Language Configuration for Online Coding Practice
 * Maps supported languages to file extensions, starter templates,
 * execution settings, and provider IDs (Piston, OnlineCompiler, and Judge0).
 */

export const SUPPORTED_LANGUAGES = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    extension: 'js',
    fileName: 'solution.js',
    piston: {
      language: 'javascript',
      version: '18.15.0'
    },
    judge0: {
      languageId: 93 // Node.js 18.15.0
    },
    monacoLanguage: 'javascript',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `const fs = require('fs');

/**
 * Solve the problem reading input from standard input (stdin)
 * and printing the result to standard output (stdout).
 */
function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  if (input) {
    console.log(input);
  } else {
    console.log('Hello World');
  }
}

solve();
`
  },

  python: {
    id: 'python',
    name: 'Python 3',
    extension: 'py',
    fileName: 'solution.py',
    piston: {
      language: 'python',
      version: '3.10.0'
    },
    judge0: {
      languageId: 92 // Python 3.11.2
    },
    monacoLanguage: 'python',
    timeLimitMs: 4000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `import sys

def solve():
    """
    Read input from stdin and print solution to stdout.
    """
    raw_input = sys.stdin.read().strip()
    if raw_input:
        print(raw_input)
    else:
        print("Hello World")

if __name__ == '__main__':
    solve()
`
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    fileName: 'solution.ts',
    piston: {
      language: 'typescript',
      version: '5.0.3'
    },
    judge0: {
      languageId: 74 // TypeScript 3.7.4
    },
    monacoLanguage: 'typescript',
    timeLimitMs: 4000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `import * as fs from 'fs';

function solve(): void {
  const input: string = fs.readFileSync(0, 'utf-8').trim();
  if (input) {
    console.log(input);
  } else {
    console.log("Hello World");
  }
}

solve();
`
  },

  java: {
    id: 'java',
    name: 'Java (OpenJDK)',
    extension: 'java',
    fileName: 'Main.java',
    piston: {
      language: 'java',
      version: '15.0.2'
    },
    judge0: {
      languageId: 91 // Java OpenJDK 17.0.1
    },
    monacoLanguage: 'java',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    enabled: true,
    starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
`
  },

  cpp: {
    id: 'cpp',
    name: 'C++ (GCC)',
    extension: 'cpp',
    fileName: 'main.cpp',
    piston: {
      language: 'c++',
      version: '10.2.0'
    },
    judge0: {
      languageId: 54 // C++ GCC 9.2.0
    },
    monacoLanguage: 'cpp',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `#include <iostream>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string line;
    bool hasInput = false;
    while (getline(cin, line)) {
        hasInput = true;
        cout << line << "\\n";
    }

    if (!hasInput) {
        cout << "Hello World\\n";
    }

    return 0;
}
`
  },

  c: {
    id: 'c',
    name: 'C (GCC)',
    extension: 'c',
    fileName: 'main.c',
    piston: {
      language: 'c',
      version: '10.2.0'
    },
    judge0: {
      languageId: 50 // C GCC 9.2.0
    },
    monacoLanguage: 'c',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `#include <stdio.h>
#include <string.h>

int main() {
    char buffer[4096];
    int hasInput = 0;
    while (fgets(buffer, sizeof(buffer), stdin)) {
        hasInput = 1;
        printf("%s", buffer);
    }
    if (!hasInput) {
        printf("Hello World\\n");
    }
    return 0;
}
`
  },

  csharp: {
    id: 'csharp',
    name: 'C# (.NET)',
    extension: 'cs',
    fileName: 'Program.cs',
    piston: {
      language: 'csharp.net',
      version: '5.0.201'
    },
    judge0: {
      languageId: 51
    },
    monacoLanguage: 'csharp',
    timeLimitMs: 4000,
    memoryLimitMb: 256,
    enabled: true,
    starterCode: `using System;

public class Program {
    public static void Main(string[] args) {
        string input = Console.In.ReadToEnd().Trim();
        if (!string.IsNullOrEmpty(input)) {
            Console.WriteLine(input);
        } else {
            Console.WriteLine("Hello World");
        }
    }
}
`
  },

  go: {
    id: 'go',
    name: 'Go',
    extension: 'go',
    fileName: 'main.go',
    piston: {
      language: 'go',
      version: '1.16.2'
    },
    judge0: {
      languageId: 60
    },
    monacoLanguage: 'go',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    var lines []string
    for {
        line, err := reader.ReadString('\\n')
        if len(line) > 0 {
            lines = append(lines, strings.TrimRight(line, "\\r\\n"))
        }
        if err != nil {
            break
        }
    }

    if len(lines) > 0 {
        for _, l := range lines {
            fmt.Println(l)
        }
    } else {
        fmt.Println("Hello World")
    }
}
`
  },

  php: {
    id: 'php',
    name: 'PHP',
    extension: 'php',
    fileName: 'solution.php',
    piston: {
      language: 'php',
      version: '8.2.3'
    },
    judge0: {
      languageId: 68
    },
    monacoLanguage: 'php',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `<?php
$input = trim(file_get_contents('php://stdin'));
if (!empty($input)) {
    echo $input . "\\n";
} else {
    echo "Hello World\\n";
}
?>
`
  },

  ruby: {
    id: 'ruby',
    name: 'Ruby',
    extension: 'rb',
    fileName: 'solution.rb',
    piston: {
      language: 'ruby',
      version: '3.0.1'
    },
    judge0: {
      languageId: 72
    },
    monacoLanguage: 'ruby',
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    enabled: true,
    starterCode: `input = $stdin.read.strip
if !input.empty?
  puts input
else
  puts "Hello World"
end
`
  }
};

/**
 * Returns list of public language descriptors for the frontend
 */
export function getAvailableLanguages() {
  return Object.values(SUPPORTED_LANGUAGES)
    .filter((lang) => lang.enabled)
    .map((lang) => ({
      id: lang.id,
      name: lang.name,
      extension: lang.extension,
      fileName: lang.fileName,
      monacoLanguage: lang.monacoLanguage,
      timeLimitMs: lang.timeLimitMs,
      memoryLimitMb: lang.memoryLimitMb
    }));
}

/**
 * Validates whether a language identifier is supported
 */
export function isLanguageSupported(language) {
  if (!language || typeof language !== 'string') return false;
  const normalized = language.toLowerCase();
  return Boolean(SUPPORTED_LANGUAGES[normalized]?.enabled);
}

/**
 * Gets specific language config
 */
export function getLanguageConfig(language) {
  if (!language || typeof language !== 'string') return null;
  return SUPPORTED_LANGUAGES[language.toLowerCase()] || null;
}
