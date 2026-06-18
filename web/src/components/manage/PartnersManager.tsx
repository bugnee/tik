"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Camera,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users2,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  PageHeader,
  SearchBar,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { RegionSelect } from "@/components/location/RegionSelect";
import {
  locationMatchesSearch,
  LOCATION_FIELD_HINT,
} from "@/lib/location-profile-utils";
import { PartnerFilterBadge } from "@/components/ui/PartnerFilterBadge";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatKRW } from "@/lib/finance";
import {
  filterPartnersByCategory,
  formatPartnerCategories,
  getPartnerStatusBadgeVariant,
  getPartnerStatusLabel,
  isPartnerExpenseSelectable,
  normalizePartnerLinkSlots,
  PARTNER_CATEGORIES,
} from "@/lib/partner-utils";
import {
  getActivePartnerFilters,
  getPartnerFilterAccent,
  getPartnerFilterBadgeClassName,
} from "@/lib/partner-filter-utils";
import { getTaskChannelProgressBarColor } from "@/lib/task-channel-utils";
import { contractAssigneeUsers, getUserName } from "@/lib/selectors";
import type { Partner, PartnerCategory, PartnerInput, PartnerStatus } from "@/lib/types";
import { useFormDirty } from "@/hooks/useFormDirty";

type TabKey =
  | "all"
  | "press"
  | "experience"
  | "influencer"
  | "blog"
  | "referral";

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: typeof Megaphone;
}[] = [
  { key: "all", label: "전체", icon: Users2 },
  { key: "press", label: "기자단", icon: Megaphone },
  { key: "experience", label: "체험단", icon: Camera },
  { key: "influencer", label: "인플루언서", icon: Users2 },
  { key: "blog", label: "블로그", icon: BookOpen },
  { key: "referral", label: "리셀러", icon: UserPlus },
];

const emptyForm = (category: PartnerCategory = "press"): PartnerInput => ({
  companyName: "",
  categories: [category],
  contactName: "",
  phone: "",
  email: "",
  bankName: "",
  bankAccount: "",
  accountHolder: "",
  linkSlots: normalizePartnerLinkSlots(),
  unitPrice: undefined,
  internalManagerUserId: undefined,
  memo: "",
  status: "active",
});

export function PartnersManager() {
  const data = useData();
  const { partners, expenses, users, partnerFilterDefinitions, taskChannels, addPartner, updatePartner, deletePartner } = data;

  const internalManagers = useMemo(
    () => contractAssigneeUsers({ ...data, users }),
    [data, users],
  );

  const activePartnerFilters = useMemo(
    () => getActivePartnerFilters(partnerFilterDefinitions),
    [partnerFilterDefinitions],
  );

  function tabStatAccent(key: TabKey): "emerald" | "cyan" | "amber" | "rose" {
    if (key === "all") return "emerald";
    return getTaskChannelProgressBarColor(
      getPartnerFilterAccent(partnerFilterDefinitions, key, taskChannels),
    );
  }
  const { canManagePartners } = useRole();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<PartnerInput>(emptyForm());
  const formDirty = useFormDirty(
    modalOpen,
    editing?.id ?? "create",
    form,
  );

  const counts = useMemo(() => {
    const active = partners.filter(isPartnerExpenseSelectable);
    return {
      all: active.length,
      press: filterPartnersByCategory(active, "press").length,
      experience: filterPartnersByCategory(active, "experience").length,
      influencer: filterPartnersByCategory(active, "influencer").length,
      blog: filterPartnersByCategory(active, "blog").length,
      referral: filterPartnersByCategory(active, "referral").length,
    };
  }, [partners]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return filterPartnersByCategory(
      partners,
      tab,
      !showInactive,
    ).filter((p) => {
      if (!showInactive && !isPartnerExpenseSelectable(p)) return false;
      if (
        showInactive &&
        p.status !== "active" &&
        tab !== "all" &&
        !p.categories.includes(tab as PartnerCategory)
      ) {
        return false;
      }
      return (
        p.companyName.toLowerCase().includes(q) ||
        (p.contactName?.toLowerCase().includes(q) ?? false) ||
        (p.memo?.toLowerCase().includes(q) ?? false) ||
        (p.internalManagerUserId
          ? getUserName(data, p.internalManagerUserId).toLowerCase().includes(q)
          : false) ||
        (p.accountHolder?.toLowerCase().includes(q) ?? false) ||
        (p.bankName?.toLowerCase().includes(q) ?? false) ||
        p.bankAccount.includes(q) ||
        p.linkSlots.some(
          (slot) =>
            slot.url?.toLowerCase().includes(q) ||
            slot.nickname?.toLowerCase().includes(q),
        ) ||
        locationMatchesSearch(p, q)
      );
    });
  }, [partners, tab, search, showInactive, data]);

  function openCreate() {
    const defaultCat = tab === "all" ? "press" : tab;
    setEditing(null);
    setForm(emptyForm(defaultCat));
    setModalOpen(true);
  }

  function openEdit(partner: Partner) {
    setEditing(partner);
    setForm({
      ...partner,
      linkSlots: normalizePartnerLinkSlots(partner.linkSlots),
    });
    setModalOpen(true);
  }

  function toggleCategory(cat: PartnerCategory) {
    setForm((prev) => {
      const has = prev.categories.includes(cat);
      const next = has
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories: next.length ? next : [cat] };
    });
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.companyName || !form.bankAccount || !form.accountHolder) return;
    if (form.categories.length === 0) return;
    const payload: PartnerInput = {
      ...form,
      bankName: form.bankName?.trim() || undefined,
      linkSlots: normalizePartnerLinkSlots(form.linkSlots),
    };
    if (editing) {
      updatePartner(editing.id, payload);
    } else {
      addPartner(payload);
    }
    setModalOpen(false);
  }

  function expenseCount(partnerId: string) {
    return expenses.filter((e) => e.partnerId === partnerId).length;
  }

  return (
    <>
      <PageHeader
        title="파트너 관리"
        description="기자단 · 체험단 · 인플루언서 · 블로그 · 리셀러 — 분야별 파트너사 통합 관리"
        action={
          canManagePartners ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              파트너 등록
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TAB_CONFIG.filter((t) => t.key !== "all").map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className={cn(
              tab === key && "rounded-xl ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-zinc-950",
            )}
          >
            <StatCard
              label={`${label} 파트너`}
              value={`${counts[key]}곳`}
              icon={Icon}
              accent={tabStatAccent(key)}
              onValueClick={() => setTab((prev) => (prev === key ? "all" : key))}
            />
          </div>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="업체명 · 담당 · 메모 · 계좌 · 지역 검색"
        />
        {tab !== "all" && (
          <button
            type="button"
            onClick={() => setTab("all")}
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            {TAB_CONFIG.find((t) => t.key === tab)?.label} 필터 · 전체 보기
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-600"
          />
          종료·불가 포함
        </label>
      </Card>

      <DataTable>
        <thead>
          <tr>
            <Th>파트너사</Th>
            <Th>분야</Th>
            <Th>우리쪽 담당</Th>
            <Th>파트너 담당</Th>
            <Th>연락처</Th>
            <Th>계좌</Th>
            <Th>단가</Th>
            <Th>메모</Th>
            <Th>원가 연결</Th>
            <Th>상태</Th>
            {canManagePartners && <Th className="w-24">관리</Th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link
                  href={`/partners/${p.id}`}
                  className="font-medium text-zinc-100 transition-colors hover:text-emerald-300 hover:underline"
                >
                  {p.companyName}
                </Link>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {p.categories.map((c) => (
                    <PartnerFilterBadge
                      key={c}
                      filters={partnerFilterDefinitions}
                      taskChannels={taskChannels}
                      categoryId={c}
                      className="text-[10px]"
                    />
                  ))}
                </div>
              </Td>
              <Td className="text-sm text-zinc-300">
                {p.internalManagerUserId
                  ? getUserName(data, p.internalManagerUserId)
                  : "-"}
              </Td>
              <Td>{p.contactName ?? "-"}</Td>
              <Td className="text-xs">
                {p.phone && <p>{p.phone}</p>}
                {p.email && <p className="text-zinc-600">{p.email}</p>}
                {!p.phone && !p.email && "-"}
              </Td>
              <Td className="font-mono text-xs">
                {p.bankName && (
                  <p className="text-zinc-400">{p.bankName}</p>
                )}
                {p.bankAccount}
                <br />
                <span className="text-zinc-600">{p.accountHolder}</span>
              </Td>
              <Td className="font-mono text-sm">
                {p.unitPrice ? formatKRW(p.unitPrice) : "-"}
              </Td>
              <Td className="max-w-[160px] text-xs text-zinc-400">
                {p.memo ? (
                  <p className="line-clamp-2 whitespace-pre-wrap" title={p.memo}>
                    {p.memo}
                  </p>
                ) : (
                  "-"
                )}
              </Td>
              <Td>
                <Link href={`/partners/${p.id}#collaboration`}>
                  <Badge variant={expenseCount(p.id) > 0 ? "success" : "default"}>
                    {expenseCount(p.id)}건
                  </Badge>
                </Link>
              </Td>
              <Td>
                <Badge variant={getPartnerStatusBadgeVariant(p.status)}>
                  {getPartnerStatusLabel(p.status)}
                </Badge>
              </Td>
              {canManagePartners && (
                <Td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${p.companyName}" 파트너를 삭제하시겠습니까?`)) {
                          deletePartner(p.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              )}
            </Tr>
          ))}
        </tbody>
      </DataTable>

      {filtered.length === 0 && (
        <EmptyState message="등록된 파트너가 없습니다" />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "파트너 수정" : "파트너 등록"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="파트너사명 *"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            required
          />

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">집행 분야 *</p>
            <div className="flex flex-wrap gap-3">
              {(activePartnerFilters.length
                ? activePartnerFilters
                : PARTNER_CATEGORIES.map((id) => ({ id, label: id }))
              ).map((cat) => {
                const selected = form.categories.includes(cat.id);
                return (
                <label
                  key={cat.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    selected
                      ? getPartnerFilterBadgeClassName(
                          partnerFilterDefinitions,
                          cat.id,
                          taskChannels,
                        )
                      : "border-zinc-800 text-zinc-500",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded border-zinc-600"
                  />
                  {cat.label}
                </label>
              );
              })}
            </div>
            <p className="mt-1 text-[11px] text-zinc-600">
              선택: {formatPartnerCategories(form.categories, partnerFilterDefinitions)}
            </p>
          </div>

          <Select
            label="우리쪽 담당자"
            value={form.internalManagerUserId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                internalManagerUserId: e.target.value || undefined,
              })
            }
          >
            <option value="">미지정</option>
            {internalManagers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "team_leader" ? " (팀장)" : ""}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="파트너사 담당"
              value={form.contactName ?? ""}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />
            <Input
              label="연락처"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            label="이메일"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="은행명"
              value={form.bankName ?? ""}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="국민은행, 신한은행 등"
            />
            <Input
              label="계좌번호 *"
              value={form.bankAccount}
              onChange={(e) =>
                setForm({ ...form, bankAccount: e.target.value })
              }
              required
            />
            <Input
              label="예금주 *"
              value={form.accountHolder}
              onChange={(e) =>
                setForm({ ...form, accountHolder: e.target.value })
              }
              required
            />
          </div>

          <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4 space-y-3">
            <p className="text-xs font-medium text-cyan-300/90">
              활동 지역 · 체험단 참여 지역
            </p>
            <p className="text-xs text-zinc-500">{LOCATION_FIELD_HINT}</p>
            <RegionSelect
              province={form.regionProvince ?? ""}
              city={form.regionCity ?? ""}
              onProvinceChange={(regionProvince) =>
                setForm((prev) => ({ ...prev, regionProvince, regionCity: "" }))
              }
              onCityChange={(regionCity) =>
                setForm((prev) => ({ ...prev, regionCity }))
              }
            />
            <Input
              label="상세 주소"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="사무실 · 스튜디오 주소"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">
              파트너 링크 · 닉네임
            </p>
            <div className="space-y-3">
              {(form.linkSlots ?? normalizePartnerLinkSlots()).map((slot, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-3 sm:grid-cols-2"
                >
                  <Input
                    label={`링크 ${idx + 1}`}
                    value={slot.url ?? ""}
                    onChange={(e) => {
                      const next = normalizePartnerLinkSlots(form.linkSlots);
                      next[idx] = { ...next[idx], url: e.target.value };
                      setForm({ ...form, linkSlots: next });
                    }}
                    placeholder="https://..."
                  />
                  <Input
                    label={`닉네임 ${idx + 1}`}
                    value={slot.nickname ?? ""}
                    onChange={(e) => {
                      const next = normalizePartnerLinkSlots(form.linkSlots);
                      next[idx] = { ...next[idx], nickname: e.target.value };
                      setForm({ ...form, linkSlots: next });
                    }}
                    placeholder="채널·계정명"
                  />
                </div>
              ))}
            </div>
          </div>

          <Input
            label="기본 단가 (원, 참고)"
            type="number"
            min={0}
            value={form.unitPrice ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                unitPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Textarea
            label="메모"
            value={form.memo ?? ""}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            placeholder="파트너 특이사항, 협의 내용 등"
            rows={3}
          />
          <Select
            label="파트너 상태"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as PartnerStatus })
            }
          >
            <option value="active">활동파트너 (원가 등록 시 선택 가능)</option>
            <option value="ended">종료파트너</option>
            <option value="blocked">불가파트너</option>
          </Select>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              취소
            </Button>
            <SaveButton type="submit" dirty={formDirty}>
              {editing ? "저장" : "등록"}
            </SaveButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
