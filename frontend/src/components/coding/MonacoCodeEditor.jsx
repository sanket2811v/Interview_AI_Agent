import React, { useEffect, useRef, useState } from 'react';
import {
  Code2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Sparkles,
  Check
} from 'lucide-react';

/**
 * Monaco Code Editor Integration
 * Dynamically loads Monaco Editor via CDN when network is available,
 * and seamlessly provides a responsive code editing experience
 * with line numbers, indentation, keyboard shortcuts, and theme controls.
 */
export function MonacoCodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  fileName,
  theme = 'vs-dark',
  fontSize = 14,
  readOnly = false,
  onRun,
  onSubmit,
  onReset,
  className = ''
}) {
  const containerRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const textareaRef = useRef(null);
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Map app language ID to Monaco language identifier
  const getMonacoLanguage = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'python':
        return 'python';
      case 'typescript':
        return 'typescript';
      case 'java':
        return 'java';
      case 'cpp':
        return 'cpp';
      case 'c':
        return 'c';
      case 'csharp':
        return 'csharp';
      case 'go':
        return 'go';
      case 'php':
        return 'php';
      case 'ruby':
        return 'ruby';
      case 'javascript':
      default:
        return 'javascript';
    }
  };

  // Get canonical file name matching execution provider requirements
  const getEditorFileName = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'java':
        return 'Main.java';
      case 'cpp':
        return 'main.cpp';
      case 'c':
        return 'main.c';
      case 'csharp':
        return 'Program.cs';
      case 'go':
        return 'main.go';
      case 'python':
        return 'solution.py';
      case 'ruby':
        return 'solution.rb';
      case 'php':
        return 'solution.php';
      case 'typescript':
        return 'solution.ts';
      case 'javascript':
      default:
        return 'solution.js';
    }
  };

  // 1. Attempt to load Monaco AMD loader once if window.monaco is not yet available
  useEffect(() => {
    if (window.monaco) {
      setIsMonacoLoaded(true);
      return;
    }

    if (window.__monacoLoading) return;
    window.__monacoLoading = true;

    const loaderScript = document.createElement('script');
    loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
    loaderScript.async = true;

    loaderScript.onload = () => {
      if (window.require) {
        window.require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
        });
        window.require(['vs/editor/editor.main'], () => {
          setIsMonacoLoaded(true);
        });
      }
    };

    loaderScript.onerror = () => {
      // Offline or network unavailable: graceful fallback
      setIsMonacoLoaded(false);
    };

    document.body.appendChild(loaderScript);
  }, []);

  // 2. Initialize or update Monaco instance when ready
  useEffect(() => {
    if (!isMonacoLoaded || !containerRef.current || !window.monaco) return;

    if (!editorInstanceRef.current) {
      editorInstanceRef.current = window.monaco.editor.create(containerRef.current, {
        value: value || '',
        language: getMonacoLanguage(language),
        theme: theme === 'vs-light' ? 'vs' : 'vs-dark',
        fontSize: fontSize,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        readOnly: readOnly,
        lineNumbers: 'on',
        fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace"
      });

      // Synchronize changes to parent state
      editorInstanceRef.current.onDidChangeModelContent(() => {
        const currentVal = editorInstanceRef.current.getValue();
        if (onChange) onChange(currentVal);
      });

      // Cursor position tracking
      editorInstanceRef.current.onDidChangeCursorPosition((e) => {
        setCursorPos({
          line: e.position.lineNumber,
          col: e.position.column
        });
      });

      // Add keyboard shortcuts to Monaco
      editorInstanceRef.current.addCommand(
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
        () => {
          if (onRun) onRun();
        }
      );
      editorInstanceRef.current.addCommand(
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.Enter,
        () => {
          if (onSubmit) onSubmit();
        }
      );
    } else {
      // Update options when props change
      const currentVal = editorInstanceRef.current.getValue();
      if (value !== currentVal) {
        editorInstanceRef.current.setValue(value || '');
      }
      window.monaco.editor.setModelLanguage(
        editorInstanceRef.current.getModel(),
        getMonacoLanguage(language)
      );
      window.monaco.editor.setTheme(theme === 'vs-light' ? 'vs' : 'vs-dark');
      editorInstanceRef.current.updateOptions({
        fontSize,
        readOnly
      });
    }

    return () => {
      // Clean up on unmount
    };
  }, [isMonacoLoaded, language, theme, fontSize, readOnly]);

  // Handle Tab and shortcuts in native editor fallback
  const handleKeyDownFallback = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const current = target.value;
      const updated = current.substring(0, start) + '  ' + current.substring(end);
      if (onChange) onChange(updated);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (onSubmit) onSubmit();
      } else {
        if (onRun) onRun();
      }
    }
  };

  const handleCursorMoveFallback = (e) => {
    const text = e.target.value.substring(0, e.target.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const isDark = theme !== 'vs-light';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all overflow-hidden ${
        isDark
          ? 'bg-[#0B1020] border-[#27324A] text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      } ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : 'h-full min-h-[420px]'
      } ${className}`}
    >
      {/* Top Editor Toolbar */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b text-xs font-mono select-none ${
          isDark
            ? 'bg-[#151C2E] border-[#27324A] text-slate-400'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Code2 className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-slate-300">
            {fileName || getEditorFileName(language)}
          </span>
          {isMonacoLoaded && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-400 font-medium">
              Monaco Engine
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset starter template"
              className="p-1.5 rounded-lg hover:bg-slate-700/30 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg hover:bg-slate-700/30 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="relative flex-1 w-full overflow-hidden">
        {isMonacoLoaded ? (
          <div ref={containerRef} className="w-full h-full min-h-[380px]" />
        ) : (
          <div className="flex h-full w-full overflow-hidden">
            {/* Native line numbers gutter */}
            <div
              className={`py-3 px-3 select-none text-right font-mono text-xs border-r opacity-50 ${
                isDark ? 'bg-[#0B1020] border-[#27324A] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {(value || '').split('\n').map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Native Code Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                if (onChange) onChange(e.target.value);
                handleCursorMoveFallback(e);
              }}
              onKeyDown={handleKeyDownFallback}
              onKeyUp={handleCursorMoveFallback}
              onClick={handleCursorMoveFallback}
              readOnly={readOnly}
              spellCheck="false"
              style={{ fontSize: `${fontSize}px` }}
              className={`flex-1 p-3 font-mono leading-6 resize-none focus:outline-none overflow-auto ${
                isDark
                  ? 'bg-[#0B1020] text-emerald-300 placeholder-slate-600'
                  : 'bg-white text-slate-900 placeholder-slate-400'
              }`}
              placeholder="// Write your code solution here..."
            />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div
        className={`flex items-center justify-between px-4 py-1.5 border-t text-[11px] font-mono select-none ${
          isDark
            ? 'bg-[#151C2E] border-[#27324A] text-slate-400'
            : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center space-x-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>{value?.length || 0} chars</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          <span className="hidden sm:inline text-slate-500">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Enter</kbd> to Run
          </span>
          <span className="font-semibold uppercase text-violet-400">{language}</span>
        </div>
      </div>
    </div>
  );
}

export default MonacoCodeEditor;

