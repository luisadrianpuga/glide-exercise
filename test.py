import subprocess
from pathlib import Path


def run_phone_validation_tests() -> subprocess.CompletedProcess:
    project_dir = Path(__file__).parent / "support-engineer-interview-main"
    dist_dir = project_dir / "tests-dist"
    dist_dir.mkdir(exist_ok=True)

    print("[1/3] Bundling TypeScript test via esbuild...")
    bundle_cmd = [
        "npx",
        "esbuild",
        "tests/critical_validation.test.ts",
        "--bundle",
        "--platform=node",
        "--format=cjs",
        "--outfile=tests-dist/critical_validation.test.js",
    ]
    bundle_result = subprocess.run(
        bundle_cmd,
        cwd=project_dir,
        capture_output=True,
        text=True,
    )
    if bundle_result.returncode != 0:
        raise RuntimeError(bundle_result.stderr)
    print("      Bundling completed successfully.")

    print("[2/3] Executing bundled test with Node.js...")
    command = ["node", "tests-dist/critical_validation.test.js"]
    result = subprocess.run(
        command,
        cwd=project_dir,
        capture_output=True,
        text=True,
    )
    print("      Test process finished with exit code", result.returncode)
    return result


if __name__ == "__main__":
    print("[0/3] Starting automated test harness for VAL-204 phone validation...")
    result = run_phone_validation_tests()
    print("[3/3] Capturing test output...")
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        raise SystemExit(result.returncode)
    print("All steps completed. See tests_documentation.md for the recorded outcome.")
