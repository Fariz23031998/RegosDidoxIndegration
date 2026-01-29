"""
REGOS Document Purchase operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def add_doc_purchase(doc_purchase_data: dict) -> dict:
    """
    Add a new purchase document (DocPurchase) to REGOS.

    Args:
        doc_purchase_data: Dictionary with purchase document fields according to REGOS API:
            - date (Int64, required): Дата документа в формате unix time в секундах
            - partner_id (Int64, required): ID контрагента
            - stock_id (Int64, required): ID склада
            - currency_id (Int64, required): ID валюты
            - attached_user_id (Int64, required): ID ответственного пользователя
            - contract_id (Int64, optional): ID договора
            - exchange_rate (Decimal, optional): Курс валюты
            - description (String, optional): Дополнительное описание
            - vat_calculation_type (Enum, optional): Расчет НДС: "No" (Не начислять), "Exclude" (В сумме), "Include" (Сверху)
            - price_type_id (Int64, optional): ID типа цены
            - fields (Array, optional): Массив значений дополнительных полей
            See: https://docs.regos.uz/uz/api/store/docpurchase/add

    Returns:
        dict: API response with "ok" and "result" containing "new_id" (ID созданного документа)

    Raises:
        HTTPException: If API request fails or returns error
    """
    return await regos_async_api_request(
        endpoint="DocPurchase/Add",
        request_data=doc_purchase_data
    )
