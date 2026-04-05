import Link from "next/link";

export default function EnterprisePage() {
  return (
    <div className="px-6 md:px-12 py-20 max-w-3xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Enterprise Features</h1>
      <p
        className="text-sm mb-8"
        style={{ color: "var(--color-text-secondary)" }}
      >
        SSO/SAML, audit logs, custom webhooks, custom roles, and unlimited
        everything. Available with a halt enterprise license.
      </p>
      <a
        href="mailto:david@halt.dev"
        className="inline-block px-6 py-3 rounded-lg font-semibold text-white text-sm"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        Contact Us
      </a>
    </div>
  );
}
