import { describe, it, expect } from "vitest";
import { FakeDataScanner, createScanner } from "../scanner";

describe("FakeDataScanner", () => {
  describe("scanContent", () => {
    it("detects test user references", async () => {
      const scanner = new FakeDataScanner();
      const content = `const user = "testuser";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.category === "fake_data")).toBe(true);
    });

    it("detects placeholder names johndoe", async () => {
      const scanner = new FakeDataScanner();
      const content = `const name = johndoe;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("placeholder name"))).toBe(true);
    });

    it("detects placeholder domains", async () => {
      const scanner = new FakeDataScanner();
      const content = `const url = "example.com";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("domain"))).toBe(true);
    });

    it("detects lorem ipsum", async () => {
      const scanner = new FakeDataScanner();
      const content = `const text = "lorem ipsum";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("Lorem ipsum"))).toBe(true);
    });

    it("detects fake phone numbers", async () => {
      const scanner = new FakeDataScanner();
      const content = `const phone = "123-456-7890";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("phone"))).toBe(true);
    });

    it("detects placeholder passwords", async () => {
      const scanner = new FakeDataScanner();
      const content = `const pass = "password";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("password"))).toBe(true);
    });

    it("detects placeholder addresses", async () => {
      const scanner = new FakeDataScanner();
      const content = `const address = "123 Main St";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("address"))).toBe(true);
    });

    it("detects possible hardcoded secrets", async () => {
      const scanner = new FakeDataScanner();
      const content = `const api_key = "abcdefghijklmnop12345678";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.category === "security")).toBe(true);
    });

    it("detects OpenAI API keys", async () => {
      const scanner = new FakeDataScanner();
      const content = `const key = "sk-abcdefghijklmnopqrstuvwxyz123456";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes("OpenAI"))).toBe(true);
    });

    it("detects SSN patterns", async () => {
      const scanner = new FakeDataScanner();
      const content = `const ssn = "123-45-6789";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.category === "pii")).toBe(true);
    });

    it("skips comment lines", async () => {
      const scanner = new FakeDataScanner();
      const content = `// const name = johndoe;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBe(0);
    });

    it("reports correct line numbers", async () => {
      const scanner = new FakeDataScanner();
      const content = `const a = 1;
const b = 2;
const name = johndoe;
const c = 3;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].line).toBe(3);
    });

    it("returns empty for clean code", async () => {
      const scanner = new FakeDataScanner();
      const content = `const userId = await getUserId();
const result = await fetchData(userId);
return result;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBe(0);
    });
  });

  describe("ScanResult", () => {
    it("passes when no errors found", async () => {
      const scanner = new FakeDataScanner({ strict: false });
      const content = `const x = 1;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBe(0);
    });

    it("fails in strict mode with warnings", async () => {
      const scanner = new FakeDataScanner({ strict: true });
      const content = `const url = "example.com";`;
      const issues = await scanner.scanContent(content);
      
      const hasWarning = issues.some(i => i.severity === "warning");
      expect(hasWarning).toBe(true);
    });
  });

  describe("createScanner", () => {
    it("creates scanner with default options", () => {
      const scanner = createScanner();
      expect(scanner).toBeInstanceOf(FakeDataScanner);
    });

    it("creates scanner with custom options", () => {
      const scanner = createScanner({
        strict: true,
        extensions: [".ts"],
      });
      expect(scanner).toBeInstanceOf(FakeDataScanner);
    });
  });

  describe("multiple issues per line", () => {
    it("detects issues on a line", async () => {
      const scanner = new FakeDataScanner();
      const content = `const ssn = "123-45-6789";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("severity levels", () => {
    it("marks lorem ipsum as error", async () => {
      const scanner = new FakeDataScanner();
      const content = `const text = "lorem ipsum";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.severity === "error")).toBe(true);
    });

    it("marks example.com as warning", async () => {
      const scanner = new FakeDataScanner();
      const content = `const domain = "example.com";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.severity === "warning")).toBe(true);
    });
  });

  describe("issue categories", () => {
    it("categorizes fake data correctly", async () => {
      const scanner = new FakeDataScanner();
      const content = `const name = johndoe;`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.category === "fake_data")).toBe(true);
    });

    it("categorizes security issues correctly", async () => {
      const scanner = new FakeDataScanner();
      const content = `const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.category === "security")).toBe(true);
    });

    it("categorizes PII correctly", async () => {
      const scanner = new FakeDataScanner();
      const content = `const ssn = "123-45-6789";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.category === "pii")).toBe(true);
    });

    it("categorizes placeholder correctly", async () => {
      const scanner = new FakeDataScanner();
      const content = `const text = "lorem ipsum";`;
      const issues = await scanner.scanContent(content);
      
      expect(issues.some(i => i.category === "placeholder")).toBe(true);
    });
  });
});
