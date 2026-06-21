"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/FormFields";
import { useData } from "@/context/DataContext";
import { getPartnerCollaborationContracts } from "@/lib/partner-collaboration-utils";
import { getClientName } from "@/lib/selectors";

/** 파트너 — 고객사와 동일 Q&A DB 소통 (조회·문의·답글) */
export function PartnerCollaborationPanel({
  partnerId,
}: {
  partnerId: string;
}) {
  const data = useData();
  const contracts = useMemo(
    () => getPartnerCollaborationContracts(data, partnerId),
    [data, partnerId],
  );
  const [contractId, setContractId] = useState(contracts[0]?.id ?? "");

  const selectedId =
    contractId && contracts.some((c) => c.id === contractId)
      ? contractId
      : (contracts[0]?.id ?? "");

  if (contracts.length === 0) {
    return (
      <Card className="py-12 text-center text-sm text-zinc-500">
        협업 중인 업체가 없습니다. 담당자가 업무를 배정하면 여기에서 소통할 수
        있습니다.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Select
          label="소통 업체"
          value={selectedId}
          onChange={(e) => setContractId(e.target.value)}
        >
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {getClientName(data, c.id)}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-zinc-500">
          고객사 Q&A와 같은 대화 DB · 문의 등록·답글 가능 (업무 승인·결과 입력은
          담당자가 처리)
        </p>
      </Card>

      {selectedId && (
        <QaConversationPanel contractId={selectedId} compact={false} />
      )}
    </div>
  );
}
