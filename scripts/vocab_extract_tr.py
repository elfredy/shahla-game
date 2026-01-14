#!/usr/bin/env python3
"""
Extract German vocab pairs from .docx files and output a CSV/TSV with
German | source_translation | turkish_like_translation.

Notes:
- The DOCX files in this repo contain German -> Azerbaijani glosses.
- Full, perfect Azerbaijani->Turkish translation needs a real translator.
  This script applies a lightweight "Turkic normalization" + small glossary
  to produce a practical Turkish-like output you can review/adjust.
"""

from __future__ import annotations

import argparse
import csv
import html
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple
from xml.etree import ElementTree as ET


AZ_SPECIFIC_CHARS = set("əğıöüşçƏĞİÖÜŞÇ")
TR_SPECIFIC_CHARS = set("ğıüşçöİıĞÜŞÇÖ")


def extract_docx_paragraphs(path: Path) -> List[str]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8", errors="ignore")

    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root = ET.fromstring(xml)
    paras: List[str] = []
    for p in root.findall(".//w:p", ns):
        texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
        line = html.unescape("".join(texts)).strip()
        if line:
            paras.append(line)
    return paras


def normalize_dashes(s: str) -> str:
    return s.replace("–", "-").replace("—", "-")


def looks_like_translation(s: str) -> bool:
    """
    Heuristic: the right-hand side is a translation/gloss.

    The source docs are mostly Azerbaijani, sometimes without AZ-specific letters
    (e.g. 'qol vurmaq'). So we accept either:
    - AZ-specific letters, OR
    - TR/AZ-specific letters, OR
    - common Turkic infinitive endings (maq/mək), OR
    - clear multi-word gloss (contains space and is not purely numeric)
    """
    s = s.strip()
    if not s:
        return False
    if any(c in AZ_SPECIFIC_CHARS for c in s):
        return True
    if any(c in TR_SPECIFIC_CHARS for c in s):
        return True
    if re.search(r"\b\w+(maq|mək)\b", s, flags=re.IGNORECASE):
        return True
    if " " in s and not re.fullmatch(r"[\d\s\.,/+-]+", s):
        return True
    return False


def split_glued_segments(line: str) -> List[str]:
    """
    Some paragraphs contain multiple Q/A items glued together, e.g.
    'Wie alt sind Sie?- ...?Woher-haradan?'
    Split these so we can parse pairs more reliably.
    """
    line = re.sub(r"\?(?=(Woher|Wohin|Warum|Wie|Wo|Was|Welche|Welcher|Welches))", "?\n", line)
    line = re.sub(r"([\?\!\.])(?=[A-Za-zÄÖÜäöüß])", r"\1\n", line)
    # Also split when two words are glued without whitespace, usually after a translation
    # e.g. 'qol vurmaqMarketingstrategien entwickeln - ...'
    line = re.sub(r"([a-z0-9əğıöüşç])([A-ZÄÖÜ])", r"\1\n\2", line)
    return [seg.strip() for seg in line.split("\n") if seg.strip()]


def extract_pairs(paragraphs: Iterable[str]) -> List[Tuple[str, str]]:
    """
    Return (german, az_translation) pairs.
    Also joins translation continuations that spill into the next paragraph.
    """
    pairs: List[Tuple[str, str]] = []
    carry_idx: int | None = None

    for raw in paragraphs:
        for line in split_glued_segments(normalize_dashes(raw)):
            if "-" in line:
                left, right = line.split("-", 1)
                left, right = left.strip(), right.strip()
                if left and right and looks_like_translation(right):
                    pairs.append((left, right))
                    carry_idx = len(pairs) - 1
                else:
                    carry_idx = None
            elif "," in line:
                # Some docs use comma as delimiter: 'ein Tor schießen,qol vurmaq'
                left, right = line.split(",", 1)
                left, right = left.strip(), right.strip()
                if left and right and looks_like_translation(right):
                    pairs.append((left, right))
                    carry_idx = len(pairs) - 1
                else:
                    carry_idx = None
            else:
                # continuation of previous translation line
                if carry_idx is not None and looks_like_translation(line):
                    g, tr = pairs[carry_idx]
                    pairs[carry_idx] = (g, (tr + " " + line).strip())
                else:
                    carry_idx = None

    return pairs


@dataclass(frozen=True)
class ConvertRule:
    pattern: re.Pattern
    repl: str


def az_to_tr_like(text: str) -> str:
    """
    Best-effort Azerbaycanca -> Türkçe (yakın) dönüşüm.
    Not perfect: intended to be reviewed and manually corrected where needed.
    """
    # First: exact/common phrase normalization to more natural Turkish
    phrase_map = {
        "sabahınız xeyir": "günaydın",
        "axşamınız xeyir": "iyi akşamlar",
        "hər vaxtınız xeyir, günortanız xeyir": "iyi günler",
        "hər vaxtınız xeyir": "iyi günler",
        "günortanız xeyir": "tünaydın",
        "neçə yaşındansınız?": "kaç yaşındasınız?",
        "adınız nədir ?": "adınız nedir?",
        "adınız nədir?": "adınız nedir?",
        "çox yaxşı": "çok iyi",
        "bir az": "biraz",
        "təkrar etmək": "tekrar etmek",
        "cavab vermək": "cevap vermek",
        "soruşmaq": "sormak",
        "yaşamaq": "yaşamak",
        "öyrənmək": "öğrenmek",
        "dinləmək": "dinlemek",
        "oxumaq": "okumak",
        "işləmək": "çalışmak",
    }

    lowered = text.strip().lower()
    if lowered in phrase_map:
        return phrase_map[lowered]

    # Orthography-ish normalization
    s = text
    s = s.replace("Ə", "E").replace("ə", "e")
    s = s.replace("x", "h").replace("X", "H")
    s = s.replace("q", "k").replace("Q", "K")
    # common spaced punctuation
    s = re.sub(r"\s+", " ", s).strip()

    # Small glossary replacements (extend as you wish)
    rules = [
        ConvertRule(re.compile(r"\bvə\b", re.IGNORECASE), "ve"),
        ConvertRule(re.compile(r"\bharadan\b", re.IGNORECASE), "nereden"),
        ConvertRule(re.compile(r"\bharada\b", re.IGNORECASE), "nerede"),
        ConvertRule(re.compile(r"\bnə\b", re.IGNORECASE), "ne"),
        ConvertRule(re.compile(r"\bhansı\b", re.IGNORECASE), "hangi"),
        ConvertRule(re.compile(r"\bşəhər\b", re.IGNORECASE), "şehir"),
        ConvertRule(re.compile(r"\bməmləkət\b", re.IGNORECASE), "memleket"),
        ConvertRule(re.compile(r"\bsubay\b", re.IGNORECASE), "bekar"),
        ConvertRule(re.compile(r"\bevli\b", re.IGNORECASE), "evli"),
        ConvertRule(re.compile(r"\byaşamaq\b", re.IGNORECASE), "yaşamak"),
        ConvertRule(re.compile(r"\böyrənmək\b", re.IGNORECASE), "öğrenmek"),
        ConvertRule(re.compile(r"\bdinləmək\b", re.IGNORECASE), "dinlemek"),
        ConvertRule(re.compile(r"\boxumaq\b", re.IGNORECASE), "okumak"),
        ConvertRule(re.compile(r"\byazılı\b", re.IGNORECASE), "yazılı"),
        ConvertRule(re.compile(r"\bşifahi\b", re.IGNORECASE), "sözlü"),
    ]
    for r in rules:
        s = r.pattern.sub(r.repl, s)

    return s


def write_rows(rows: List[Tuple[str, str, str]], out_path: Path, delimiter: str) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=delimiter)
        w.writerow(["german", "source_translation", "turkish_like"])
        w.writerows(rows)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("docx", nargs="+", type=Path, help="Input .docx file(s)")
    ap.add_argument("--out", type=Path, default=Path("vocab_tr.csv"), help="Output CSV path")
    ap.add_argument("--tsv", action="store_true", help="Write TSV instead of CSV")
    ap.add_argument("--unique", action="store_true", help="Deduplicate by German term (first wins)")
    args = ap.parse_args()

    all_rows: List[Tuple[str, str, str]] = []
    seen: set[str] = set()

    for docx_path in args.docx:
        paras = extract_docx_paragraphs(docx_path)
        pairs = extract_pairs(paras)
        for german, src_tr in pairs:
            german_key = german.strip()
            if args.unique:
                if german_key in seen:
                    continue
                seen.add(german_key)
            tr_like = az_to_tr_like(src_tr)
            all_rows.append((german_key, src_tr, tr_like))

    delim = "\t" if args.tsv else ","
    write_rows(all_rows, args.out, delim)
    print(f"Wrote {len(all_rows)} rows to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

