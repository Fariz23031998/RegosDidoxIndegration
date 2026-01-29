import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { documentsApi, regosApi } from '../api/documents';
import { DocumentDetailData, Partner, PartnerGroup } from '../types';
import { format } from 'date-fns';
import { ImportSettings } from './ImportSettings';
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
  const [addingToRegos, setAddingToRegos] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnerDropdownOpen, setPartnerDropdownOpen] = useState(false);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const [createPartnerFor, setCreatePartnerFor] = useState<'seller' | 'buyer' | null>(null);
  const [addPartnerForm, setAddPartnerForm] = useState<{
    name: string;
    fullname: string;
    tin: string;
    address: string;
    phone: string;
    pinfl: string;
    bank_details: string;
    comment: string;
    group_id: number | null;
    legal_status: number | null;
  }>({
    name: '', fullname: '', tin: '', address: '', phone: '', pinfl: '', bank_details: '', comment: '', group_id: null, legal_status: null,
  });
  const [partnerGroups, setPartnerGroups] = useState<PartnerGroup[]>([]);
  const [loadingPartnerGroups, setLoadingPartnerGroups] = useState(false);
  const [addPartnerSubmitting, setAddPartnerSubmitting] = useState(false);
  const [addPartnerError, setAddPartnerError] = useState<string | null>(null);
  const createPartnerMenuRef = useRef<HTMLDivElement>(null);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(null);
  const [selectedPriceTypeId, setSelectedPriceTypeId] = useState<number | null>(null);
  const [selectedItemGroupId, setSelectedItemGroupId] = useState<number | null>(null);
  const [vatCalculationType, setVatCalculationType] = useState<1 | 2 | 3 | null>(null);

  const loadPartners = useCallback(async () => {
    console.log('[loadPartners] Function called');
    setLoadingPartners(true);
    try {
      console.log('[loadPartners] Calling API...');
      const response = await regosApi.getPartners({ limit: 100 });
      console.log('[loadPartners] API response received:', response);
      
      // Handle the response structure from REGOS API
      if (response.ok) {
        // The result can be either directly an object with result array, or the result itself
        if (response.result) {
          if (Array.isArray(response.result)) {
            // If result is directly an array
            setPartners(response.result);
          } else if (response.result.result && Array.isArray(response.result.result)) {
            // If result is an object with result array
            setPartners(response.result.result);
          } else {
            console.warn('Unexpected response structure:', response);
          }
        }
      } else {
        console.error('API returned ok=false:', response);
      }
    } catch (err: any) {
      console.error('Failed to load partners:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
    loadPartners();
  }, [id, loadPartners]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target as Node)) {
        setPartnerDropdownOpen(false);
      }
    };

    if (partnerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [partnerDropdownOpen]);

  // Close create partner menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createPartnerFor && createPartnerMenuRef.current && !createPartnerMenuRef.current.contains(event.target as Node)) {
        setCreatePartnerFor(null);
        setAddPartnerError(null);
      }
    };
    if (createPartnerFor) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [createPartnerFor]);

  const loadPartnerGroups = useCallback(async () => {
    setLoadingPartnerGroups(true);
    try {
      const response = await regosApi.getPartnerGroups({});
      if (response.ok) {
        if (Array.isArray(response.result)) {
          setPartnerGroups(response.result);
        } else if (response.result && typeof response.result === 'object' && 'result' in response.result) {
          setPartnerGroups((response.result as { result: PartnerGroup[] }).result);
        }
      }
    } catch (err: any) {
      console.error('Failed to load partner groups:', err);
    } finally {
      setLoadingPartnerGroups(false);
    }
  }, []);

  const openCreatePartnerMenu = useCallback((role: 'seller' | 'buyer', json: any) => {
    const party = role === 'seller' ? json?.seller : json?.buyer;
    const tin = role === 'seller' ? json?.sellertin : json?.buyertin;
    setCreatePartnerFor(role);
    setAddPartnerError(null);
    setAddPartnerForm({
      name: party?.name || '',
      fullname: party?.name || '',
      tin: tin || '',
      address: party?.address || '',
      phone: party?.mobile || party?.workphone || '',
      pinfl: '',
      bank_details: party?.account ? `Account: ${party.account}` : '',
      comment: '',
      group_id: null,
      legal_status: null,
    });
    loadPartnerGroups();
  }, [loadPartnerGroups]);

  const handleAddPartnerSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAddPartnerSubmitting(true);
    setAddPartnerError(null);
    try {
      const payload: Record<string, string | number | undefined> = {
        name: addPartnerForm.name || undefined,
        fullname: addPartnerForm.fullname || undefined,
        tin: addPartnerForm.tin || undefined,
        address: addPartnerForm.address || undefined,
        phone: addPartnerForm.phone || undefined,
        pinfl: addPartnerForm.pinfl || undefined,
        bank_details: addPartnerForm.bank_details || undefined,
        comment: addPartnerForm.comment || undefined,
      };
      // Add group_id if it's not null (required field)
      if (addPartnerForm.group_id !== null) {
        payload.group_id = addPartnerForm.group_id;
      }
      // Add legal_status if it's not null (required field)
      if (addPartnerForm.legal_status !== null) {
        payload.legal_status = addPartnerForm.legal_status;
      }
      // Remove empty/null/undefined values
      Object.keys(payload).forEach(k => {
        if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
          delete payload[k];
        }
      });
      const result = await regosApi.addPartner(payload);
      if (result.ok) {
        const newId = typeof result.result === 'number'
          ? result.result
          : (result.result as { new_id?: number } | undefined)?.new_id;
        setCreatePartnerFor(null);
        setPartnerDropdownOpen(false);
        await loadPartners();
        if (newId != null) {
          setSelectedPartnerId(newId);
        }
      } else {
        setAddPartnerError('Не удалось создать партнера');
      }
    } catch (err: any) {
      setAddPartnerError(err.response?.data?.detail || err.message || 'Ошибка при создании партнера');
    } finally {
      setAddPartnerSubmitting(false);
    }
  }, [addPartnerForm, loadPartners]);

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

      // Required fields - from settings or defaults
      itemData.group_id = selectedItemGroupId ?? 1;
      itemData.vat_id = 1; // Default VAT - should be configurable
      itemData.unit_id = 1; // Default unit - should be configurable

      if (selectedPartnerId) {
        itemData.partner_id = selectedPartnerId;
      }

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

  /** Match or create product and return REGOS item_id, or null if not found and not creating */
  const getItemIdForProduct = async (index: number): Promise<number | null> => {
    const product = productsWithRegos[index];
    const matchValue = product.regosCode || product.regosBarcode || '';

    if (matchValue) {
      const matchType = product.regosCode ? 'Code' : 'Barcode';
      const matchResult = await regosApi.matchProducts(matchType, [{ index: String(index), value: matchValue }]);
      if (matchResult.ok && matchResult.result && Array.isArray(matchResult.result) && matchResult.result.length > 0) {
        return matchResult.result[0].item_id ?? null;
      }
    }

    if (createIfNotMatched) {
      const original = product.original;
      const itemData: any = {
        name: original?.name || 'Новый товар',
        package_code: original?.packagecode || '',
        group_id: selectedItemGroupId ?? 1,
        vat_id: 1,
        unit_id: 1,
        type: 1,
      };
      if (product.regosCode) {
        const codeNum = parseInt(product.regosCode);
        if (!isNaN(codeNum)) itemData.code = codeNum;
      }
      if (product.regosBarcode) itemData.articul = product.regosBarcode;
      if (selectedPartnerId) itemData.partner_id = selectedPartnerId;

      const createResult = await regosApi.addItem(itemData);
      if (!createResult.ok) return null;
      const newId = typeof createResult.result === 'number' ? createResult.result : (createResult.result as { new_id?: number })?.new_id;
      return newId ?? null;
    }
    return null;
  };

  const handleAddToRegos = async () => {
    if (!selectedPartnerId || !selectedStockId || !selectedCurrencyId) {
      alert('Выберите партнера, склад и валюту в настройках импорта.');
      return;
    }
    const products = productsWithRegos;
    const withRegos = products.filter(p => p.regosCode || p.regosBarcode);
    const canAddAny = createIfNotMatched && products.some(p => p.original?.name);
    if (withRegos.length === 0 && !canAddAny) {
      alert(createIfNotMatched
        ? 'Добавьте хотя бы один товар с наименованием или укажите REGOS код/штрих-код.'
        : 'Укажите REGOS код или штрих-код хотя бы у одного товара.');
      return;
    }

    setAddingToRegos(true);
    const vatTypeMap: Record<number, 'Не начислять' | 'В сумме' | 'Сверху'> = {
      1: 'Не начислять',
      2: 'В сумме',
      3: 'Сверху',
    };
    const docPayload: any = {
      date: Math.floor(Date.now() / 1000),
      partner_id: Number(selectedPartnerId),
      stock_id: Number(selectedStockId),
      currency_id: Number(selectedCurrencyId),
      attached_user_id: 1,
      vat_calculation_type: vatTypeMap[vatCalculationType ?? 1],
    };
    if (selectedPriceTypeId != null) {
      docPayload.price_type_id = Number(selectedPriceTypeId);
    }
    console.log('Sending purchase document payload:', docPayload);

    try {
      const docRes = await regosApi.addDocPurchase(docPayload);
      if (!docRes.ok) {
        alert('Не удалось создать документ поступления.');
        return;
      }
      const docId = typeof docRes.result === 'number' ? docRes.result : (docRes.result as { new_id?: number })?.new_id;
      if (docId == null) {
        alert('Не удалось создать документ поступления.');
        return;
      }

      const operations: Array<{ document_id: number; item_id: number; quantity: number; cost: number; vat_value: number; price?: number }> = [];
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const hasRegosId = p.regosCode || p.regosBarcode;
        if (!hasRegosId && !createIfNotMatched) continue;
        if (!hasRegosId && createIfNotMatched && !p.original?.name) continue;
        const itemId = await getItemIdForProduct(i);
        if (!itemId) continue;
        const orig = p.original;
        const count = orig?.count != null ? Number(orig.count) : 1;
        const qty = count > 0 ? count : 1;
        const deliverysum = Number(orig?.deliverysum) || 0;
        const deliverysumwithvat = Number(orig?.deliverysumwithvat) || deliverysum;
        const cost = qty > 0 ? deliverysum / qty : deliverysum;
        const vatrate = Number(orig?.vatrate) ?? 0;
        const price = qty > 0 ? deliverysumwithvat / qty : undefined;
        operations.push({
          document_id: docId,
          item_id: itemId,
          quantity: qty,
          cost,
          vat_value: vatrate,
          ...(price != null && !isNaN(price) ? { price } : {}),
        });
      }

      if (operations.length === 0) {
        alert('Нет товаров для добавления (сопоставьте или создайте товары).');
        return;
      }

      await regosApi.addPurchaseOperation(operations);
      await matchAllProducts();
      alert(`Документ поступления создан (ID: ${docId}). Добавлено операций: ${operations.length}.`);
    } catch (err: any) {
      console.error('Add to Regos failed:', err);
      console.error('Request payload:', docPayload);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = 'Ошибка при добавлении в Regos';
      if (err.response?.data) {
        const errorData = err.response.data;
        if (Array.isArray(errorData.detail)) {
          // FastAPI validation errors
          errorMessage = 'Ошибка валидации:\n' + errorData.detail.map((e: any) => 
            `${e.loc?.join('.')}: ${e.msg}`
          ).join('\n');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail) {
          errorMessage = JSON.stringify(errorData.detail, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      alert(errorMessage);
    } finally {
      setAddingToRegos(false);
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
            <div className="info-item info-item-with-action">
              <span className="info-label">Продавец:</span>
              <span className="info-value">{docJson.seller.name}</span>
              <button
                type="button"
                className="info-add-btn"
                onClick={() => openCreatePartnerMenu('seller', docJson)}
                title="Создать партнера в REGOS"
              >
                +
              </button>
            </div>
          )}
          {docJson?.buyer && (
            <div className="info-item info-item-with-action">
              <span className="info-label">Покупатель:</span>
              <span className="info-value">{docJson.buyer.name}</span>
              <button
                type="button"
                className="info-add-btn"
                onClick={() => openCreatePartnerMenu('buyer', docJson)}
                title="Создать партнера в REGOS"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {createPartnerFor && (
        <div
          className="create-partner-popup-backdrop"
          onClick={() => { setCreatePartnerFor(null); setAddPartnerError(null); }}
          role="presentation"
        >
          <div
            className="create-partner-menu-wrapper"
            ref={createPartnerMenuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="create-partner-menu">
              <h4 className="create-partner-menu-title">
                Создать партнера в REGOS {createPartnerFor === 'seller' ? '(Продавец)' : '(Покупатель)'}
              </h4>
              <form onSubmit={handleAddPartnerSubmit} className="create-partner-form">
                <div className="create-partner-field">
                  <label>Наименование *</label>
                  <input
                    value={addPartnerForm.name}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Название организации"
                    required
                  />
                </div>
                <div className="create-partner-field">
                  <label>Группа партнеров *</label>
                  <select
                    value={addPartnerForm.group_id || ''}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, group_id: e.target.value ? parseInt(e.target.value) : null }))}
                    required
                    disabled={loadingPartnerGroups}
                    className="create-partner-select"
                  >
                    <option value="">{loadingPartnerGroups ? 'Загрузка...' : 'Выберите группу'}</option>
                    {partnerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || `Группа #${group.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="create-partner-field">
                  <label>Юридический статус *</label>
                  <select
                    value={addPartnerForm.legal_status || ''}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, legal_status: e.target.value ? parseInt(e.target.value) : null }))}
                    required
                    className="create-partner-select"
                  >
                    <option value="">Выберите статус</option>
                    <option value="1">Юридическое лицо</option>
                    <option value="2">Физическое лицо</option>
                  </select>
                </div>
                <div className="create-partner-field">
                  <label>ИНН (TIN)</label>
                  <input
                    value={addPartnerForm.tin}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, tin: e.target.value }))}
                    placeholder="ИНН"
                  />
                </div>
                <div className="create-partner-field">
                  <label>Адрес</label>
                  <input
                    value={addPartnerForm.address}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Адрес"
                  />
                </div>
                <div className="create-partner-field">
                  <label>Телефон</label>
                  <input
                    value={addPartnerForm.phone}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Телефон"
                  />
                </div>
                <div className="create-partner-field">
                  <label>ПИНФЛ</label>
                  <input
                    value={addPartnerForm.pinfl}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, pinfl: e.target.value }))}
                    placeholder="ПИНФЛ"
                  />
                </div>
                <div className="create-partner-field">
                  <label>Банковские реквизиты</label>
                  <input
                    value={addPartnerForm.bank_details}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, bank_details: e.target.value }))}
                    placeholder="Реквизиты"
                  />
                </div>
                <div className="create-partner-field">
                  <label>Примечание</label>
                  <input
                    value={addPartnerForm.comment}
                    onChange={(e) => setAddPartnerForm(f => ({ ...f, comment: e.target.value }))}
                    placeholder="Примечание"
                  />
                </div>
                {addPartnerError && (
                  <div className="create-partner-error">{addPartnerError}</div>
                )}
                <div className="create-partner-actions">
                  <button
                    type="button"
                    className="create-partner-cancel"
                    onClick={() => { setCreatePartnerFor(null); setAddPartnerError(null); }}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="create-partner-submit" disabled={addPartnerSubmitting}>
                    {addPartnerSubmitting ? 'Создание...' : 'Создать партнера'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="products-section">
          <div className="products-section-header">
            <h3>Товары и услуги</h3>
            <div className="products-actions">
              <ImportSettings
                selectedStockId={selectedStockId}
                selectedCurrencyId={selectedCurrencyId}
                selectedPriceTypeId={selectedPriceTypeId}
                selectedItemGroupId={selectedItemGroupId}
                createIfNotMatched={createIfNotMatched}
                vatCalculationType={vatCalculationType}
                onStockChange={setSelectedStockId}
                onCurrencyChange={setSelectedCurrencyId}
                onPriceTypeChange={setSelectedPriceTypeId}
                onItemGroupChange={setSelectedItemGroupId}
                onCreateIfNotMatchedChange={setCreateIfNotMatched}
                onVatCalculationTypeChange={setVatCalculationType}
              />
              <div className="partner-selector-wrapper" ref={partnerDropdownRef}>
                <button
                  type="button"
                  onClick={() => setPartnerDropdownOpen(!partnerDropdownOpen)}
                  className="partner-selector-btn"
                  disabled={loadingPartners}
                >
                  {loadingPartners ? 'Загрузка...' : 
                   selectedPartnerId ? 
                     partners.find(p => p.id === selectedPartnerId)?.name || partners.find(p => p.id === selectedPartnerId)?.fullname || `Партнер #${selectedPartnerId}` :
                     'Выбрать партнера'}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {partnerDropdownOpen && (
                  <div className="partner-dropdown">
                    <div 
                      className={`partner-dropdown-item ${selectedPartnerId === null ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedPartnerId(null);
                        setPartnerDropdownOpen(false);
                      }}
                    >
                      <span>Не выбрано</span>
                    </div>
                    {partners.length === 0 && !loadingPartners && (
                      <div className="partner-dropdown-item disabled">
                        Нет партнеров
                      </div>
                    )}
                    {partners.map((partner) => (
                      <div
                        key={partner.id}
                        className={`partner-dropdown-item ${selectedPartnerId === partner.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedPartnerId(partner.id || null);
                          setPartnerDropdownOpen(false);
                        }}
                      >
                        <span className="partner-name">{partner.name || partner.fullname || `Партнер #${partner.id}`}</span>
                        {partner.tin && <span className="partner-tin">ИНН: {partner.tin}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={matchAllProducts}
                disabled={matching}
                className="match-all-btn"
              >
                {matching ? 'Сопоставление...' : 'Сопоставить все'}
              </button>
              <button
                onClick={handleAddToRegos}
                disabled={addingToRegos || matching}
                className="add-to-regos-btn"
              >
                {addingToRegos ? 'Добавление...' : 'Добавить в Regos'}
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
