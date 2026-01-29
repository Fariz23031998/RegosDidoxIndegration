"""
REGOS API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal, Optional, List, Dict, Any
from decimal import Decimal
import logging

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.auth import get_current_active_user
from backend.database import User
from regos.match import match_products
from regos.item import add_item
from regos.partner import add_partner, get_partners, get_partner_groups
from regos.docpurchase import add_doc_purchase
from regos.purchaseoperation import add_purchase_operation
from regos.stock import get_stocks
from regos.currency import get_currencies
from regos.pricetype import get_price_types
from regos.itemgroup import get_item_groups

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/regos", tags=["REGOS"])


class ProductMatchingData(BaseModel):
    index: str
    value: str


class MatchProductsRequest(BaseModel):
    type: Literal["Code", "Name", "Articul", "Barcode"]
    data: list[ProductMatchingData]


class AddItemRequest(BaseModel):
    group_id: int
    vat_id: int
    unit_id: int
    department_id: Optional[int] = None
    unit2_id: Optional[int] = None
    color_id: Optional[int] = None
    size_id: Optional[int] = None
    brand_id: Optional[int] = None
    producer_id: Optional[int] = None
    country_id: Optional[int] = None
    compound: Optional[bool] = None
    parent_id: Optional[int] = None
    type: Optional[Literal["Товар", "Услуга"]] = None
    code: Optional[int] = None
    name: Optional[str] = None
    fullname: Optional[str] = None
    description: Optional[str] = None
    articul: Optional[str] = None
    kdt: Optional[int] = None
    min_quantity: Optional[int] = None
    icps: Optional[str] = None
    assemblable: Optional[bool] = None
    disassemblable: Optional[bool] = None
    is_labeled: Optional[bool] = None
    comission_tin: Optional[str] = None
    package_code: Optional[str] = None
    origin: Optional[Literal["Не задано", "Купля продажа", "Производство", "Услуги"]] = None
    partner_id: Optional[int] = None


class AddPartnerRequest(BaseModel):
    """Request body for Partner/Add. See https://docs.regos.uz/uz/api/references/partner/add"""
    name: Optional[str] = None
    fullname: Optional[str] = None
    tin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    pinfl: Optional[str] = None
    bank_details: Optional[str] = None
    code: Optional[int] = None
    comment: Optional[str] = None
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


class GetPartnersRequest(BaseModel):
    """Request body for Partner/Get. See https://docs.regos.uz/uz/api/references/partner/get"""
    ids: Optional[List[int]] = None  # Optional: Массив id контрагентов
    group_ids: Optional[List[int]] = None  # Optional: Массив id групп контрагентов
    legal_status: Optional[Literal["юр. лицо", "физ. лицо"]] = None  # Optional: Юридический статус
    sort_orders: Optional[List[Dict[str, Any]]] = None  # Optional: Сортировка выходных параметров
    filters: Optional[List[Dict[str, Any]]] = None  # Optional: Фильтры по основным и дополнительным полям
    search: Optional[str] = None  # Optional: Строка поиска по полям: name, fullname, address, inn, rs
    deleted_mark: Optional[bool] = None  # Optional: Пометка на удаление
    limit: Optional[int] = None  # Optional: Лимит возвращаемых данных
    offset: Optional[int] = None  # Optional: Смещение от начала выборки
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


class GetPartnerGroupsRequest(BaseModel):
    """Request body for PartnerGroup/Get. See https://docs.regos.uz/uz/api/references/partnergroup/get"""
    ids: Optional[List[int]] = None  # Optional: Массив id групп
    parent_ids: Optional[List[int]] = None  # Optional: Массив id родительских групп
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


class AddDocPurchaseRequest(BaseModel):
    """Request body for DocPurchase/Add. See https://docs.regos.uz/uz/api/store/docpurchase/add"""
    date: int  # Required: Unix timestamp in seconds
    partner_id: int  # Required: ID контрагента
    stock_id: int  # Required: ID склада
    currency_id: int  # Required: ID валюты
    attached_user_id: int  # Required: ID ответственного пользователя
    contract_id: Optional[int] = None  # Optional: ID договора
    exchange_rate: Optional[Decimal] = None  # Optional: Курс валюты
    description: Optional[str] = None  # Optional: Дополнительное описание
    vat_calculation_type: Optional[Literal["Не начислять", "В сумме", "Сверху"]] = None  # Optional: Расчет НДС (API accepts Russian; we send English to REGOS)
    price_type_id: Optional[int] = None  # Optional: ID типа цены
    fields: Optional[List[Dict[str, Any]]] = None  # Optional: Массив значений дополнительных полей
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


class PurchaseOperationItem(BaseModel):
    """Single purchase operation item"""
    document_id: int  # Required: ID документа поступления от контрагента
    item_id: int  # Required: ID номенклатуры
    quantity: Decimal  # Required: Количество номенклатуры
    cost: Decimal  # Required: Закупочная цена номенклатуры
    price: Optional[Decimal] = None  # Optional: Стоимость номенклатуры
    vat_value: Decimal  # Required: Значение ставки НДС
    description: Optional[str] = None  # Optional: Примечание
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


class AddPurchaseOperationRequest(BaseModel):
    """Request body for PurchaseOperation/Add. See https://docs.regos.uz/uz/api/store/purchaseoperation/add"""
    operations: List[PurchaseOperationItem]  # Array of purchase operations


@router.post("/match-products")
async def match_products_endpoint(
    request: MatchProductsRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Match products with REGOS API (requires authentication).
    
    Matches products by Code, Name, Articul, or Barcode.
    Maximum 250 products per request.
    """
    try:
        # Validate data length
        if len(request.data) > 250:
            raise HTTPException(
                status_code=400,
                detail="Maximum 250 products allowed per request"
            )
        
        # Convert Pydantic models to dicts for API call
        products_data = [
            {"index": item.index, "value": item.value}
            for item in request.data
        ]
        
        # Call REGOS API
        result = await match_products(request.type, products_data)
        
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error matching products: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-item")
async def add_item_endpoint(
    request: AddItemRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a new item to REGOS (requires authentication).
    
    Creates a new item in REGOS using the Item/Add endpoint.
    Required fields: group_id, vat_id, unit_id
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        item_data = request.model_dump(exclude_none=True)
        
        # Call REGOS API
        result = await add_item(item_data)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding item to REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-partner")
async def add_partner_endpoint(
    request: AddPartnerRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Add a new partner (counterparty) in REGOS (requires authentication).

    Uses REGOS Partner/Add endpoint.
    Documentation: https://docs.regos.uz/uz/api/references/partner/add
    """
    try:
        partner_data = request.model_dump(exclude_none=True)
        result = await add_partner(partner_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding partner to REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-partners")
async def get_partners_endpoint(
    request: GetPartnersRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get partners (counterparties) from REGOS (requires authentication).

    Fetches partners based on filters, search, pagination, etc.
    Uses REGOS Partner/Get endpoint.
    Documentation: https://docs.regos.uz/uz/api/references/partner/get

    All parameters are optional. You can filter by:
    - ids: Array of partner IDs
    - group_ids: Array of partner group IDs
    - legal_status: "юр. лицо" or "физ. лицо"
    - search: Search string for name, fullname, address, inn, rs
    - deleted_mark: Filter by deletion mark
    - limit/offset: Pagination support

    Returns:
    - result: Array of partners
    - next_offset: Offset for next page
    - total: Total count of matching partners
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        filter_data = request.model_dump(exclude_none=True)
        result = await get_partners(filter_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching partners from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-partner-groups")
async def get_partner_groups_endpoint(
    request: GetPartnerGroupsRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get partner groups from REGOS (requires authentication).

    Fetches partner groups based on filters.
    Uses REGOS PartnerGroup/Get endpoint.
    Documentation: https://docs.regos.uz/uz/api/references/partnergroup/get

    All parameters are optional. You can filter by:
    - ids: Array of group IDs
    - parent_ids: Array of parent group IDs

    Returns:
    - result: Array of partner groups
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        filter_data = request.model_dump(exclude_none=True)
        result = await get_partner_groups(filter_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching partner groups from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class GetStocksRequest(BaseModel):
    """Request body for Stock/Get"""
    deleted_mark: Optional[bool] = None
    # Allow extra fields from REGOS API
    model_config = {"extra": "allow"}


@router.post("/get-stocks")
async def get_stocks_endpoint(
    request: GetStocksRequest = GetStocksRequest(deleted_mark=False),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get stocks (warehouses) from REGOS (requires authentication).

    Uses REGOS Stock/Get endpoint.
    Returns list of stocks/warehouses.

    Returns:
    - result: Array of stocks
    - next_offset: Offset for next page
    - total: Total count
    """
    try:
        filter_data = request.model_dump(exclude_none=True)
        result = await get_stocks(filter_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching stocks from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-currencies")
async def get_currencies_endpoint(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get currencies from REGOS (requires authentication).

    Uses REGOS Currency/Get endpoint.
    Returns list of currencies.

    Returns:
    - result: Array of currencies
    - next_offset: Offset for next page
    - total: Total count
    """
    try:
        result = await get_currencies({})
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching currencies from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-price-types")
async def get_price_types_endpoint(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get price types from REGOS (requires authentication).

    Uses REGOS PriceType/Get endpoint.
    Returns list of price types.

    Returns:
    - result: Array of price types
    - next_offset: Offset for next page
    - total: Total count
    """
    try:
        result = await get_price_types({})
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching price types from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get-item-groups")
async def get_item_groups_endpoint(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get item groups from REGOS (requires authentication).

    Uses REGOS ItemGroup/Get endpoint.
    Returns list of item groups.

    Returns:
    - result: Array of item groups
    """
    try:
        result = await get_item_groups({})
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching item groups from REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-doc-purchase")
async def add_doc_purchase_endpoint(
    request: AddDocPurchaseRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new purchase document (DocPurchase) in REGOS (requires authentication).

    Creates a document for receipt from a counterparty (partner).
    Uses REGOS DocPurchase/Add endpoint.
    Documentation: https://docs.regos.uz/uz/api/store/docpurchase/add

    Required fields:
    - date: Unix timestamp in seconds
    - partner_id: Partner ID
    - stock_id: Stock/Warehouse ID
    - currency_id: Currency ID
    - attached_user_id: Responsible user ID
    """
    try:
        # Use mode='json' to ensure Decimal and other types are JSON-serializable
        doc_purchase_data = request.model_dump(mode='json', exclude_none=True)
        # REGOS API expects vat_calculation_type in English: "No", "Exclude", "Include"
        vat_ru_to_en = {"Не начислять": "No", "В сумме": "Exclude", "Сверху": "Include"}
        if "vat_calculation_type" in doc_purchase_data and doc_purchase_data["vat_calculation_type"] in vat_ru_to_en:
            doc_purchase_data["vat_calculation_type"] = vat_ru_to_en[doc_purchase_data["vat_calculation_type"]]
        logger.info(f"Creating purchase document with data: {doc_purchase_data}")
        result = await add_doc_purchase(doc_purchase_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating purchase document in REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-purchase-operation")
async def add_purchase_operation_endpoint(
    request: AddPurchaseOperationRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Add purchase operations (operations for receipt from counterparty) in REGOS (requires authentication).

    Creates operations for a purchase document. The method accepts an array of operations.
    Uses REGOS PurchaseOperation/Add endpoint.
    Documentation: https://docs.regos.uz/uz/api/store/purchaseoperation/add

    Required fields for each operation:
    - document_id: Purchase document ID
    - item_id: Item/product ID
    - quantity: Quantity of the item
    - cost: Purchase cost of the item
    - vat_value: VAT rate value

    Note: After calling this method, you may need to call the corresponding document method.
    """
    try:
        # Convert list of Pydantic models to list of dicts with JSON-serializable types
        operations_data = [
            item.model_dump(mode='json', exclude_none=True)
            for item in request.operations
        ]
        result = await add_purchase_operation(operations_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding purchase operations to REGOS: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
