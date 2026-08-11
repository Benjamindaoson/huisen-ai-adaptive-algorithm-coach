import Editor from '@monaco-editor/react';
import type { ProblemLanguage } from '../lib/catalog';

const editorLanguages: Record<ProblemLanguage, string> = {
  java: 'java',
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
};

type Props = { language: ProblemLanguage; value: string; onChange: (value: string) => void; height?: string | number };

export function CodeEditor({ language, value, onChange, height = '360px' }: Props) {
  return (
    <div className="editor-shell" aria-label="代码编辑器">
      <Editor
        height={height}
        language={editorLanguages[language]}
        theme="vs"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={{ minimap: { enabled: false }, fontSize: 15, lineHeight: 23, lineNumbersMinChars: 3, wordWrap: 'off', automaticLayout: true, scrollBeyondLastLine: false }}
      />
    </div>
  );
}
