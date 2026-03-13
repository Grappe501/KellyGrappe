import json
from pathlib import Path
import re

DATA_DIR = Path("data/elections/raw")


def extract_year(filename):
    m = re.search(r"\d{4}", filename)
    return int(m.group()) if m else None


def build_election_metadata(file, data):

    name = data.get("ElectionName") or data.get("name") or file.stem.replace("_", " ")
    date = data.get("ElectionDate") or data.get("date")

    return {
        "name": name,
        "year": extract_year(file.name),
        "election_date": date
    }


def normalize_candidate(c):

    name = (
        c.get("candidate_name")
        or c.get("CandidateName")
        or c.get("name")
    )

    votes = (
        c.get("votes")
        or c.get("Votes")
        or 0
    )

    return {
        "candidate_name": name,
        "votes": int(votes)
    }


def normalize_contest(contest):

    name = (
        contest.get("contest_name")
        or contest.get("ContestName")
        or contest.get("office")
        or contest.get("Race")
    )

    candidates = (
        contest.get("candidates")
        or contest.get("Candidates")
        or contest.get("results")
        or []
    )

    normalized_candidates = [
        normalize_candidate(c) for c in candidates
    ]

    total_votes = sum(c["votes"] for c in normalized_candidates)

    return {
        "contest_name": name,
        "total_votes": total_votes,
        "candidates": normalized_candidates
    }


def restructure(file):

    with open(file,"r",encoding="utf-8") as f:
        data = json.load(f)

    election = build_election_metadata(file,data)

    contests = (
        data.get("contests")
        or data.get("Contests")
        or data.get("Results")
        or data.get("Races")
        or []
    )

    contests = [normalize_contest(c) for c in contests]

    new_structure = {
        "election": election,
        "county_turnout": data.get("county_turnout", []),
        "contests": contests
    }

    with open(file,"w",encoding="utf-8") as f:
        json.dump(new_structure,f,indent=2)

    print(f"Rebuilt structure: {file.name}")


def run():

    files = list(DATA_DIR.glob("*.json"))

    print(f"\nRestructuring {len(files)} files\n")

    for file in files:
        restructure(file)

    print("\nAll election files rebuilt")


if __name__ == "__main__":
    run()