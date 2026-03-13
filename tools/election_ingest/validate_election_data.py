import json
from pathlib import Path

DATA_DIR = Path("data/elections/raw")

report = {
    "files_checked": 0,
    "errors": [],
    "warnings": []
}

def error(file, msg):
    report["errors"].append({
        "file": file,
        "message": msg
    })

def warning(file, msg):
    report["warnings"].append({
        "file": file,
        "message": msg
    })


def validate_contest(file, contest):

    if "contest_name" not in contest:
        error(file, "Contest missing contest_name")

    if "candidates" not in contest:
        error(file, f"{contest.get('contest_name','unknown')} missing candidates")
        return

    candidate_votes = 0

    for candidate in contest["candidates"]:

        if "candidate_name" not in candidate:
            error(file, f"{contest['contest_name']} candidate missing name")

        if "votes" not in candidate:
            error(file, f"{contest['contest_name']} candidate missing votes")
            continue

        if not isinstance(candidate["votes"], int):
            error(file, f"{contest['contest_name']} candidate votes not integer")

        candidate_votes += candidate["votes"]

    if "total_votes" in contest:

        if contest["total_votes"] != candidate_votes:
            warning(
                file,
                f"{contest['contest_name']} total_votes mismatch "
                f"(expected {contest['total_votes']} got {candidate_votes})"
            )

    if "precincts" in contest:

        precinct_votes = sum(p.get("votes",0) for p in contest["precincts"])

        if precinct_votes != candidate_votes:
            warning(
                file,
                f"{contest['contest_name']} precinct totals mismatch "
                f"(precinct {precinct_votes} vs candidate {candidate_votes})"
            )


def validate_file(file_path):

    with open(file_path,"r",encoding="utf-8") as f:
        data = json.load(f)

    file = file_path.name

    report["files_checked"] += 1

    if "election" not in data:
        error(file,"Missing election metadata")

    if "county_turnout" not in data:
        warning(file,"Missing county_turnout")

    if "contests" not in data:
        error(file,"Missing contests")
        return

    for contest in data["contests"]:
        validate_contest(file,contest)


def run_validation():

    files = list(DATA_DIR.glob("*.json"))

    print(f"\nScanning {len(files)} election files\n")

    for file in files:
        print(f"Checking {file.name}")
        validate_file(file)

    with open("validation_report.json","w") as f:
        json.dump(report,f,indent=2)

    with open("validation_report.txt","w") as f:
        f.write(f"Files checked: {report['files_checked']}\n\n")

        f.write("ERRORS\n")
        f.write("------\n")

        for e in report["errors"]:
            f.write(f"{e['file']} : {e['message']}\n")

        f.write("\nWARNINGS\n")
        f.write("--------\n")

        for w in report["warnings"]:
            f.write(f"{w['file']} : {w['message']}\n")

    print("\nValidation complete")
    print(f"Errors: {len(report['errors'])}")
    print(f"Warnings: {len(report['warnings'])}")
    print("\nReports written:")
    print("validation_report.json")
    print("validation_report.txt")


if __name__ == "__main__":
    run_validation()