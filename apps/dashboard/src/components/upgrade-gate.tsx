"use client";

interface UpgradeGateProps {
  feature: string;
  description: string;
  children: React.ReactNode;
  tier?: string;
  requiredTier?: string;
}

const TIER_RANK: Record<string, number> = {
  free: 0,
  trial: 1,
  paid: 2,
  team: 3,
  enterprise: 4,
};

export function UpgradeGate({ feature, description, children, tier, requiredTier = "paid" }: UpgradeGateProps) {
  const currentRank = TIER_RANK[tier || "free"] ?? 0;
  const requiredRank = TIER_RANK[requiredTier] ?? 2;

  if (currentRank >= requiredRank) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#111111]/80 backdrop-blur-sm">
        <div className="text-center px-6 py-8 max-w-md">
          <h3 className="text-lg font-semibold text-white mb-2">{feature}</h3>
          <p className="text-sm text-[#999] mb-4">{description}</p>
          <a
            href="/settings"
            className="inline-block px-5 py-2.5 bg-[#FF6B4A] text-white text-sm font-semibold rounded-lg hover:bg-[#e55d3f] transition-colors"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
      <div className="opacity-20 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
