"""Shared input validation helpers."""


def parse_float(value, *, min_value=None, max_value=None, field="value"):
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a number")
    if min_value is not None and v < min_value:
        raise ValueError(f"{field} must be >= {min_value}")
    if max_value is not None and v > max_value:
        raise ValueError(f"{field} must be <= {max_value}")
    return v


def parse_int(value, *, min_value=None, max_value=None, field="value"):
    try:
        v = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an integer")
    if min_value is not None and v < min_value:
        raise ValueError(f"{field} must be >= {min_value}")
    if max_value is not None and v > max_value:
        raise ValueError(f"{field} must be <= {max_value}")
    return v
