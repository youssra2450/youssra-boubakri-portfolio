"""Text sanitisation for untrusted visitor input (contact form)."""

import re
import unicodedata

_SCRIPT_STYLE_BLOCK = re.compile(r"<(script|style)\b[^>]*>.*?</\1\s*>", re.IGNORECASE | re.DOTALL)
_HTML_COMMENT = re.compile(r"<!--.*?(?:-->|$)", re.DOTALL)
#: Only things that look like real tags (``<b>``, ``</p>``, ``<!DOCTYPE …>``) — "a < b > c" is kept.
_HTML_TAG = re.compile(r"</?[A-Za-z][^<>]*>|<![A-Za-z][^<>]*>")
_BIDI_CONTROLS = re.compile("[\u202a-\u202e\u2066-\u2069]")
_TRAILING_SPACES = re.compile(r"[ \t]+\n")
_EXCESS_BLANK_LINES = re.compile(r"\n{4,}")  # more than two blank lines in a row
_WHITESPACE_RUN = re.compile(r"\s+")
_URL = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)


def strip_html(text: str) -> str:
    """Remove HTML tags and comments; the content of ``<script>``/``<style>`` blocks is dropped too."""
    text = _SCRIPT_STYLE_BLOCK.sub("", text)
    text = _HTML_COMMENT.sub("", text)
    return _HTML_TAG.sub("", text)


def remove_control_characters(text: str, *, keep_newlines: bool = True) -> str:
    """Drop C0/C1 control characters and bidi overrides; tabs become spaces."""
    text = text.replace("\t", " ")
    text = _BIDI_CONTROLS.sub("", text)
    return "".join(
        char for char in text if (keep_newlines and char == "\n") or unicodedata.category(char) != "Cc"
    )


def sanitize_multiline(text: str) -> str:
    """Sanitise a free-text message: strip tags and control characters, keep line breaks,
    collapse more than two consecutive blank lines, trim."""
    text = unicodedata.normalize("NFC", text).replace("\r\n", "\n").replace("\r", "\n")
    text = remove_control_characters(strip_html(text), keep_newlines=True)
    text = _TRAILING_SPACES.sub("\n", text)
    text = _EXCESS_BLANK_LINES.sub("\n\n\n", text)
    return text.strip()


def sanitize_single_line(text: str) -> str:
    """Sanitise a short single-line value (name, subject): no tags, no control characters,
    whitespace runs collapsed to one space."""
    text = unicodedata.normalize("NFC", text)
    text = remove_control_characters(strip_html(text), keep_newlines=True)
    return _WHITESPACE_RUN.sub(" ", text).strip()


def count_urls(text: str) -> int:
    return len(_URL.findall(text))


def letter_ratio(text: str) -> float:
    """Share of letters among non-whitespace characters (1.0 for empty text)."""
    visible = [char for char in text if not char.isspace()]
    if not visible:
        return 1.0
    return sum(char.isalpha() for char in visible) / len(visible)
