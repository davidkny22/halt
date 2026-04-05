import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-3"><LogoMark size={48} /></div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          We sent you a sign-in link. Click it to access your halt dashboard.
        </p>
        <div
          className="p-4 rounded-lg mb-6 text-xs"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
        </div>
        <Link
          href="/login"
          className="text-sm"
          style={{ color: "var(--color-coral)" }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
