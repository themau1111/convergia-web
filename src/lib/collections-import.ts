export type ImportMapping = Record<string, number[]>;
export type ImportOptions = { sheet: string; header_row: number; mapping: ImportMapping; amount_format: "dot_decimal" | "comma_decimal" };
export type ImportSheet = {
  name: string; header_row: number; columns: { index: number; header: string; suggested_field: string | null }[];
  suggested_mapping: ImportMapping; ambiguous_fields: string[]; header_signature: string; data_rows: number;
};
export type ImportProfile = { id: string; name: string; header_signature: string; options: ImportOptions; version: number };
export type ImportAnalysis = { sheets: ImportSheet[]; selected_sheet: string; profiles: ImportProfile[]; matched_profile_id: string | null };
export type ImportResult = { inserted: number; updated: number; unchanged: number; skipped: number; errors: { row: number; reason: string }[]; already_applied?: boolean };
export type ImportPreview = ImportResult & {
  preview_id: string; expires_at: string; source_rows: number; normalized_contacts: number;
  distinct_credits: number; credits_with_multiple_phones: number; zero_balance_contacts: number;
  can_confirm: boolean; blocked_reason: string | null;
};
