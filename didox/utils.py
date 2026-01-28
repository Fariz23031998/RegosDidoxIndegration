from typing import Any
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)

def write_json_file(
        data: Any,
        file_path: str = "partner_operations.json",
        indent: int = 4,
        ensure_ascii: bool = False,
        create_dirs: bool = True
) -> bool:
    """
    Write Python object to JSON file with error handling.

    Args:
        data: Python object to write (dict, list, etc.)
        file_path: Path to the output JSON file
        indent: Number of spaces for indentation (None for compact)
        ensure_ascii: If False, non-ASCII characters are preserved
        create_dirs: If True, create parent directories if they don't exist

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Convert to Path object for easier manipulation
        path = Path(file_path)

        # Create parent directories if needed
        if create_dirs and path.parent != Path('.'):
            path.parent.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {path.parent}")

        # Write to file with atomic operation (write to temp, then rename)
        temp_path = path.with_suffix('.tmp')

        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=ensure_ascii)

        # Atomic rename (replaces existing file)
        temp_path.replace(path)

        logger.info(f"Successfully wrote JSON to: {file_path}")
        return True

    except TypeError as e:
        logger.error(f"Data is not JSON serializable: {e}")
        return False

    except PermissionError as e:
        logger.error(f"Permission denied writing to {file_path}: {e}")
        return False

    except OSError as e:
        logger.error(f"OS error writing to {file_path}: {e}")
        return False

    except Exception as e:
        logger.error(f"Unexpected error writing JSON to {file_path}: {e}")
        return False