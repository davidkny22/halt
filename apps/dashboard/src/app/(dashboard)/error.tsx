"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        Try again
      </button>
    </div>
  );
}
