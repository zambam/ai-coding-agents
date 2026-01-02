import * as fs from "fs";
import * as path from "path";

export interface FileContext {
  path: string;
  resolvedPath: string;
  content: string;
  exists: boolean;
  sizeBytes: number;
  truncated: boolean;
  error?: string;
  errorCode?: "NOT_FOUND" | "IS_DIRECTORY" | "PERMISSION_DENIED" | "ENCODING_ERROR" | "READ_ERROR";
}

export interface LoadResult {
  files: FileContext[];
  taskWithContext: string;
  hasErrors: boolean;
  errors: string[];
  totalContentBytes: number;
  estimatedTokens: number;
  warnings: string[];
}

export interface LoaderConfig {
  maxFileSizeBytes: number;
  maxTotalBytes: number;
  maxEstimatedTokens: number;
  strict: boolean;
  encoding: BufferEncoding;
  additionalExtensions: string[];
}

const DEFAULT_CONFIG: LoaderConfig = {
  maxFileSizeBytes: 100000,
  maxTotalBytes: 500000,
  maxEstimatedTokens: 32000,
  strict: true,
  encoding: "utf-8",
  additionalExtensions: [],
};

const BASE_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "md", "mdx", "txt", "json", "yaml", "yml",
  "py", "rb", "go", "rs", "java", "kt", "scala",
  "c", "cpp", "h", "hpp", "cs",
  "sql", "graphql", "gql",
  "css", "scss", "sass", "less",
  "html", "htm", "xml", "svg",
  "sh", "bash", "zsh", "fish",
  "toml", "ini", "cfg", "conf", "env",
  "dockerfile", "makefile", "gitignore",
];

function buildExtensionPattern(additionalExtensions: string[] = []): string {
  const allExt = [...new Set([...BASE_EXTENSIONS, ...additionalExtensions])];
  return allExt.join("|");
}

function buildFilePathPatterns(config: LoaderConfig): RegExp[] {
  const ext = buildExtensionPattern(config.additionalExtensions);
  
  return [
    new RegExp(`(?:^|\\s)((?:\\./|\\.\\./|/)?(?:[\\w-]+/)*[\\w.-]+\\.(${ext}))(?:\\s|$|[,;:)])`, "gi"),
    new RegExp(`["'\`]((?:\\./|\\.\\./|/)?(?:[\\w-]+/)*[\\w.-]+\\.(${ext}))["'\`]`, "gi"),
    new RegExp(`(?:^|\\s)([A-Za-z]:\\\\(?:[\\w-]+\\\\)*[\\w.-]+\\.(${ext}))(?:\\s|$)`, "gi"),
    new RegExp(`(?:^|\\s)((?:[\\w-]+/)+[\\w.-]+\\.(${ext}))(?:\\s|$)`, "gi"),
    new RegExp(`(?:^|\\s)((?:\\./|\\.\\./)?(?:[\\w-]+(?:\\s[\\w-]+)*/)*[\\w.-]+\\.(${ext}))(?=\\s|$|[,;:)])`, "gi"),
  ];
}

export function extractFilePaths(task: string, config: Partial<LoaderConfig> = {}): string[] {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const patterns = buildFilePathPatterns(fullConfig);
  const paths = new Set<string>();
  
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(task)) !== null) {
      const filePath = match[1];
      if (filePath && !filePath.startsWith("http") && !filePath.includes("://")) {
        const cleaned = filePath.replace(/\\/g, "/").trim();
        if (cleaned.length > 0) {
          paths.add(cleaned);
        }
      }
    }
  }
  
  return Array.from(paths);
}

function isTextFile(buffer: Buffer): boolean {
  const sample = buffer.slice(0, Math.min(512, buffer.length));
  let nullBytes = 0;
  let controlChars = 0;
  
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0) nullBytes++;
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) controlChars++;
  }
  
  const nullRatio = nullBytes / sample.length;
  const controlRatio = controlChars / sample.length;
  
  return nullRatio < 0.01 && controlRatio < 0.1;
}

export function loadFileContent(filePath: string, config: Partial<LoaderConfig> = {}): FileContext {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const resolvedPath = path.resolve(process.cwd(), filePath);
  
  const baseResult: Partial<FileContext> = {
    path: filePath,
    resolvedPath,
    content: "",
    exists: false,
    sizeBytes: 0,
    truncated: false,
  };
  
  try {
    if (!fs.existsSync(resolvedPath)) {
      return {
        ...baseResult,
        error: `File not found: ${filePath}\n  Resolved to: ${resolvedPath}\n  Working directory: ${process.cwd()}`,
        errorCode: "NOT_FOUND",
      } as FileContext;
    }
    
    const stats = fs.statSync(resolvedPath);
    
    if (stats.isDirectory()) {
      return {
        ...baseResult,
        error: `Path is a directory, not a file: ${filePath}\n  Resolved to: ${resolvedPath}`,
        errorCode: "IS_DIRECTORY",
      } as FileContext;
    }
    
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch {
      return {
        ...baseResult,
        error: `Permission denied: Cannot read file ${filePath}\n  Resolved to: ${resolvedPath}\n  Action: Check file permissions or run with appropriate access`,
        errorCode: "PERMISSION_DENIED",
      } as FileContext;
    }
    
    const rawBuffer = fs.readFileSync(resolvedPath);
    
    if (!isTextFile(rawBuffer)) {
      return {
        ...baseResult,
        error: `Binary or non-text file detected: ${filePath}\n  File appears to contain binary data and cannot be included as context`,
        errorCode: "ENCODING_ERROR",
      } as FileContext;
    }
    
    let content: string;
    try {
      content = rawBuffer.toString(fullConfig.encoding);
    } catch {
      try {
        content = rawBuffer.toString("latin1");
      } catch {
        return {
          ...baseResult,
          error: `Encoding error: Cannot decode file ${filePath}\n  Tried ${fullConfig.encoding} and latin1 encodings`,
          errorCode: "ENCODING_ERROR",
        } as FileContext;
      }
    }
    
    const sizeBytes = Buffer.byteLength(content, "utf-8");
    let truncated = false;
    
    if (sizeBytes > fullConfig.maxFileSizeBytes) {
      content = content.slice(0, fullConfig.maxFileSizeBytes) + 
        `\n\n[... TRUNCATED - file is ${(sizeBytes / 1024).toFixed(1)}KB, limit is ${(fullConfig.maxFileSizeBytes / 1024).toFixed(1)}KB ...]`;
      truncated = true;
    }
    
    return {
      path: filePath,
      resolvedPath,
      content,
      exists: true,
      sizeBytes,
      truncated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ...baseResult,
      error: `Failed to read file: ${filePath}\n  Resolved to: ${resolvedPath}\n  Error: ${errorMessage}`,
      errorCode: "READ_ERROR",
    } as FileContext;
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function loadTaskContext(
  task: string, 
  additionalFiles: string[] = [], 
  config: Partial<LoaderConfig> = {}
): LoadResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const detectedPaths = extractFilePaths(task, fullConfig);
  const normalizedAdditional = additionalFiles
    .map(f => f.trim().replace(/\\/g, "/"))
    .filter(f => f.length > 0);
  const allPaths = [...new Set([...detectedPaths, ...normalizedAdditional])];
  
  const files: FileContext[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalContentBytes = 0;
  
  for (const filePath of allPaths) {
    const fileContext = loadFileContent(filePath, fullConfig);
    files.push(fileContext);
    
    if (!fileContext.exists) {
      errors.push(fileContext.error || `File not found: ${filePath}`);
    } else {
      totalContentBytes += fileContext.sizeBytes;
      
      if (fileContext.truncated) {
        warnings.push(`File truncated: ${filePath} (${(fileContext.sizeBytes / 1024).toFixed(1)}KB)`);
      }
    }
  }
  
  if (totalContentBytes > fullConfig.maxTotalBytes) {
    warnings.push(
      `Total content size (${(totalContentBytes / 1024).toFixed(1)}KB) exceeds limit (${(fullConfig.maxTotalBytes / 1024).toFixed(1)}KB). Some content may be truncated.`
    );
  }
  
  let taskWithContext = task;
  const loadedFiles = files.filter(f => f.exists);
  
  if (loadedFiles.length > 0) {
    let remainingBytes = fullConfig.maxTotalBytes;
    const includedContent: string[] = [];
    
    for (const file of loadedFiles) {
      const contentBytes = Buffer.byteLength(file.content, "utf-8");
      if (contentBytes <= remainingBytes) {
        includedContent.push(`\n\n=== FILE: ${file.path} ===\n${file.content}\n=== END FILE ===`);
        remainingBytes -= contentBytes;
      } else {
        const truncatedContent = file.content.slice(0, remainingBytes);
        includedContent.push(
          `\n\n=== FILE: ${file.path} (TRUNCATED due to total size limit) ===\n${truncatedContent}\n=== END FILE ===`
        );
        warnings.push(`File partially included due to total size limit: ${file.path}`);
        break;
      }
    }
    
    const contextSection = includedContent.join("\n");
    taskWithContext = `${task}\n\n--- FILE CONTENTS (${loadedFiles.length} files, ${(totalContentBytes / 1024).toFixed(1)}KB) ---${contextSection}`;
  }
  
  const estimatedTokens = estimateTokens(taskWithContext);
  
  if (estimatedTokens > fullConfig.maxEstimatedTokens) {
    warnings.push(
      `Estimated token count (${estimatedTokens}) exceeds limit (${fullConfig.maxEstimatedTokens}). AI model may truncate or fail.`
    );
  }
  
  return {
    files,
    taskWithContext,
    hasErrors: errors.length > 0,
    errors,
    totalContentBytes,
    estimatedTokens,
    warnings,
  };
}

export function validateContextLoaded(result: LoadResult, strict: boolean = true): void {
  if (result.files.length === 0) {
    return;
  }
  
  const loadedCount = result.files.filter(f => f.exists).length;
  const totalCount = result.files.length;
  
  if (result.warnings.length > 0) {
    console.warn("\nWarnings:");
    for (const warning of result.warnings) {
      console.warn(`  ! ${warning}`);
    }
  }
  
  if (loadedCount === 0 && totalCount > 0) {
    const errorMsg = [
      "",
      "CRITICAL: No files could be loaded!",
      "The AI agent will receive NO file context and produce garbage output.",
      "",
      "Files that failed to load:",
      ...result.errors.map(e => `  ${e.split("\n").join("\n  ")}`),
      "",
      "Troubleshooting:",
      "  1. Check that file paths are correct and files exist",
      "  2. Verify you're running from the correct working directory",
      "  3. Check file permissions (readable by current user)",
      "  4. Use --files flag to explicitly specify file paths",
      "",
    ].join("\n");
    
    if (strict) {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  } else if (result.hasErrors) {
    console.warn(`\nPartial load: ${loadedCount}/${totalCount} files loaded successfully.`);
    console.warn("Files that failed:");
    for (const error of result.errors) {
      console.warn(`  ${error.split("\n")[0]}`);
    }
    console.warn("");
  }
  
  if (loadedCount > 0) {
    console.log(`\nLoaded ${loadedCount} file(s) for context:`);
    for (const file of result.files.filter(f => f.exists)) {
      const sizeKB = (file.sizeBytes / 1024).toFixed(1);
      const truncateNote = file.truncated ? " [TRUNCATED]" : "";
      console.log(`  + ${file.path} (${sizeKB}KB)${truncateNote}`);
    }
    console.log(`  Total: ${(result.totalContentBytes / 1024).toFixed(1)}KB, ~${result.estimatedTokens} tokens`);
    console.log("");
  }
}

export function buildContextPrompt(
  task: string,
  additionalFiles: string[] = [],
  strict: boolean = true,
  config: Partial<LoaderConfig> = {}
): string {
  const result = loadTaskContext(task, additionalFiles, { ...config, strict });
  validateContextLoaded(result, strict);
  return result.taskWithContext;
}

export { DEFAULT_CONFIG };
