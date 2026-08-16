import "server-only";

import { auth } from "@/auth";

export type CampaignRecord = {
  id: string;
  name: string;
  objective: "payment_reminder" | "agreement_follow_up";
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled" | "failed";
};
export type CampaignDetail = CampaignRecord & {
  organization_id: string;
  portfolio: PortfolioRecord & { organization_id: string; last_validated_at?: string | null };
  agent_profile: AgentProfileRecord & { organization_id: string };
  schedule: {
    timezone: string; start_at: string; end_at: string;
    retry_minutes: number; max_attempts_per_recipient: number;
  };
  created_at: string;
  completed_at?: string | null;
  completion_reason?: string | null;
};
export type CampaignPreflight = {
  ready: boolean; data_source_ready: boolean; adapter_available: boolean;
  healthcheck_ok: boolean; eligible_recipients: number; count_truncated: boolean;
  invalid_recipients: number;
  issues: Array<"data_source_not_ready" | "adapter_not_configured" | "healthcheck_failed" | "no_eligible_recipients" | "invalid_recipients" | "recipient_count_truncated">;
};
export type CampaignExecutionRecord = {
  id: string; campaign_id: string; status: "pending" | "running" | "completed" | "cancelled" | "failed";
  created_at: string; started_at?: string | null; completed_at?: string | null;
  completion_reason?: string | null;
};
export type CampaignCallAttemptRecord = {
  id: string; execution_id: string; campaign_id: string; call_uuid: string;
  attempt_number: number;
  technical_status: "prepared" | "originating" | "connected" | "completed" | "no_answer" | "failed" | "cancelled";
  error_code?: string | null; created_at: string; started_at?: string | null; completed_at?: string | null;
};
export type AuditEventRecord = {
  id: string; actor_subject: string; actor_display_name?: string | null; action: string; entity_type: string;
  entity_id: string; metadata: Record<string, unknown>; created_at: string;
};
export type QualityCallRecord = {
  uuid: string; updated_at: string; updated_local: string; size_bytes: number;
};
export type ConversationEvent = {
  time: string; kind: "client" | "agent" | "system" | "voicemail"; text: string;
};
export type QualityConversation = {
  uuid: string; truncated: boolean; events: ConversationEvent[];
};

export type MemberRole = "owner" | "admin" | "operator" | "analyst" | "viewer";
export type CurrentMembership = { subject: string; organization_id: string; organization_name: string; role: MemberRole };
export type MemberRecord = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  role: MemberRole;
  status: "active" | "pending";
  created_at: string;
};
export type MemberInvitationRecord = MemberRecord & {
  delivery_status: "sent" | "not_configured" | "failed";
};
export type DataSourceRecord = {
  id: string; name: string; adapter_type: "local_poc" | "mysql" | "postgresql" | "http_api";
  status: "unverified" | "ready" | "error" | "disabled";
};
export type DataSourceVerification = {
  data_source_id: string;
  adapter_type: DataSourceRecord["adapter_type"];
  status: "ready" | "requires_connection" | "error";
  adapter_available: boolean;
  healthcheck_ok: boolean;
  mapping_configured: boolean;
  portfolios_found: number;
  eligible_recipients?: number | null;
  checked_at: string;
  message: string;
};
export type SqlDataSourceMapping = {
  schema_name?: string | null; table_name: string;
  portfolio_column?: string | null; default_portfolio_key?: string | null;
  active_column?: string | null; active_value?: string | number | boolean | null;
  columns: {
    external_client_id: string; phone: string; external_account_id?: string | null;
    customer_name?: string | null; address?: string | null; balance_due?: string | null;
    reference_date?: string | null; payment_day?: string | null; product?: string | null;
    overdue_payments?: string | null; payment_frequency?: string | null;
    installment_amount?: string | null;
  };
};
export type SqlDataSourcePlan = {
  statement_type: "SELECT";
  values_bound: true;
  qualified_table: string;
  projected_fields: string[];
  portfolio_mode: "column" | "fixed";
  active_filter: boolean;
};
export type PortfolioRecord = {
  id: string; data_source_id: string; external_key: string; name: string;
  estimated_recipients?: number | null;
};
export type LocalClientRecord = {
  id: number; position: number; activo: 1;
  nombre_cliente: string; telefono: string;
  dia_pago?: string | null; saldo_pendiente: number;
  articulo?: string | null; pagos_atrasados: number;
  modalidad?: string | null; cuota_semanal: number;
};
export type AgentProfileRecord = {
  id: string; version: number; agent_name: string; company_name: string;
  personality: string; voice_id?: string | null;
};
export type CampaignCreatePayload = {
  name: string;
  objective: "payment_reminder" | "agreement_follow_up";
  portfolio_id: string;
  agent_profile_version_id: string;
  schedule: {
    timezone: string; start_at: string; end_at: string;
    retry_minutes: number; max_attempts_per_recipient: number;
  };
  notes: string;
};

async function controlApi<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  if (!session?.accessToken) throw new Error("missing_session");
  if (session.accessTokenExpiresAt && session.accessTokenExpiresAt * 1000 <= Date.now()) {
    throw new Error("expired_session");
  }
  const baseUrl = process.env.CONTROL_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("missing_control_api_url");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`control_api_${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getCampaigns(): Promise<CampaignRecord[]> {
  return controlApi<CampaignRecord[]>("/v1/campaigns");
}

export async function getQualityCalls(): Promise<QualityCallRecord[]> {
  return controlApi<QualityCallRecord[]>("/v1/quality/calls?limit=200");
}

export async function getQualityConversation(callUuid: string): Promise<QualityConversation> {
  return controlApi<QualityConversation>(`/v1/quality/calls/${encodeURIComponent(callUuid)}`);
}

export async function getCampaign(id: string): Promise<CampaignDetail> {
  return controlApi<CampaignDetail>(`/v1/campaigns/${encodeURIComponent(id)}`);
}

export async function getCampaignPreflight(id: string): Promise<CampaignPreflight> {
  return controlApi<CampaignPreflight>(`/v1/campaigns/${encodeURIComponent(id)}/preflight`);
}

export async function getCampaignExecutions(id: string): Promise<CampaignExecutionRecord[]> {
  return controlApi<CampaignExecutionRecord[]>(`/v1/campaigns/${encodeURIComponent(id)}/executions`);
}

export async function getCampaignAttempts(id: string): Promise<CampaignCallAttemptRecord[]> {
  return controlApi<CampaignCallAttemptRecord[]>(`/v1/campaigns/${encodeURIComponent(id)}/attempts`);
}

export async function getCampaignAuditEvents(id: string): Promise<AuditEventRecord[]> {
  return controlApi<AuditEventRecord[]>(`/v1/campaigns/${encodeURIComponent(id)}/audit-events`);
}

export async function getAuditEvents(): Promise<AuditEventRecord[]> {
  return controlApi<AuditEventRecord[]>("/v1/audit-events");
}

export async function changeCampaignStatus(
  id: string,
  status: "scheduled" | "running" | "paused" | "cancelled",
  reason?: string,
): Promise<CampaignRecord> {
  return controlApi<CampaignRecord>(`/v1/campaigns/${encodeURIComponent(id)}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason: reason || null }),
  });
}

export async function getCurrentMembership(): Promise<CurrentMembership> {
  return controlApi<CurrentMembership>("/v1/me");
}

export async function getMembers(): Promise<MemberRecord[]> {
  return controlApi<MemberRecord[]>("/v1/members");
}

export async function getDataSources(): Promise<DataSourceRecord[]> {
  return controlApi<DataSourceRecord[]>("/v1/data-sources");
}

export async function getDataSourceVerification(id: string): Promise<DataSourceVerification> {
  return controlApi<DataSourceVerification>(
    `/v1/data-sources/${encodeURIComponent(id)}/verification`,
  );
}

export async function createDataSource(
  name: string,
  adapterType: DataSourceRecord["adapter_type"],
): Promise<DataSourceRecord> {
  return controlApi<DataSourceRecord>("/v1/data-sources", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, adapter_type: adapterType }),
  });
}

export async function syncLocalPocPortfolios(id: string): Promise<PortfolioRecord[]> {
  return controlApi<PortfolioRecord[]>(
    `/v1/data-sources/${encodeURIComponent(id)}/sync-local-portfolios`,
    { method: "POST" },
  );
}

export async function createLocalPocPortfolio(
  id: string, payload: { name: string; key?: string; description?: string },
): Promise<PortfolioRecord> {
  return controlApi<PortfolioRecord>(`/v1/data-sources/${encodeURIComponent(id)}/local-portfolios`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function getLocalPocClients(id: string): Promise<LocalClientRecord[]> {
  return controlApi<LocalClientRecord[]>(`/v1/portfolios/${encodeURIComponent(id)}/local-clients`);
}

export async function createLocalPocClient(
  id: string,
  payload: Omit<LocalClientRecord, "id" | "position" | "activo">,
): Promise<LocalClientRecord> {
  return controlApi<LocalClientRecord>(`/v1/portfolios/${encodeURIComponent(id)}/local-clients`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function updateLocalPocClient(
  portfolioId: string, clientId: number,
  payload: Omit<LocalClientRecord, "id" | "position" | "activo">,
): Promise<LocalClientRecord> {
  return controlApi<LocalClientRecord>(
    `/v1/portfolios/${encodeURIComponent(portfolioId)}/local-clients/${clientId}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
}

export async function deactivateLocalPocClient(
  portfolioId: string, clientId: number,
): Promise<void> {
  return controlApi<void>(
    `/v1/portfolios/${encodeURIComponent(portfolioId)}/local-clients/${clientId}/deactivate`,
    { method: "POST" },
  );
}

export async function startLocalPocTestCall(
  portfolioId: string, clientId: number,
): Promise<{ call_uuid: string; status: "originating"; client_id: number; portfolio_id: string }> {
  return controlApi(
    `/v1/portfolios/${encodeURIComponent(portfolioId)}/local-clients/${clientId}/test-call`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true }) },
  );
}

export async function getSqlDataSourceMapping(id: string): Promise<SqlDataSourceMapping> {
  return controlApi<SqlDataSourceMapping>(`/v1/data-sources/${encodeURIComponent(id)}/mapping`);
}

export async function updateSqlDataSourceMapping(
  id: string, mapping: SqlDataSourceMapping,
): Promise<SqlDataSourceMapping> {
  return controlApi<SqlDataSourceMapping>(`/v1/data-sources/${encodeURIComponent(id)}/mapping`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mapping),
  });
}

export async function getSqlDataSourcePlan(id: string): Promise<SqlDataSourcePlan> {
  return controlApi<SqlDataSourcePlan>(`/v1/data-sources/${encodeURIComponent(id)}/mapping-plan`);
}

export async function getPortfolios(): Promise<PortfolioRecord[]> {
  return controlApi<PortfolioRecord[]>("/v1/portfolios");
}

export async function createPortfolio(payload: {
  data_source_id: string; external_key: string; name: string; estimated_recipients?: number;
}): Promise<PortfolioRecord> {
  return controlApi<PortfolioRecord>("/v1/portfolios", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function getAgentProfiles(): Promise<AgentProfileRecord[]> {
  return controlApi<AgentProfileRecord[]>("/v1/agent-profiles");
}

export async function createAgentProfile(payload: {
  profile_key: string; agent_name: string; company_name: string;
  personality: string; voice_id?: string;
}): Promise<AgentProfileRecord> {
  return controlApi<AgentProfileRecord>("/v1/agent-profiles", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function createCampaign(payload: CampaignCreatePayload): Promise<CampaignRecord> {
  return controlApi<CampaignRecord>("/v1/campaigns", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}

export async function inviteMember(email: string, role: MemberRole): Promise<MemberInvitationRecord> {
  return controlApi<MemberInvitationRecord>("/v1/member-invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
}

export async function changeMemberRole(id: string, role: MemberRole): Promise<MemberRecord> {
  return controlApi<MemberRecord>(`/v1/members/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function revokeMember(id: string): Promise<void> {
  return controlApi<void>(`/v1/members/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function revokeInvitation(id: string): Promise<void> {
  return controlApi<void>(`/v1/member-invitations/${encodeURIComponent(id)}`, { method: "DELETE" });
}
