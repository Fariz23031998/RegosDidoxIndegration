"""
REGOS Item operations
"""
from typing import Optional

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from regos.api import regos_async_api_request

async def add_item(item_data: dict) -> dict:
    """
    Add a new item to REGOS.
    
    Args:
        item_data: Dictionary with item fields according to REGOS API:
            - group_id (Int64, required): id группы номенклатуры
            - vat_id (Int64, required): Id ставки НДС
            - unit_id (Int64, required): id единицы измерения
            - name (String, optional): Наименование номенклатуры
            - code (Int64, optional): Код номенклатуры
            - articul (String, optional): Артикул номенклатуры
            - package_code (String, optional): Код упаковки
            - And other optional fields...
    
    Returns:
        dict: API response with "ok" and "new_id" (ID созданной номенклатуры)
    
    Raises:
        HTTPException: If API request fails or returns error
    """
    return await regos_async_api_request(
        endpoint="Item/Add",
        request_data=item_data
    )
