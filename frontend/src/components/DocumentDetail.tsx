import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { documentsApi, regosApi } from '../api/documents';
import { DocumentDetailData } from '../types';
import { format } from 'date-fns';
import './DocumentDetail.css';

interface ProductWithRegos {
  original: any;
  regosCode?: string;
  regosBarcode?: string;
  matchedItemId?: number;
  isMatching?: boolean;
  matchError?: string;
}

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documentDetail, setDocumentDetail] = useState<DocumentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [createIfNotMatched, setCreateIfNotMatched] = useState(false);
  const [productsWithRegos, setProductsWithRegos] = useState<ProductWithRegos[]>([]);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
  }, [id]);

  const loadDocument = async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const docDetail = await documentsApi.getDocument(documentId);
      setDocumentDetail(docDetail);
      
      // Initialize products with REGOS fields
      const products = docDetail.data.json?.productlist?.products || [];
      if (products.length > 0) {
        setProductsWithRegos(
          products.map((p: any) => ({
            original: p,
            regosCode: '',
            regosBarcode: '',
          }))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load document');
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegosCodeChange = (index: number, value: string) => {
    setProductsWithRegos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], regosCode: value, matchedItemId: undefined, matchError: undefined };
      return updated;
    });
  };

  const handleRegosBarcodeChange = (index: number, value: string) => {
    setProductsWithRegos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], regosBarcode: value, matchedItemId: undefined, matchError: undefined };
      return updated;
    });
  };

  const matchProduct = async (index: number) => {
    const product = productsWithRegos[index];
    if (!product.regosCode && !product.regosBarcode) {
      alert('Please enter REGOS code or barcode');
      return;
    }

    setProductsWithRegos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isMatching: true, matchError: undefined };
      return updated;
    });

    try {
      const matchType = product.regosCode ? 'Code' : 'Barcode';
      const matchValue = product.regosCode || product.regosBarcode || '';
      
      const result = await regosApi.matchProducts(matchType, [
        { index: String(index), value: matchValue }
      ]);

      if (result.ok && result.result && result.result.length > 0) {
        const match = result.result[0];
        setProductsWithRegos(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            matchedItemId: match.item_id,
            isMatching: false,
          };
          return updated;
        });
      } else {
        // No match found
        if (createIfNotMatched) {
          await createProductInRegos(index);
        } else {
          setProductsWithRegos(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              isMatching: false,
              matchError: 'Not found',
            };
            return updated;
          });
        }
      }
    } catch (err: any) {
      setProductsWithRegos(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isMatching: false,
          matchError: err.response?.data?.detail || 'Match failed',
        };
        return updated;
      });
    }
  };

  const createProductInRegos = async (index: number) => {
    const product = productsWithRegos[index];
    const original = product.original;

    try {
      // Prepare item data for REGOS
      const itemData: any = {
        name: original.name || 'Новый товар',
        package_code: original.packagecode || '',
      };

      if (product.regosCode) {
        const codeNum = parseInt(product.regosCode);
        if (!isNaN(codeNum)) {
          itemData.code = codeNum;
        }
      }

      // Use barcode as articul if provided
      if (product.regosBarcode) {
        itemData.articul = product.regosBarcode;
      }

      // Required fields - these should ideally come from configuration
      // For now, we'll try to create with minimal data and let REGOS API handle validation
      // In production, these should be configured in settings
      itemData.group_id = 1; // Default group - should be configurable
      itemData.vat_id = 1; // Default VAT - should be configurable  
      itemData.unit_id = 1; // Default unit - should be configurable

      const result = await regosApi.addItem(itemData);
      
      if (result.ok && result.new_id) {
        setProductsWithRegos(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            matchedItemId: result.new_id,
            isMatching: false,
          };
          return updated;
        });
      } else {
        throw new Error('Failed to create item');
      }
    } catch (err: any) {
      setProductsWithRegos(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isMatching: false,
          matchError: err.response?.data?.detail || err.message || 'Create failed',
        };
        return updated;
      });
    }
  };

  const matchAllProducts = async () => {
    setMatching(true);
    try {
      for (let i = 0; i < productsWithRegos.length; i++) {
        const product = productsWithRegos[i];
        if (product.regosCode || product.regosBarcode) {
          await matchProduct(i);
        }
      }
    } finally {
      setMatching(false);
    }
  };

  const handleDownload = async () => {
    if (!id) return;

    setDownloading(true);
    try {
      const blob = await documentsApi.downloadDocument(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download document');
      console.error('Failed to download document:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="document-detail">
        <div className="loading">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-detail">
        <div className="error-message">{error}</div>
        <Link to="/" className="back-link">Back to Documents</Link>
      </div>
    );
  }

  if (!documentDetail || !documentDetail.data) {
    return (
      <div className="document-detail">
        <div className="error-message">Document not found</div>
        <Link to="/" className="back-link">Back to Documents</Link>
      </div>
    );
  }

  const doc = documentDetail.data.document;
  const docJson = documentDetail.data.json;
  const products = docJson?.productlist?.products || [];
  
  // Calculate totals
  const totalSumma = products.reduce((sum: number, p: any) => sum + (p.summa || 0), 0);
  const totalDeliverySum = products.reduce((sum: number, p: any) => sum + (p.deliverysum || 0), 0);
  const totalDeliverySumWithVat = products.reduce((sum: number, p: any) => sum + (p.deliverysumwithvat || 0), 0);
  
  // Use productsWithRegos if available and initialized, otherwise use original products
  const displayProducts = productsWithRegos.length > 0 && productsWithRegos.length === products.length
    ? productsWithRegos
    : products.map((p: any) => ({ original: p, regosCode: '', regosBarcode: '' }));

  return (
    <div className="document-detail">
      <div className="document-detail-header">
        <Link to="/" className="back-link">← Back to Documents</Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="download-btn"
        >
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      <div className="document-info">
        <h2>{doc.name}</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Статус:</span>
            <span className={`info-value status-${doc.doc_status}`}>
              {doc.doc_status === 1 ? 'Черновик' : 
               doc.doc_status === 2 ? 'Отправлен' : 
               doc.doc_status === 3 ? 'Подписан' : 
               doc.doc_status === 4 ? 'Отклонён' : `Статус ${doc.doc_status}`}
            </span>
          </div>
          {docJson?.facturadoc && (
            <>
              <div className="info-item">
                <span className="info-label">Дата:</span>
                <span className="info-value">{docJson.facturadoc.facturadate}</span>
              </div>
            </>
          )}
          {docJson?.seller && (
            <div className="info-item">
              <span className="info-label">Продавец:</span>
              <span className="info-value">{docJson.seller.name}</span>
            </div>
          )}
          {docJson?.buyer && (
            <div className="info-item">
              <span className="info-label">Покупатель:</span>
              <span className="info-value">{docJson.buyer.name}</span>
            </div>
          )}
        </div>
      </div>

      {products.length > 0 && (
        <div className="products-section">
          <div className="products-section-header">
            <h3>Товары и услуги</h3>
            <div className="products-actions">
              <label className="create-if-not-matched-toggle">
                <input
                  type="checkbox"
                  checked={createIfNotMatched}
                  onChange={(e) => setCreateIfNotMatched(e.target.checked)}
                />
                <span>Создать если не найдено</span>
              </label>
              <button
                onClick={matchAllProducts}
                disabled={matching}
                className="match-all-btn"
              >
                {matching ? 'Сопоставление...' : 'Сопоставить все'}
              </button>
            </div>
          </div>
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Штрих-код</th>
                  <th>Ед. изм.</th>
                  <th>Код единицы</th>
                  <th>Код каталога</th>
                  <th>REGOS Код</th>
                  <th>REGOS Штрих-код</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                  <th>Сумма доставки</th>
                  <th>Всего с НДС</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((productWrapper: ProductWithRegos, index: number) => {
                  const product = productWrapper.original || productWrapper;
                  return (
                    <tr key={index}>
                      <td className="product-name">{product.name || '-'}</td>
                      <td>{product.barcode || '-'}</td>
                      <td>{product.packagename || '-'}</td>
                      <td>{product.packagecode || '-'}</td>
                      <td>{product.catalogcode || '-'}</td>
                      <td>
                        <input
                          type="text"
                          value={productWrapper.regosCode || ''}
                          onChange={(e) => handleRegosCodeChange(index, e.target.value)}
                          placeholder="Код"
                          className="regos-input"
                          onBlur={() => {
                            if (productWrapper.regosCode) {
                              matchProduct(index);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={productWrapper.regosBarcode || ''}
                          onChange={(e) => handleRegosBarcodeChange(index, e.target.value)}
                          placeholder="Штрих-код"
                          className="regos-input"
                          onBlur={() => {
                            if (productWrapper.regosBarcode) {
                              matchProduct(index);
                            }
                          }}
                        />
                      </td>
                      <td className="match-status">
                        {productWrapper.isMatching ? (
                          <span className="status-matching">Сопоставление...</span>
                        ) : productWrapper.matchedItemId ? (
                          <span className="status-matched">✓ ID: {productWrapper.matchedItemId}</span>
                        ) : productWrapper.matchError ? (
                          <span className="status-error">✗ {productWrapper.matchError}</span>
                        ) : (
                          <span className="status-pending">-</span>
                        )}
                      </td>
                      <td className="text-right">{formatCurrency(product.summa)}</td>
                      <td className="text-right">{formatCurrency(product.deliverysum)}</td>
                      <td className="text-right">{formatCurrency(product.deliverysumwithvat)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={8} className="text-right"><strong>Итого:</strong></td>
                  <td className="text-right"><strong>{formatCurrency(totalSumma)}</strong></td>
                  <td className="text-right"><strong>{formatCurrency(totalDeliverySum)}</strong></td>
                  <td className="text-right"><strong>{formatCurrency(totalDeliverySumWithVat)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="empty-state">Нет товаров в документе</div>
      )}
    </div>
  );
};

export default DocumentDetail;
