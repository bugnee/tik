"use client";

import { PartnerDetailView } from "@/components/manage/PartnerDetailView";
import { Card } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";

export function PartnerDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const partnerId = currentUser.partnerId ?? data.partners[0]?.id ?? "";

  if (!partnerId) {
    return (
      <Card className="py-16 text-center">
        <p className="text-sm text-zinc-400">
          연결된 파트너사 정보가 없습니다. 관리자에게 계정 연결을 요청해 주세요.
        </p>
      </Card>
    );
  }

  return <PartnerDetailView partnerId={partnerId} variant="portal" />;
}
