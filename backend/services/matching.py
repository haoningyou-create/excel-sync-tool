from difflib import SequenceMatcher


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.strip().lower(), b.strip().lower()).ratio()


def sanitize_column_mapping(
    column_mapping: dict[str, str],
    key_a: str,
    key_b: str,
) -> dict[str, str]:
    """排除主键列，避免与行匹配逻辑重复导致列名冲突。"""
    return {
        b_col: a_col
        for b_col, a_col in column_mapping.items()
        if b_col != key_b and a_col != key_a
    }


def suggest_column_mapping(
    headers_a: list[str],
    headers_b: list[str],
    threshold: float = 0.6,
    key_a: str | None = None,
    key_b: str | None = None,
) -> dict[str, str | None]:
    """根据列名相似度，为 B 表每列建议 A 表对应列。"""
    mapping: dict[str, str | None] = {}
    used_a: set[str] = set()
    if key_a:
        used_a.add(key_a)

    for b_col in headers_b:
        if b_col == key_b:
            mapping[b_col] = None
            continue

        best_col: str | None = None
        best_score = threshold

        for a_col in headers_a:
            if a_col in used_a:
                continue
            score = similarity(b_col, a_col)
            if score > best_score:
                best_score = score
                best_col = a_col

        mapping[b_col] = best_col
        if best_col:
            used_a.add(best_col)

    return mapping


def suggest_key_pair(
    headers_a: list[str], headers_b: list[str], threshold: float = 0.75
) -> tuple[str | None, str | None]:
    """为主键列建议配对。"""
    best_a: str | None = None
    best_b: str | None = None
    best_score = threshold

    for b_col in headers_b:
        for a_col in headers_a:
            score = similarity(b_col, a_col)
            if score > best_score:
                best_score = score
                best_a = a_col
                best_b = b_col

    return best_a, best_b
