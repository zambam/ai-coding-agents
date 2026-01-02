import * as fs from "fs";
import * as path from "path";

export interface FileContext {
  path: string;
  content: string;
  exists: boolean;
  error?: string;
}

export interface LoadResult {
  files: FileContext[];
  taskWithContext: string;
  hasErrors: boolean;
  errors: string[];
}

const FILE_PATH_PATTERNS = [
  /(?:^|\s)((?:\.\/|\.\.\/|\/)?(?:[\w-]+\/)*[\w.-]+\.(ts|tsx|js|jsx|md|json|py|yaml|yml|txt|css|html|sql))\b/gi,
  /["'`]((?:\.\/|\.\.\/|\/)?(?:[\w-]+\/)*[\w.-]+\.(ts|tsx|js|jsx|md|json|py|yaml|yml|txt|css|html|sql))["'`]/gi,
];

export function extractFilePaths(task: string): string[] {
  const paths = new Set<string>();
  
  for (const pattern of FILE_PATH_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(task)) !== null) {
      const filePath = match[1];
      if (filePath && !filePath.startsWith("http") && !filePath.includes("://")) {
        paths.add(filePath);
      }
    }
  }
  
  return Array.from(paths);
}

export function loadFileContent(filePath: string): FileContext {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  
  try {
    if (!fs.existsSync(resolvedPath)) {
      return {
        path: filePath,
        content: "",
        exists: false,
        error: `File not found: ${filePath}`,
      };
    }
    
    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      return {
        path: filePath,
        content: "",
        exists: false,
        error: `Path is a directory, not a file: ${filePath}`,
      };
    }
    
    const content = fs.readFileSync(resolvedPath, "utf-8");
    
    if (content.length > 100000) {
      return {
        path: filePath,
        content: content.slice(0, 100000) + "\n\n[... TRUNCATED - file exceeds 100KB ...]",
        exists: true,
      };
    }
    
    return {
      path: filePath,
      content,
      exists: true,
    };
  } catch (error) {
    return {
      path: filePath,
      content: "",
      exists: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function loadTaskContext(task: string, additionalFiles: string[] = []): LoadResult {
  const detectedPaths = extractFilePaths(task);
  const allPaths = [...new Set([...detectedPaths, ...additionalFiles])];
  
  const files: FileContext[] = [];
  const errors: string[] = [];
  
  for (const filePath of allPaths) {
    const fileContext = loadFileContent(filePath);
    files.push(fileContext);
    
    if (!fileContext.exists) {
      errors.push(fileContext.error || `File not found: ${filePath}`);
    }
  }
  
  let taskWithContext = task;
  
  if (files.length > 0) {
    const loadedFiles = files.filter(f => f.exists);
    
    if (loadedFiles.length > 0) {
      const contextSection = loadedFiles
        .map(f => `\n\n=== FILE: ${f.path} ===\n${f.content}\n=== END FILE ===`)
        .join("\n");
      
      taskWithContext = `${task}\n\n--- FILE CONTENTS (${loadedFiles.length} files) ---${contextSection}`;
    }
  }
  
  return {
    files,
    taskWithContext,
    hasErrors: errors.length > 0,
    errors,
  };
}

export function validateContextLoaded(result: LoadResult, strict: boolean = true): void {
  if (result.files.length === 0) {
    return;
  }
  
  const loadedCount = result.files.filter(f => f.exists).length;
  const totalCount = result.files.length;
  
  if (loadedCount === 0 && totalCount > 0) {
    const errorMsg = [
      "CRITICAL: No files could be loaded!",
      "The AI agent will receive NO file context and produce garbage output.",
      "",
      "Files that failed to load:",
      ...result.errors.map(e => `  - ${e}`),
      "",
      "Please verify file paths exist and try again.",
    ].join("\n");
    
    if (strict) {
      throw new Error(errorMsg);
    } else {
      console.error("\n" + errorMsg + "\n");
    }
  } else if (result.hasErrors) {
    console.warn(`\nWarning: ${totalCount - loadedCount}/${totalCount} files failed to load:`);
    for (const error of result.errors) {
      console.warn(`  - ${error}`);
    }
    console.warn("");
  }
  
  if (loadedCount > 0) {
    console.log(`Loaded ${loadedCount} file(s) for context:`);
    for (const file of result.files.filter(f => f.exists)) {
      const sizeKB = (file.content.length / 1024).toFixed(1);
      console.log(`  + ${file.path} (${sizeKB} KB)`);
    }
    console.log("");
  }
}

export function buildContextPrompt(
  task: string,
  additionalFiles: string[] = [],
  strict: boolean = true
): string {
  const result = loadTaskContext(task, additionalFiles);
  validateContextLoaded(result, strict);
  return result.taskWithContext;
}
