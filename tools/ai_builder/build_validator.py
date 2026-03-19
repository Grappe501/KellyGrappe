import subprocess

class BuildValidator:
    def __init__(self, project_root="."):
        self.project_root = project_root

    def run_build(self):
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }