import yaml
from pathlib import Path

class PhaseEngine:
    def __init__(self, config_path):
        self.config_path = config_path
        self.config = self.load_config()

    def load_config(self):
        with open(self.config_path, "r") as f:
            return yaml.safe_load(f)

    def get_phase_name(self):
        return self.config.get("phase", {}).get("name")

    def get_targets(self):
        return self.config.get("targets", [])

    def get_constraints(self):
        return self.config.get("constraints", [])

    def summary(self):
        return {
            "phase": self.get_phase_name(),
            "targets": self.get_targets(),
            "constraints": self.get_constraints(),
        }