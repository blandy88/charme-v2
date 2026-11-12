"""Renders one French voice file per beat.

Per-beat files are deliberate: a fluffed line costs one re-render, and the
montage follows the voice rather than the other way round. Durations are
written to voice.json so the renderer can size every clip.

The lines come from script.json, so the narration and the camera never drift
apart - there is exactly one place where a guide is described.

Everything lands under work/<guideId>/, so two guides never share a file.

Run: python narrate.py [guideId] [voice] [--script trailer.json]
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VENV_PY = r"C:\Users\cheri\.workbuddy-ai\binaries\python\envs\default\Scripts\python.exe"

# Shared across guides, keyed by the text itself. The admin tutorials repeat
# the same navigation lines, and seven of them end the intro on the same
# Loyalty-tab instruction. Without this cache, each repeated line would be
# synthesised again and could come back fractionally different. Here the audio
# is copied byte-for-byte, so the shared intro lines are identical by
# construction.
SHARED = os.path.join(HERE, "voice-cache")


def duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(out.stdout.strip())


def synth(text: str, voice: str, rate, txt: str, mp3: str) -> None:
    with open(txt, "w", encoding="utf-8") as fh:
        fh.write(text + "\n")
    cmd = [VENV_PY, "-m", "edge_tts", "--voice", voice]
    if rate:
        # --rate=-4%, not --rate -4%: argparse reads a leading dash as a flag.
        cmd.append(f"--rate={rate}")
    cmd += ["--file", txt, "--write-media", mp3]
    subprocess.run(cmd, check=True)


def main() -> None:
    # The trailer keeps its shots in its own file; the tutorials stay in
    # script.json. `--script` is opt-in so every existing call still works.
    argv = sys.argv[1:]
    script_file = "script.json"
    if "--script" in argv:
        k = argv.index("--script")
        script_file = argv[k + 1]
        del argv[k:k + 2]
    guide_id = argv[0] if len(argv) > 0 else "loyalty"
    spec = json.load(open(os.path.join(HERE, script_file), encoding="utf-8"))["guides"][guide_id]
    voice = argv[1] if len(argv) > 1 else spec["voice"]
    rate = spec.get("rate")

    work = os.path.join(HERE, "work", guide_id)
    audio = os.path.join(work, "audio")
    os.makedirs(audio, exist_ok=True)

    # A beat is only re-synthesised when its line or its voice actually
    # changed. Rewriting the whole narration to fix one word is slow enough to
    # discourage fixing the one word.
    cache_file = os.path.join(work, "voice-cache.json")
    cache = {}
    if os.path.exists(cache_file):
        cache = json.load(open(cache_file, encoding="utf-8"))

    rows = []
    reused = 0
    os.makedirs(SHARED, exist_ok=True)
    for beat in spec["beats"]:
        text = beat["fr"]
        txt = os.path.join(audio, f"{beat['id']}.txt")
        mp3 = os.path.join(audio, f"{beat['id']}.mp3")
        key = hashlib.sha1(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()
        shared = os.path.join(SHARED, key + ".mp3")

        if os.path.exists(shared):
            # Some other guide - or an earlier run of this one - already said
            # exactly this, in exactly this voice. Take that file.
            shutil.copyfile(shared, mp3)
            state = "reuse"
        elif cache.get(beat["id"]) == key and os.path.exists(mp3):
            shutil.copyfile(mp3, shared)
            state = "keep"
        else:
            synth(text, voice, rate, txt, mp3)
            shutil.copyfile(mp3, shared)
            state = "new  "
        cache[beat["id"]] = key
        if state in ("reuse", "keep"):
            reused += 1

        d = duration(mp3)
        rows.append({"id": beat["id"], "voice": voice, "rate": rate, "text": text, "file": mp3, "seconds": d})
        print(f"  {state} {beat['id']:<16} {d:5.2f}s  {text[:56]}")

    json.dump(cache, open(cache_file, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(rows, open(os.path.join(work, "voice.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    total = sum(r["seconds"] for r in rows)
    print(f"\nvoice: {voice}  rate: {rate or 'default'}")
    print(f"narration total: {total:.2f}s over {len(rows)} beats ({reused} reused)")
    print(f"-> {os.path.join(work, 'voice.json')}")


if __name__ == "__main__":
    main()
