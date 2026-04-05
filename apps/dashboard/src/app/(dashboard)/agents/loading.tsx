export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--color-coral)", animation: "pulse 1.5s ease-in-out infinite" }}
        />
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Loading...
        </span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
