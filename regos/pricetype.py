"""
REGOS PriceType operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def get_price_types(price_type_filter_data: dict = None) -> dict:
    """
    Get price types from REGOS.

    Args:
        price_type_filter_data: Dictionary with filter parameters (optional).
            See: https://docs.regos.uz/uz/api/references/pricetype/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив типов цен
            - next_offset (Int32): Смещение для следующей выборки данных
            - total (Int32): Количество элементов выборки

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="PriceType/Get",
        request_data=price_type_filter_data or {},
    )
