"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Camera,
  Handshake,
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
import { Checkbox, Input, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { formatKRW } from "@/lib/finance";
import {
  filterPartnersByCategory,
  formatPartnerCategories,
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABELS,
} from "@/lib/partner-utils";
import type { Partner, PartnerCategory, PartnerInput } from "@/lib/types";

type TabKey = PartnerCategory | "all";

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: typeof Megaphone;
  accent: "amber" | "rose" | "cyan" | "emerald";
}[] = [
  { key: "all", label: "전체", icon: Users2, accent: "emerald" },
  { key: "press", label: "기자단", icon: Megaphone, accent: "amber" },
  { key: "experience", label: "체험단", icon: Camera, accent: "rose" },
  { key: "influencer", label: "인플루언서", icon: Users2, accent: "cyan" },
  { key: "blog", label: "블로그", icon: BookOpen, accent: "emerald" },
  { key: "referral", label: "리셀러", icon: UserPlus, accent: "rose" },
];

const emptyForm = (category: PartnerCategory = "press"): PartnerInput => ({
  companyName: "",
  categories: [category],
  contactName: "",
  phone: "",
  email: "",
  bankAccount: "",
  accountHolder: "",
  unitPrice: undefined,
  memo: "",
  isActive: true,
});

export function PartnersManager() {
  const data = useData();
  const { partners, expenses, addPartner, updatePartner, deletePartner } = data;
  const { canManagePartners } = useRole();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<PartnerInput>(emptyForm());

  const counts = useMemo(() => {
    const active = partners.filter((p) => p.isActive);
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
      if (!showInactive && !p.isActive) return false;
      if (showInactive && !p.isActive && tab !== "all" && !p.categories.includes(tab as PartnerCategory)) {
        return false;
      }
      return (
        p.companyName.toLowerCase().includes(q) ||
        (p.contactName?.toLowerCase().includes(q) ?? false) ||
        (p.accountHolder?.toLowerCase().includes(q) ?? false) ||
        p.bankAccount.includes(q)
      );
    });
  }, [partners, tab, search, showInactive]);

  function openCreate() {
    const defaultCat = tab === "all" ? "press" : tab;
    setEditing(null);
    setForm(emptyForm(defaultCat));
    setModalOpen(true);
  }

  function openEdit(partner: Partner) {
    setEditing(partner);
    setForm({ ...partner });
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
    if (editing) {
      updatePartner(editing.id, form);
    } else {
      addPartner(form);
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
        {TAB_CONFIG.filter((t) => t.key !== "all").map(({ key, label, icon: Icon, accent }) => (
          <StatCard
            key={key}
            label={`${label} 파트너`}
            value={`${counts[key]}곳`}
            icon={Icon}
            accent={accent}
          />
        ))}
      </div>

      <Card className="mb-4 p-1">
        <div className="flex flex-wrap gap-1">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="업체명 · 담당자 · 계좌 검색"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-600"
          />
          비활성 포함
        </label>
      </Card>

      <DataTable>
        <thead>
          <tr>
            <Th>파트너사</Th>
            <Th>분야</Th>
            <Th>담당자</Th>
            <Th>연락처</Th>
            <Th>계좌</Th>
            <Th>단가</Th>
            <Th>원가 연결</Th>
            <Th>상태</Th>
            {canManagePartners && <Th className="w-24">관리</Th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <Tr key={p.id}>
              <Td>
                <p className="font-medium text-zinc-100">{p.companyName}</p>
                {p.memo && (
                  <p className="mt-0.5 max-w-[180px] truncate text-xs text-zinc-600">
                    {p.memo}
                  </p>
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {p.categories.map((c) => (
                    <Badge key={c} variant="info" className="text-[10px]">
                      {PARTNER_CATEGORY_LABELS[c]}
                    </Badge>
                  ))}
                </div>
              </Td>
              <Td>{p.contactName ?? "-"}</Td>
              <Td className="text-xs">
                {p.phone && <p>{p.phone}</p>}
                {p.email && <p className="text-zinc-600">{p.email}</p>}
                {!p.phone && !p.email && "-"}
              </Td>
              <Td className="font-mono text-xs">
                {p.bankAccount}
                <br />
                <span className="text-zinc-600">{p.accountHolder}</span>
              </Td>
              <Td className="font-mono text-sm">
                {p.unitPrice ? formatKRW(p.unitPrice) : "-"}
              </Td>
              <Td>
                <Badge variant={expenseCount(p.id) > 0 ? "success" : "default"}>
                  {expenseCount(p.id)}건
                </Badge>
              </Td>
              <Td>
                <Badge variant={p.isActive ? "success" : "default"}>
                  {p.isActive ? "활성" : "비활성"}
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
              {PARTNER_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    form.categories.includes(cat)
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 text-zinc-500",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-zinc-600"
                  />
                  {PARTNER_CATEGORY_LABELS[cat]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-zinc-600">
              선택: {formatPartnerCategories(form.categories)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="담당자"
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            rows={2}
          />
          <Checkbox
            label="활성 파트너 (원가 등록 시 선택 가능)"
            checked={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
          />
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              취소
            </Button>
            <Button type="submit">{editing ? "저장" : "등록"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
