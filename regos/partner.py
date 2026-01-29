"""
REGOS Partner operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def add_partner(partner_data: dict) -> dict:
    """
    Add a new partner (counterparty) to REGOS.

    Args:
        partner_data: Dictionary with partner fields according to REGOS API
            (Partner/Add). Typical fields may include name, tin, address,
            phone, pinfl, etc. See: https://docs.regos.uz/uz/api/references/partner/add

    Returns:
        dict: API response with "ok" and "result" (e.g. new partner id).

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="Partner/Add",
        request_data=partner_data,
    )


async def get_partners(partner_filter_data: dict) -> dict:
    """
    Get partners (counterparties) from REGOS.

    Args:
        partner_filter_data: Dictionary with filter parameters according to REGOS API:
            - ids (Array of int64, optional): Массив id контрагентов
            - group_ids (Array of int64, optional): Массив id групп контрагентов
            - legal_status (Enum, optional): "юр. лицо" or "физ. лицо"
            - sort_orders (Array, optional): Сортировка выходных параметров
            - filters (Array, optional): Фильтры по основным и дополнительным полям
            - search (String, optional): Строка поиска по полям: name, fullname, address, inn, rs
            - deleted_mark (Boolean, optional): Пометка на удаление
            - limit (Int32, optional): Лимит возвращаемых данных
            - offset (Int32, optional): Смещение от начала выборки
            See: https://docs.regos.uz/uz/api/references/partner/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив контрагентов
            - next_offset (Int32): Смещение для следующей выборки данных
            - total (Int32): Количество элементов выборки

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="Partner/Get",
        request_data=partner_filter_data,
    )


async def get_partner_groups(group_filter_data: dict) -> dict:
    """
    Get partner groups from REGOS.

    Args:
        group_filter_data: Dictionary with filter parameters according to REGOS API:
            - ids (Array of int64, optional): Массив id групп
            - parent_ids (Array of int64, optional): Массив id родительских групп
            See: https://docs.regos.uz/uz/api/references/partnergroup/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив групп контрагентов

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="PartnerGroup/Get",
        request_data=group_filter_data,
    )
