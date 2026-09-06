from pathlib import Path

print(Path("created-by-lifecycle.txt").read_text().strip())
