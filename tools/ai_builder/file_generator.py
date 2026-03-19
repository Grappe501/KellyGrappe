from pathlib import Path

class FileGenerator:
    def __init__(self, output_dir="generated_files"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)

    def generate_file(self, file_path, content):
        full_path = self.output_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

        return str(full_path)

    def generate_batch(self, file_map):
        generated = []
        for file_path, content in file_map.items():
            generated.append(self.generate_file(file_path, content))
        return generated