import { describe, it, expect, beforeEach } from "vitest";
import { setConsent, getConsent, hasConsent, revokeConsent, redactPII, } from "../../server/privacy";
describe("Privacy Module", () => {
    beforeEach(() => {
        revokeConsent("test-user-1");
        revokeConsent("test-user-2");
    });
    describe("Consent Management", () => {
        it("sets consent for a new user", () => {
            const consent = setConsent("test-user-1", {
                dataProcessing: true,
                analytics: true,
                thirdPartySharing: false,
            });
            expect(consent.userId).toBe("test-user-1");
            expect(consent.dataProcessing).toBe(true);
            expect(consent.analytics).toBe(true);
            expect(consent.thirdPartySharing).toBe(false);
            expect(consent.consentedAt).toBeInstanceOf(Date);
            expect(consent.updatedAt).toBeInstanceOf(Date);
        });
        it("updates consent for existing user", () => {
            setConsent("test-user-1", { dataProcessing: true, analytics: false });
            const updated = setConsent("test-user-1", { analytics: true });
            expect(updated.dataProcessing).toBe(true);
            expect(updated.analytics).toBe(true);
        });
        it("preserves original consentedAt on update", () => {
            const original = setConsent("test-user-1", { dataProcessing: true });
            const originalTime = original.consentedAt.getTime();
            const updated = setConsent("test-user-1", { analytics: true });
            expect(updated.consentedAt.getTime()).toBe(originalTime);
            expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime);
        });
        it("gets consent for a user", () => {
            setConsent("test-user-1", { dataProcessing: true });
            const consent = getConsent("test-user-1");
            expect(consent).toBeDefined();
            expect(consent?.dataProcessing).toBe(true);
        });
        it("returns undefined for unknown user", () => {
            const consent = getConsent("unknown-user");
            expect(consent).toBeUndefined();
        });
        it("checks specific consent type", () => {
            setConsent("test-user-1", { dataProcessing: true, analytics: false });
            expect(hasConsent("test-user-1", "dataProcessing")).toBe(true);
            expect(hasConsent("test-user-1", "analytics")).toBe(false);
            expect(hasConsent("test-user-1", "thirdPartySharing")).toBe(false);
        });
        it("returns false for unknown user consent check", () => {
            expect(hasConsent("unknown-user", "dataProcessing")).toBe(false);
        });
        it("revokes consent completely", () => {
            setConsent("test-user-1", { dataProcessing: true, analytics: true });
            revokeConsent("test-user-1");
            const consent = getConsent("test-user-1");
            expect(consent).toBeUndefined();
        });
    });
    describe("PII Redaction", () => {
        it("redacts email addresses", () => {
            const text = "Contact me at john.doe@example.com for more info";
            const redacted = redactPII(text);
            expect(redacted).toBe("Contact me at [EMAIL_REDACTED] for more info");
        });
        it("redacts multiple email addresses", () => {
            const text = "From: a@b.com To: c@d.com";
            const redacted = redactPII(text);
            expect(redacted).toBe("From: [EMAIL_REDACTED] To: [EMAIL_REDACTED]");
        });
        it("redacts SSN patterns", () => {
            const text = "SSN: 123-45-6789";
            const redacted = redactPII(text);
            expect(redacted).toBe("SSN: [SSN_REDACTED]");
        });
        it("redacts phone numbers", () => {
            const text = "Call 555-123-4567";
            const redacted = redactPII(text);
            expect(redacted).toBe("Call [PHONE_REDACTED]");
        });
        it("redacts credit card numbers", () => {
            const text = "Card: 1234-5678-9012-3456";
            const redacted = redactPII(text);
            expect(redacted).toBe("Card: [CARD_REDACTED]");
        });
        it("redacts password patterns", () => {
            const text = "password=mySecret123";
            const redacted = redactPII(text);
            expect(redacted).toBe("[PASSWORD_REDACTED]");
        });
        it("redacts API key patterns", () => {
            expect(redactPII("api_key=abc123")).toBe("[API_KEY_REDACTED]");
            expect(redactPII("secret_key: mykey")).toBe("[API_KEY_REDACTED]");
        });
        it("redacts Bearer tokens", () => {
            const text = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";
            const redacted = redactPII(text);
            expect(redacted).toContain("[BEARER_TOKEN_REDACTED]");
        });
        it("redacts OpenAI-style API keys", () => {
            const text = "key: sk-abcdefghijklmnopqrstuvwxyz123456";
            const redacted = redactPII(text);
            expect(redacted).toBe("key: [API_KEY_REDACTED]");
        });
        it("preserves non-PII text", () => {
            const text = "Hello, how are you today?";
            const redacted = redactPII(text);
            expect(redacted).toBe("Hello, how are you today?");
        });
        it("handles empty string", () => {
            expect(redactPII("")).toBe("");
        });
        it("handles text with multiple PII types", () => {
            const text = "User john@example.com called 555-123-4567 with card 1234-5678-9012-3456";
            const redacted = redactPII(text);
            expect(redacted).toContain("[EMAIL_REDACTED]");
            expect(redacted).toContain("[PHONE_REDACTED]");
            expect(redacted).toContain("[CARD_REDACTED]");
            expect(redacted).not.toContain("john@example.com");
        });
    });
});
//# sourceMappingURL=privacy.test.js.map