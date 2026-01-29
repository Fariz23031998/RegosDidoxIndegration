import { useRef, useEffect } from 'react';
import './SelectorDropdown.css';

interface SelectorDropdownProps<T> {
  label: string;
  selectedId: number | null;
  items: T[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: number | null) => void;
  getItemId: (item: T) => number | undefined;
  getItemDisplay: (item: T) => string;
  getItemSubtext?: (item: T) => string | null;
  emptyText?: string;
}

export function SelectorDropdown<T>({
  label,
  selectedId,
  items,
  loading,
  isOpen,
  onToggle,
  onSelect,
  getItemId,
  getItemDisplay,
  getItemSubtext,
  emptyText = 'Не выбрано',
}: SelectorDropdownProps<T>) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const selectedItem = selectedId ? items.find(item => getItemId(item) === selectedId) : null;
  const displayText = loading
    ? 'Загрузка...'
    : selectedItem
    ? getItemDisplay(selectedItem)
    : label;

  return (
    <div className="selector-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="selector-dropdown-btn"
        disabled={loading}
      >
        {displayText}
        <span className="dropdown-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="selector-dropdown">
          <div
            className={`selector-dropdown-item ${selectedId === null ? 'selected' : ''}`}
            onClick={() => {
              onSelect(null);
              onToggle();
            }}
          >
            <span>{emptyText}</span>
          </div>
          {items.length === 0 && !loading && (
            <div className="selector-dropdown-item disabled">
              Нет данных
            </div>
          )}
          {items.map((item) => {
            const id = getItemId(item);
            if (!id) return null;
            return (
              <div
                key={id}
                className={`selector-dropdown-item ${selectedId === id ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(id);
                  onToggle();
                }}
              >
                <span className="selector-item-name">{getItemDisplay(item)}</span>
                {getItemSubtext && getItemSubtext(item) && (
                  <span className="selector-item-subtext">{getItemSubtext(item)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
