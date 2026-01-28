import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import { DocumentListItem, DocumentFilter, DocumentType } from '../types';
import { format } from 'date-fns';
import './DocumentsList.css';

const DocumentsList = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocumentFilter>({
    owner: 1,  // Default to outgoing documents
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocumentTypes = async () => {
    try {
      const types = await documentsApi.getDocumentTypes();
      setDocumentTypes(types);
    } catch (err) {
      console.error('Failed to load document types:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await documentsApi.getDocuments(filter);
      setDocuments(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load documents');
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof DocumentFilter, value: any) => {
    setFilter((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilter((prev) => ({ ...prev, page: newPage }));
  };

  const getDocumentTypeName = (doc: DocumentListItem): string => {
    // Map doctype codes to names
    const typeMap: Record<string, string> = {
      '006': 'Доверенность',
      '061': 'Доверенность',
      '005': 'Акт',
      '001': 'Счет-фактура',
      '002': 'Счет-фактура без акта',
      '021': 'Счет-фактура Возврат',
      '008': 'Счет-фактура (ФАРМ)',
      '081': 'Счет-фактура (ФАРМ) Возврат',
      '000': 'Произвольный документ',
    };
    return typeMap[doc.doctype] || `Тип ${doc.doctype}`;
  };

  const getDocumentStatus = (status: number): string => {
    const statusMap: Record<number, string> = {
      1: 'Черновик',
      2: 'Отправлен',
      3: 'Подписан',
      4: 'Отклонён',
    };
    return statusMap[status] || `Статус ${status}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const totalPages = Math.ceil(total / (filter.limit || 20));

  return (
    <div className="documents-list">
      <div className="documents-header">
        <h2>Documents</h2>
        <button onClick={loadDocuments} className="refresh-btn">
          Refresh
        </button>
      </div>

      <div className="documents-filters">
        <select
          value={filter.owner !== undefined ? filter.owner : 1}
          onChange={(e) => handleFilterChange('owner', parseInt(e.target.value))}
          className="filter-select"
        >
          <option value="1">Outgoing Documents</option>
          <option value="0">Incoming Documents</option>
        </select>

        <select
          value={filter.document_type || ''}
          onChange={(e) => handleFilterChange('document_type', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">Все типы</option>
          <option value="006">Доверенность (006)</option>
          <option value="061">Доверенность (061)</option>
          <option value="005">Акт (005)</option>
          <option value="001">Счет-фактура (001)</option>
          <option value="002">Счет-фактура без акта (002)</option>
          <option value="021">Счет-фактура Возврат (021)</option>
          <option value="008">Счет-фактура (ФАРМ) (008)</option>
          <option value="081">Счет-фактура (ФАРМ) Возврат (081)</option>
          <option value="000">Произвольный документ (000)</option>
        </select>

        <input
          type="date"
          value={filter.date_from || ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
          placeholder="Date From"
          className="filter-input"
        />

        <input
          type="date"
          value={filter.date_to || ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
          placeholder="Date To"
          className="filter-input"
        />

        <input
          type="text"
          value={filter.partner || ''}
          onChange={(e) => handleFilterChange('partner', e.target.value || undefined)}
          placeholder="Partner TIN"
          className="filter-input"
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="empty-state">No documents found</div>
      ) : (
        <>
          <div className="documents-grid">
            {documents.map((doc) => (
              <Link
                key={doc.doc_id}
                to={`/documents/${doc.doc_id}`}
                className="document-card"
              >
                <div className="document-card-header">
                  <span className="document-type">{getDocumentTypeName(doc)}</span>
                  <span className={`document-status status-${doc.doc_status}`}>
                    {getDocumentStatus(doc.doc_status)}
                  </span>
                </div>
                <div className="document-card-body">
                  <div className="document-name">
                    <strong>{doc.name}</strong>
                  </div>
                  <div className="document-info">
                    <div className="info-row">
                      <span className="info-label">Дата:</span>
                      <span className="info-value">{doc.doc_date}</span>
                    </div>
                    {doc.partnerCompany && (
                      <div className="info-row">
                        <span className="info-label">Партнёр:</span>
                        <span className="info-value">{doc.partnerCompany}</span>
                      </div>
                    )}
                    {doc.total_sum !== null && doc.total_sum !== undefined && (
                      <div className="info-row">
                        <span className="info-label">Сумма:</span>
                        <span className="info-value">
                          {new Intl.NumberFormat('ru-RU', {
                            style: 'currency',
                            currency: 'UZS',
                            minimumFractionDigits: 0,
                          }).format(doc.total_sum)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="document-meta">
                    <span className="document-id">ID: {doc.doc_id.slice(0, 8)}...</span>
                    <span className="document-date">
                      Создан: {formatDate(doc.created)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange((filter.page || 1) - 1)}
                disabled={filter.page === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {filter.page} of {totalPages} (Total: {total})
              </span>
              <button
                onClick={() => handlePageChange((filter.page || 1) + 1)}
                disabled={filter.page === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsList;
