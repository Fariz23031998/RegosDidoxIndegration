"""
REGOS Currency operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def get_currencies(currency_filter_data: dict = None) -> dict:
    """
    Get currencies from REGOS.

    Args:
        currency_filter_data: Dictionary with filter parameters (optional).
            See: https://docs.regos.uz/uz/api/references/currency/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив валют
            - next_offset (Int32): Смещение для следующей выборки данных
            - total (Int32): Количество элементов выборки

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="Currency/Get",
        request_data=currency_filter_data or {},
    )
