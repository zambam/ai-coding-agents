import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  showLineNumbers = false,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div
      className={`relative group bg-zinc-900 dark:bg-zinc-950 rounded-md overflow-hidden ${className}`}
      data-testid="code-block"
    >
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
          data-testid="button-copy-code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {language && (
        <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm">
        <code className="font-mono text-zinc-100">
          {showLineNumbers
            ? lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-zinc-600 select-none text-right pr-4">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
