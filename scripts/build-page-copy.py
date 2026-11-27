"""Index the static visitor copy that is not rendered from structured content."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "site/data/public/page-copy.json"
CONTAINERS = set("article blockquote dd div dt figcaption h1 h2 h3 h4 h5 h6 header li p section small span strong em b i td th time summary a".split())
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
SKIP = set("script style svg template form select button nav".split())
PAIR = re.compile(r'data-albury-copy="(copy-\d+)"')


class PageCopy(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.offsets = [0]
        for match in re.finditer("\n", self.source):
            self.offsets.append(match.end())
        self.stack = []
        self.entries = []
        self.feed(self.source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line, col = self.getpos()
        location = self.offsets[line - 1] + col
        hidden = (self.stack and self.stack[-1]["hidden"]) or tag in SKIP or "staff-directory" in attrs.get("class", "").split()
        in_main = tag == "main" or bool(self.stack and self.stack[-1]["main"])
        entry = {"tag": tag, "offset": location, "main": in_main, "hidden": hidden, "text": []}
        if attrs.get("data-albury-copy"):
            entry["id"] = attrs["data-albury-copy"]
        if in_main and not hidden and tag == "img" and attrs.get("src"):
            entry["image"] = attrs["src"]
            entry["alt"] = attrs.get("alt", "")
            self.entries.append(entry)
        if tag not in VOID:
            self.stack.append(entry)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        match = next((i for i in range(len(self.stack) - 1, -1, -1) if self.stack[i]["tag"] == tag), None)
        if match is None:
            return
        for entry in self.stack[match:]:
            if entry["tag"] in CONTAINERS and entry["text"] and entry["main"] and not entry["hidden"]:
                self.entries.append(entry)
        del self.stack[match:]

    def handle_data(self, data):
        if self.stack and data.strip():
            self.stack[-1]["text"].append(data)

    def index(self):
        inserts = []
        records = []
        next_id = max((int(match.split("-")[1]) for match in PAIR.findall(self.source)), default=0) + 1
        for entry in sorted(self.entries, key=lambda item: item["offset"]):
            identifier = entry.get("id")
            if not identifier:
                identifier = "copy-" + str(next_id)
                next_id += 1
                position = entry["offset"] + 1 + len(entry["tag"])
                inserts.append((position, ' data-albury-copy="' + identifier + '"'))
            fields = {key: entry[key] for key in ("image", "alt") if key in entry}
            if entry["text"]:
                fields["text"] = entry["text"]
            records.append({"id": identifier, **fields})
        source = self.source
        for position, insertion in reversed(inserts):
            source = source[:position] + insertion + source[position:]
        return source, records


def main():
    pages = {}
    for path in sorted(ROOT.glob("ALBURY_*.html")):
        if path.name in {"ALBURY_ROOM_EDITOR.html", "ALBURY_PANTRY_ITEMS.html"}:
            continue
        original = path.read_text(encoding="utf-8")
        source, copies = PageCopy(original).index()
        if not copies:
            continue
        path.write_text(source, encoding="utf-8")
        pages[path.name] = copies
    TARGET.write_text(json.dumps(pages, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
