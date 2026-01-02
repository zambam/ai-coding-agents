import * as fs from "fs";
import * as path from "path";
const FAKE_DATA_PATTERNS = [
    {
        pattern: /["']?test[@.]?user["']?/gi,
        message: "Possible test user reference",
        severity: "error",
        category: "fake_data",
    },
    {
        pattern: /["']?john\.?doe["']?|["']?jane\.?doe["']?/gi,
        message: "Generic placeholder name detected",
        severity: "error",
        category: "fake_data",
    },
    {
        pattern: /["']example\.com["']|["']test\.com["']|["']foo\.com["']|["']bar\.com["']/gi,
        message: "Placeholder domain detected",
        severity: "warning",
        category: "fake_data",
    },
    {
        pattern: /["']lorem\s+ipsum["']/gi,
        message: "Lorem ipsum placeholder text",
        severity: "error",
        category: "placeholder",
    },
    {
        pattern: /["']placeholder["']|["']sample["']|["']dummy["']/gi,
        message: "Placeholder text detected",
        severity: "warning",
        category: "placeholder",
    },
    {
        pattern: /["']123-?456-?7890["']|["']555-?\d{3}-?\d{4}["']/gi,
        message: "Fake phone number detected",
        severity: "error",
        category: "fake_data",
    },
    {
        pattern: /["']12345["']|["']password["']|["']abc123["']|["']qwerty["']/gi,
        message: "Common test/placeholder password",
        severity: "error",
        category: "fake_data",
    },
    {
        pattern: /["']123\s*Main\s*St["']|["']123\s*Test\s*Street["']/gi,
        message: "Placeholder address detected",
        severity: "error",
        category: "fake_data",
    },
    {
        pattern: /\$\d+\.\d{2}.*?placeholder|placeholder.*?\$\d+\.\d{2}/gi,
        message: "Placeholder price value",
        severity: "warning",
        category: "placeholder",
    },
    {
        pattern: /["']TODO:?\s*replace["']|["']FIXME:?\s*fake["']/gi,
        message: "TODO marker for fake data",
        severity: "error",
        category: "todo",
    },
];
const SECURITY_PATTERNS = [
    {
        pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/gi,
        message: "Possible hardcoded secret",
        severity: "error",
        category: "security",
    },
    {
        pattern: /sk-[a-zA-Z0-9]{20,}/g,
        message: "Possible OpenAI API key",
        severity: "error",
        category: "security",
    },
    {
        pattern: /ghp_[a-zA-Z0-9]{36,}/g,
        message: "Possible GitHub personal access token",
        severity: "error",
        category: "security",
    },
    {
        pattern: /xoxb-[a-zA-Z0-9-]+/g,
        message: "Possible Slack bot token",
        severity: "error",
        category: "security",
    },
];
const PII_PATTERNS = [
    {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        message: "Possible SSN format",
        severity: "error",
        category: "pii",
    },
    {
        pattern: /\b\d{16}\b|\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,
        message: "Possible credit card number",
        severity: "error",
        category: "pii",
    },
];
const IGNORE_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /coverage/,
    /__tests__/,
    /\.test\./,
    /\.spec\./,
    /test-utils/,
    /\.md$/,
];
export class FakeDataScanner {
    constructor(options = {}) {
        this.options = {
            strict: options.strict ?? false,
            extensions: options.extensions ?? [".ts", ".tsx", ".js", ".jsx"],
            ignorePatterns: options.ignorePatterns,
        };
        this.patterns = [
            ...FAKE_DATA_PATTERNS,
            ...SECURITY_PATTERNS,
            ...PII_PATTERNS,
        ];
    }
    async scanDirectory(dirPath) {
        const startTime = Date.now();
        const issues = [];
        let filesScanned = 0;
        const files = this.getFilesRecursively(dirPath);
        for (const file of files) {
            const fileIssues = await this.scanFile(file);
            issues.push(...fileIssues);
            filesScanned++;
        }
        const hasErrors = issues.some(i => i.severity === "error");
        const hasWarnings = issues.some(i => i.severity === "warning");
        const passed = !hasErrors && (!this.options.strict || !hasWarnings);
        return {
            passed,
            filesScanned,
            issues,
            duration: Date.now() - startTime,
        };
    }
    async scanFile(filePath) {
        const issues = [];
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n");
            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
                const line = lines[lineNum];
                if (this.isCommentLine(line)) {
                    continue;
                }
                for (const patternDef of this.patterns) {
                    const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                        issues.push({
                            file: filePath,
                            line: lineNum + 1,
                            column: match.index + 1,
                            message: patternDef.message,
                            pattern: match[0],
                            severity: patternDef.severity,
                            category: patternDef.category,
                        });
                    }
                }
            }
        }
        catch (error) {
            // File read error - skip
        }
        return issues;
    }
    async scanContent(content, filename = "inline") {
        const issues = [];
        const lines = content.split("\n");
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            if (this.isCommentLine(line)) {
                continue;
            }
            for (const patternDef of this.patterns) {
                const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
                let match;
                while ((match = regex.exec(line)) !== null) {
                    issues.push({
                        file: filename,
                        line: lineNum + 1,
                        column: match.index + 1,
                        message: patternDef.message,
                        pattern: match[0],
                        severity: patternDef.severity,
                        category: patternDef.category,
                    });
                }
            }
        }
        return issues;
    }
    getFilesRecursively(dirPath) {
        const files = [];
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (this.shouldIgnore(fullPath)) {
                    continue;
                }
                if (entry.isDirectory()) {
                    files.push(...this.getFilesRecursively(fullPath));
                }
                else if (entry.isFile() && this.hasValidExtension(entry.name)) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory read error - skip
        }
        return files;
    }
    shouldIgnore(filePath) {
        for (const pattern of IGNORE_PATTERNS) {
            if (pattern.test(filePath)) {
                return true;
            }
        }
        if (this.options.ignorePatterns) {
            for (const pattern of this.options.ignorePatterns) {
                if (filePath.includes(pattern)) {
                    return true;
                }
            }
        }
        return false;
    }
    hasValidExtension(filename) {
        return this.options.extensions.some(ext => filename.endsWith(ext));
    }
    isCommentLine(line) {
        const trimmed = line.trim();
        return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
    }
}
export function createScanner(options) {
    return new FakeDataScanner(options);
}
//# sourceMappingURL=scanner.js.map