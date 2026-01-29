"""
REGOS ItemGroup operations
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request


async def get_item_groups(item_group_filter_data: dict = None) -> dict:
    """
    Get item groups from REGOS.

    Args:
        item_group_filter_data: Dictionary with filter parameters (optional).
            Empty request body by default.
            See: https://docs.regos.uz/uz/api/references/itemgroup/get

    Returns:
        dict: API response with "ok" and "result" containing:
            - result (Array): Массив групп номенклатуры

    Raises:
        HTTPException: If API request fails or returns error.
    """
    return await regos_async_api_request(
        endpoint="ItemGroup/Get",
        request_data=item_group_filter_data or {},
    )
