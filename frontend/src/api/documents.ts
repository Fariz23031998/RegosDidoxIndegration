import apiClient from './client';
import { DocumentListItem, DocumentListResponse, DocumentDetailData, DocumentFilter, DocumentType, AuthResponse, CertificateInfo, CertificatesResponse } from '../types';

export const authApi = {
  userLogin: async (username: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const response = await apiClient.post<{ access_token: string; token_type: string }>('/api/auth/user-login', {
      username,
      password
    });
    if (response.data.access_token) {
      localStorage.setItem('jwt_token', response.data.access_token);
    }
    return response.data;
  },


  didoxLogin: async (pkcs7: string, signatureHex: string, taxId: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/didox-login', {
      pkcs7,
      signature_hex: signatureHex,
      tax_id: taxId
    });
    return response.data;
  },
};

export const documentsApi = {
  getDocuments: async (filter: DocumentFilter = {}): Promise<DocumentListResponse> => {
    const params = new URLSearchParams();
    params.append('owner', String(filter.owner !== undefined ? filter.owner : 1)); // Default to outgoing (1)
    if (filter.document_type) params.append('document_type', filter.document_type);
    if (filter.date_from) params.append('date_from', filter.date_from);
    if (filter.date_to) params.append('date_to', filter.date_to);
    if (filter.partner) params.append('partner', filter.partner);
    params.append('page', String(filter.page || 1));
    params.append('limit', String(filter.limit || 20));

    const response = await apiClient.get<DocumentListResponse>(`/api/documents?${params.toString()}`);
    return response.data;
  },

  getDocument: async (documentId: string): Promise<DocumentDetailData> => {
    const response = await apiClient.get<DocumentDetailData>(`/api/documents/${documentId}`);
    return response.data;
  },

  downloadDocument: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getDocumentTypes: async (): Promise<DocumentType[]> => {
    // Document types might need to be hardcoded or fetched from a different endpoint
    // Based on the doctype field (e.g., "002", "000")
    return [
      { code: 0, name: 'Счёт фактура', name_en: 'Invoice' },
      { code: 1, name: 'ТТН', name_en: 'Waybill' },
      { code: 2, name: 'Акт', name_en: 'Act' },
    ];
  },
};

export const regosApi = {
  matchProducts: async (matchType: 'Code' | 'Name' | 'Articul' | 'Barcode', products: Array<{ index: string; value: string }>) => {
    const response = await apiClient.post('/api/regos/match-products', {
      type: matchType,
      data: products
    });
    return response.data;
  },

  addItem: async (itemData: any) => {
    const response = await apiClient.post('/api/regos/add-item', itemData);
    return response.data;
  },
};
