"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const EMAIL = "ux.dibyajeet@gmail.com";

const SOCIALS = [
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/dibyajeetk",
    icon: "bi-linkedin",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/dibyajeetk",
    icon: "bi-instagram",
  },
  {
    name: "GitHub",
    url: "https://www.github.com/dibyajeetk",
    icon: "bi-github",
  },
];

const HIDDEN_PATHS = ["/dashboard", "/pageEditor"];

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
  }
}

export default function Footer() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;

  const handleCopy = async () => {
    await copyText(EMAIL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer id="site-footer" className="site-footer">
      <p className="text-headline-2 footer-hero">
        Thanks for stopping by, let&apos;s chat! 🤙
      </p>

      <div className="data-wrapper">
        <div className="data-container">
          <p className="footer-label text-base">email</p>
          <div className="footer-content">
            <span className="footer-email-text text-base">{EMAIL}</span>
            <button
              type="button"
              className={`footer-copy-btn${copied ? " copied" : ""}`}
              aria-label="Copy email address"
              title="Copy email"
              onClick={handleCopy}
            >
              <i className="bi bi-copy" aria-hidden="true" />
              <span className="copy-tooltip">Copied!</span>
            </button>
          </div>
        </div>

        <div className="data-container">
          <p className="footer-label text-base">let&apos;s connect</p>
          <div className="footer-social-links">
            {SOCIALS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label={social.name}
                title={social.name}
              >
                <i className={`bi ${social.icon}`} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="data-container">
          <p className="footer-label text-base">
            © 2026 Dibyajeet Kirttania, all rights reserved.
          </p>
          <p className="footer-updated text-base">Last updated on: 08 August, 2026</p>
        </div>
      </div>
    </footer>
  );
}