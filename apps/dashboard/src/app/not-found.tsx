import Link from "next/link";
import { LogoFull } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <LogoFull size={28} />
      <h1 className="text-4xl font-bold mt-8 mb-2">404</h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        Page not found.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
