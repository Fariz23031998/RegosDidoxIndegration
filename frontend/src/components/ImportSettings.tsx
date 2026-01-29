import { useState, useEffect, useCallback } from 'react';
import { SelectorDropdown } from './SelectorDropdown';
import { regosApi } from '../api/documents';
import { Stock, Currency, PriceType, ItemGroup } from '../types';
import './ImportSettings.css';

/** VAT calculation type: 1 = No (Не начислять), 2 = Exclude (В сумме), 3 = Include (Сверху) */
export type VatCalculationType = 1 | 2 | 3 | null;

interface ImportSettingsProps {
  selectedStockId: number | null;
  selectedCurrencyId: number | null;
  selectedPriceTypeId: number | null;
  selectedItemGroupId: number | null;
  createIfNotMatched: boolean;
  vatCalculationType: VatCalculationType;
  onStockChange: (id: number | null) => void;
  onCurrencyChange: (id: number | null) => void;
  onPriceTypeChange: (id: number | null) => void;
  onItemGroupChange: (id: number | null) => void;
  onCreateIfNotMatchedChange: (value: boolean) => void;
  onVatCalculationTypeChange: (value: VatCalculationType) => void;
}

export function ImportSettings({
  selectedStockId,
  selectedCurrencyId,
  selectedPriceTypeId,
  selectedItemGroupId,
  createIfNotMatched,
  vatCalculationType,
  onStockChange,
  onCurrencyChange,
  onPriceTypeChange,
  onItemGroupChange,
  onCreateIfNotMatchedChange,
  onVatCalculationTypeChange,
}: ImportSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingPriceTypes, setLoadingPriceTypes] = useState(false);
  const [loadingItemGroups, setLoadingItemGroups] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [priceTypeDropdownOpen, setPriceTypeDropdownOpen] = useState(false);
  const [itemGroupDropdownOpen, setItemGroupDropdownOpen] = useState(false);

  const loadStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const response = await regosApi.getStocks({ deleted_mark: false });
      if (response.ok) {
        if (Array.isArray(response.result)) {
          setStocks(response.result);
        } else if (response.result && typeof response.result === 'object' && 'result' in response.result) {
          setStocks((response.result as { result: Stock[] }).result);
        }
      }
    } catch (err: any) {
      console.error('Failed to load stocks:', err);
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  const loadCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    try {
      const response = await regosApi.getCurrencies();
      if (response.ok) {
        if (Array.isArray(response.result)) {
          setCurrencies(response.result);
        } else if (response.result && typeof response.result === 'object' && 'result' in response.result) {
          setCurrencies((response.result as { result: Currency[] }).result);
        }
      }
    } catch (err: any) {
      console.error('Failed to load currencies:', err);
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  const loadPriceTypes = useCallback(async () => {
    setLoadingPriceTypes(true);
    try {
      const response = await regosApi.getPriceTypes();
      if (response.ok) {
        if (Array.isArray(response.result)) {
          setPriceTypes(response.result);
        } else if (response.result && typeof response.result === 'object' && 'result' in response.result) {
          setPriceTypes((response.result as { result: PriceType[] }).result);
        }
      }
    } catch (err: any) {
      console.error('Failed to load price types:', err);
    } finally {
      setLoadingPriceTypes(false);
    }
  }, []);

  const loadItemGroups = useCallback(async () => {
    setLoadingItemGroups(true);
    try {
      const response = await regosApi.getItemGroups();
      if (response.ok) {
        if (Array.isArray(response.result)) {
          setItemGroups(response.result);
        } else if (response.result && typeof response.result === 'object' && 'result' in response.result) {
          setItemGroups((response.result as { result: ItemGroup[] }).result);
        }
      }
    } catch (err: any) {
      console.error('Failed to load item groups:', err);
    } finally {
      setLoadingItemGroups(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStocks();
      loadCurrencies();
      loadPriceTypes();
      loadItemGroups();
    }
  }, [isOpen, loadStocks, loadCurrencies, loadPriceTypes, loadItemGroups]);

  return (
    <div className="import-settings">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="import-settings-toggle"
      >
        Настройки импорта
        <span className="dropdown-arrow">▼</span>
      </button>
      {isOpen && (
        <div
          className="import-settings-popup-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="import-settings-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="import-settings-header">
              <h4>Настройки импорта</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="import-settings-close"
              >
                ×
              </button>
            </div>
            <div className="import-settings-content">
            <div className="import-settings-field">
              <label>Склад</label>
              <SelectorDropdown<Stock>
                label="Выбрать склад"
                selectedId={selectedStockId}
                items={stocks}
                loading={loadingStocks}
                isOpen={stockDropdownOpen}
                onToggle={() => setStockDropdownOpen(!stockDropdownOpen)}
                onSelect={onStockChange}
                getItemId={(item) => item.id}
                getItemDisplay={(item) => item.name || `Склад #${item.id}`}
                getItemSubtext={(item) => item.address || null}
                emptyText="Не выбран"
              />
            </div>
            <div className="import-settings-field">
              <label>Валюта</label>
              <SelectorDropdown<Currency>
                label="Выбрать валюту"
                selectedId={selectedCurrencyId}
                items={currencies}
                loading={loadingCurrencies}
                isOpen={currencyDropdownOpen}
                onToggle={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                onSelect={onCurrencyChange}
                getItemId={(item) => item.id}
                getItemDisplay={(item) => item.name || `${item.code_chr || ''} #${item.id}`}
                getItemSubtext={(item) => item.code_chr ? `Код: ${item.code_chr}` : null}
                emptyText="Не выбрана"
              />
            </div>
            <div className="import-settings-field">
              <label>Тип цены</label>
              <SelectorDropdown<PriceType>
                label="Выбрать тип цены"
                selectedId={selectedPriceTypeId}
                items={priceTypes}
                loading={loadingPriceTypes}
                isOpen={priceTypeDropdownOpen}
                onToggle={() => setPriceTypeDropdownOpen(!priceTypeDropdownOpen)}
                onSelect={onPriceTypeChange}
                getItemId={(item) => item.id}
                getItemDisplay={(item) => item.name || `Тип цены #${item.id}`}
                getItemSubtext={(item) => item.currency?.code_chr ? `Валюта: ${item.currency.code_chr}` : null}
                emptyText="Не выбран"
              />
            </div>
            <div className="import-settings-field">
              <label>Группа номенклатуры</label>
              <SelectorDropdown<ItemGroup>
                label="Выбрать группу номенклатуры"
                selectedId={selectedItemGroupId}
                items={itemGroups}
                loading={loadingItemGroups}
                isOpen={itemGroupDropdownOpen}
                onToggle={() => setItemGroupDropdownOpen(!itemGroupDropdownOpen)}
                onSelect={onItemGroupChange}
                getItemId={(item) => item.id}
                getItemDisplay={(item) => item.name || `Группа #${item.id}`}
                getItemSubtext={(item) => item.path || null}
                emptyText="Не выбрана"
              />
            </div>
            <div className="import-settings-field import-settings-toggle-field">
              <label className="import-settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={createIfNotMatched}
                  onChange={(e) => onCreateIfNotMatchedChange(e.target.checked)}
                />
                <span>Создать если не найдено</span>
              </label>
            </div>
            <div className="import-settings-field">
              <label>Тип расчёта НДС</label>
              <select
                value={vatCalculationType ?? ''}
                onChange={(e) => onVatCalculationTypeChange(e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : null)}
                className="import-settings-select"
              >
                <option value="">Не выбрано</option>
                <option value="1">Не начислять</option>
                <option value="2">В сумме</option>
                <option value="3">Сверху</option>
              </select>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
