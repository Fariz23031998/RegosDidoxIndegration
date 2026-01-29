// Document from list endpoint
export interface DocumentListItem {
  owner: number;
  pid: number;
  doc_id: string;
  usersTaxId: string;
  name: string;
  doc_date: string;
  doc_status: number;
  doctype: string;
  contract_number?: string | null;
  contract_date?: string | null;
  partnerTin: string;
  partnerPinfl?: string | null;
  partnerCompany: string;
  partnerPhone?: string | null;
  total_sum?: number | null;
  total_delivery_sum?: number | null;
  total_vat_sum?: number | null;
  total_delivery_sum_with_vat?: number | null;
  oneside?: number | null;
  has_vat: boolean;
  has_committent?: number | null;
  has_lgota?: number | null;
  has_marks?: number | null;
  updated: string;
  updated_date?: string | null;
  updated_unix?: number | null;
  created: string;
  created_unix?: number | null;
  partiesID: string;
  roaming_id?: string | null;
  lgota_codes?: string | null;
  factura_type?: number | null;
  scoring?: any;
  sellerAccount?: string | null;
  status_comment?: string | null;
  internal_status?: any;
  internal_comment?: string | null;
  internal_status_alarm?: any;
  is_creator?: any;
  agent: number;
  mark_codes?: string | null;
  signed?: string | null;
  branch_num?: string | null;
  subtype?: number | null;
}

// Document detail response structure
export interface DocumentDetailData {
  data: {
    json: any; // Document JSON structure (facturadoc, contractdoc, etc.)
    document: {
      doc_id: string;
      _id: string;
      id: string;
      name: string;
      internal_status?: any;
      updated: string;
      created: string;
      doctype: string;
      has_attachments?: any;
      factura_type: number;
      reverse_calc: boolean;
      authorTaxId?: string | null;
      signature?: string;
      sourceId?: any;
      additional: any[];
      extended_json?: any;
      status_comment: string;
      status: number;
      doc_status: number;
      owner: number;
      company_department_id?: any;
      internal_comment?: any;
      has_copy_restriction: boolean;
      has_cancel_restriction?: any;
      factoringBlocks: any[];
      scoring?: any;
    };
    toSign?: any;
    isValid: boolean;
    relatedDocuments: any[];
    requestToByResponse?: any;
    attachments?: any;
  };
}

// Alias for backward compatibility
export type Document = DocumentListItem;

export interface DocumentListResponse {
  data: DocumentListItem[];
  total: number;
  next_page_url?: string;
  source?: string;
}

export interface DocumentType {
  code: number;
  name: string;
  name_en: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
}

export interface DocumentFilter {
  document_type?: string;
  date_from?: string;
  date_to?: string;
  owner?: number;  // 1 = outgoing, 0 = incoming
  partner?: string;  // Partner TIN/ID
  page?: number;
  limit?: number;
  use_mock?: boolean;
}

export interface CertificateInfo {
  disk: string;
  path: string;
  name: string;
  alias: string;
  index: number;
  cn?: string;
  serial?: string;
}

export interface CertificatesResponse {
  certificates: CertificateInfo[];
}

export interface Partner {
  id?: number;
  name?: string;
  fullname?: string;
  tin?: string;
  address?: string;
  phone?: string;
  [key: string]: any; // Allow other fields from REGOS API
}

export interface GetPartnersResponse {
  ok: boolean;
  result: {
    result: Partner[];
    next_offset?: number;
    total: number;
  };
}

export interface PartnerGroup {
  id?: number;
  name?: string;
  parent_id?: number;
  [key: string]: any; // Allow other fields from REGOS API
}

export interface GetPartnerGroupsResponse {
  ok: boolean;
  result: PartnerGroup[] | { result: PartnerGroup[] };
}

export interface Stock {
  id?: number;
  name?: string;
  address?: string;
  description?: string;
  area?: number;
  deleted_mark?: boolean;
  firm?: any;
  [key: string]: any;
}

export interface GetStocksResponse {
  ok: boolean;
  result: Stock[] | { result: Stock[] };
  next_offset?: number;
  total?: number;
}

export interface Currency {
  id?: number;
  code_num?: number;
  code_chr?: string;
  name?: string;
  exchange_rate?: number;
  is_base?: boolean;
  deleted?: boolean;
  [key: string]: any;
}

export interface GetCurrenciesResponse {
  ok: boolean;
  result: Currency[] | { result: Currency[] };
  next_offset?: number;
  total?: number;
}

export interface PriceType {
  id?: number;
  name?: string;
  round_to?: number;
  markup?: number;
  max_discount?: number;
  currency?: Currency;
  currency_additional?: Currency;
  [key: string]: any;
}

export interface GetPriceTypesResponse {
  ok: boolean;
  result: PriceType[] | { result: PriceType[] };
  next_offset?: number;
  total?: number;
}

export interface ItemGroup {
  id?: number;
  parent_id?: number;
  name?: string;
  path?: string;
  child_count?: number;
  last_update?: number;
  [key: string]: any;
}

export interface GetItemGroupsResponse {
  ok: boolean;
  result: ItemGroup[] | { result: ItemGroup[] };
}
