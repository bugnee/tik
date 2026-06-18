import type { Contract } from "./types";

/** 고객사 사업자·연락처 입력 필드 */
export type ClientBusinessInfoInput = Pick<
  Contract,
  | "businessRegistrationNumber"
  | "clientPhone"
  | "representativeName"
  | "clientEmail"
  | "clientContactName"
  | "clientContactPhone"
>;

export const CLIENT_BUSINESS_INFO_FIELDS: Array<{
  key: keyof ClientBusinessInfoInput;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "tel";
}> = [
  {
    key: "businessRegistrationNumber",
    label: "사업자 등록번호",
    placeholder: "000-00-00000",
  },
  {
    key: "clientPhone",
    label: "전화번호",
    placeholder: "064-000-0000",
    type: "tel",
  },
  {
    key: "representativeName",
    label: "대표자",
    placeholder: "대표자명",
  },
  {
    key: "clientEmail",
    label: "이메일",
    placeholder: "contact@company.co.kr",
    type: "email",
  },
  {
    key: "clientContactName",
    label: "담당자",
    placeholder: "고객사 담당자명",
  },
  {
    key: "clientContactPhone",
    label: "담당자 전화번호",
    placeholder: "010-0000-0000",
    type: "tel",
  },
];

export function getContractBusinessInfoInput(
  contract: Contract,
): ClientBusinessInfoInput {
  return {
    businessRegistrationNumber: contract.businessRegistrationNumber ?? "",
    clientPhone: contract.clientPhone ?? "",
    representativeName: contract.representativeName ?? "",
    clientEmail: contract.clientEmail ?? "",
    clientContactName: contract.clientContactName ?? "",
    clientContactPhone: contract.clientContactPhone ?? "",
  };
}

export function normalizeClientBusinessInfoInput(
  input: ClientBusinessInfoInput,
): ClientBusinessInfoInput {
  const trim = (value?: string) => value?.trim() || undefined;
  return {
    businessRegistrationNumber: trim(input.businessRegistrationNumber),
    clientPhone: trim(input.clientPhone),
    representativeName: trim(input.representativeName),
    clientEmail: trim(input.clientEmail),
    clientContactName: trim(input.clientContactName),
    clientContactPhone: trim(input.clientContactPhone),
  };
}

export function hasClientBusinessInfo(contract: Contract): boolean {
  return CLIENT_BUSINESS_INFO_FIELDS.some(
    (field) => Boolean(contract[field.key]),
  );
}
