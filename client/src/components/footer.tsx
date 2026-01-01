import { Link } from "wouter";
import { Zap, Github } from "lucide-react";
import { SiNpm } from "react-icons/si";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">AI Coding Agents</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Reliable AI-powered coding guidance with built-in quality assurance and logical consistency.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-semibold">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link href="/docs">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer" data-testid="link-footer-docs">
                  Documentation
                </span>
              </Link>
              <Link href="/playground">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer" data-testid="link-footer-playground">
                  Playground
                </span>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="link-footer-github"
              >
                GitHub Repository
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-semibold">Connect</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                data-testid="link-footer-github-icon"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://npmjs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                data-testid="link-footer-npm"
              >
                <SiNpm className="w-5 h-5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Built with reliability-first AI practices
          </p>
        </div>
      </div>
    </footer>
  );
}
