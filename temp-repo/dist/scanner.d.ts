export interface ScannerOptions {
    strict: boolean;
    extensions: string[];
    ignorePatterns?: string[];
}
export interface ScanIssue {
    file: string;
    line: number;
    column: number;
    message: string;
    pattern: string;
    severity: "error" | "warning";
    category: "fake_data" | "placeholder" | "todo" | "security" | "pii";
}
export interface ScanResult {
    passed: boolean;
    filesScanned: number;
    issues: ScanIssue[];
    duration: number;
}
export declare class FakeDataScanner {
    private options;
    private patterns;
    constructor(options?: Partial<ScannerOptions>);
    scanDirectory(dirPath: string): Promise<ScanResult>;
    scanFile(filePath: string): Promise<ScanIssue[]>;
    scanContent(content: string, filename?: string): Promise<ScanIssue[]>;
    private getFilesRecursively;
    private shouldIgnore;
    private hasValidExtension;
    private isCommentLine;
}
export declare function createScanner(options?: Partial<ScannerOptions>): FakeDataScanner;
//# sourceMappingURL=scanner.d.ts.map