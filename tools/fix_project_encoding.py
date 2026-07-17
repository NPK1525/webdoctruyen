from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".codex", "bin", "obj", "node_modules", "packages", "dist", "build"}
TEXT_EXTS = {
    ".cs", ".cshtml", ".js", ".css", ".html", ".json", ".md", ".txt",
    ".config", ".csproj", ".props", ".targets", ".xml"
}
MOJIBAKE_MARKERS = ("Ã", "Â", "Ä", "Æ", "áº", "á»", "â€", "â€”", "â€“", "â€¦", "â„¢", "â€™", "â€œ", "â€", "�")
VIETNAMESE_CHARS = (
    "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝ"
    "àáâãèéêìíòóôõùúý"
    "ĂăĐđĨĩŨũƠơƯư"
    "ẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặ"
    "ẸẹẺẻẼẽẾếỀềỂểỄễỆệ"
    "ỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộ"
    "ỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰự"
    "ỲỳỴỵỶỷỸỹ"
)


def marker_count(text: str) -> int:
    return sum(text.count(marker) for marker in MOJIBAKE_MARKERS)


def try_repair_once(text: str) -> str:
    best = text
    best_score = marker_count(text)
    for encoding in ("latin1", "cp1252"):
        try:
            candidate = text.encode(encoding).decode("utf-8")
        except UnicodeError:
            continue
        score = marker_count(candidate)
        if score < best_score:
            best = candidate
            best_score = score
    return best


def repair_text(text: str) -> str:
    current = text.lstrip("\ufeff")
    for _ in range(3):
        repaired = try_repair_once(current)
        if repaired == current:
            break
        current = repaired
    replacements = {
        "Â©": "©",
        "Â®": "®",
        "Â·": "·",
        "Â": "",
        "â€”": "—",
        "â€“": "–",
        "â€¦": "…",
        "â€˜": "‘",
        "â€™": "’",
        "â€œ": "“",
        "â€": "”",
        "â€": "”",
    }
    for char in VIETNAMESE_CHARS:
        for encoding in ("cp1252", "latin1"):
            try:
                bad = char.encode("utf-8").decode(encoding)
            except UnicodeDecodeError:
                continue
            replacements[bad] = char
    for bad, good in replacements.items():
        current = current.replace(bad, good)
    return current


def is_target(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    return path.suffix.lower() in TEXT_EXTS


def main() -> None:
    changed = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or not is_target(path):
            continue
        try:
            raw = path.read_bytes()
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            continue
        repaired = repair_text(text)
        if repaired != text or raw.startswith(b"\xef\xbb\xbf"):
            path.write_text(repaired, encoding="utf-8", newline="")
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"changed={len(changed)}")
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
