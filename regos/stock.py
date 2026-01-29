"""
REGOS Stock operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def get_stocks(stock_filter_data: dict) -> dict:
    """
    Get stocks (warehouses) from REGOS.

    Args:
        stock_filter_data: Dictionary with filter parameters according to REGOS API:
            - deleted_mark (Boolean, optional): Filter by deletion mark
            See: https://docs.regos.uz/uz/api/references/stock/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив складов
            - next_offset (Int32): Смещение для следующей выборки данных
            - total (Int32): Количество элементов выборки

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="Stock/Get",
        request_data=stock_filter_data,
    )
