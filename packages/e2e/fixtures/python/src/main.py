from pathlib import Path

print(Path("src/message.txt").read_text().strip())
