"""
REGOS Purchase Operation operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def add_purchase_operation(operations_data: list) -> dict:
    """
    Add purchase operations (operations for receipt from counterparty) to REGOS.

    Args:
        operations_data: List of dictionaries with purchase operation fields.
            Each dictionary should have:
            - document_id (Int64, required): ID документа поступления от контрагента
            - item_id (Int64, required): ID номенклатуры
            - quantity (Decimal, required): Количество номенклатуры
            - cost (Decimal, required): Закупочная цена номенклатуры
            - price (Decimal, optional): Стоимость номенклатуры
            - vat_value (Decimal, required): Значение ставки НДС
            - description (String, optional): Примечание
            See: https://docs.regos.uz/uz/api/store/purchaseoperation/add

    Returns:
        dict: API response with "ok" and "result" containing:
            - row_affected (Int64): Количество созданных операций
            - ids (Array of Int64): Массив id созданных операций

    Raises:
        HTTPException: If API request fails or returns error
    """
    return await regos_async_api_request(
        endpoint="PurchaseOperation/Add",
        request_data=operations_data
    )
