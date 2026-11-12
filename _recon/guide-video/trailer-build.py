"""Assembles the Charme trailer: cards, both rendered segments, narration,
score, and burned-in French subtitles.

Two segments exist because the theme and the signed-in account cannot change
mid-film without a reload. The chapter card between them makes that cut a
deliberate beat instead of a glitch.

Reads trailer.json, work/<segment>/{timeline,voice}.json, the card PNGs and
the score; writes out/trailer.mp4.

Run: python trailer-build.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
W, H, FPS = 1920, 1080, 30
LEAD, TAIL = 0.25, 0.30
# --fast rebuilds only the subtitles and the final mux, reusing the encoded
# bodies, the joined picture and the mix. For caption/grade iterations.
FAST = "--fast" in sys.argv
FONT = "Segoe UI"
MUSIC = os.path.join(HERE, "audio", "trailer-music.wav")
CARDS = os.path.join(HERE, "work", "trailer-cards")
CLIPS = os.path.join(HERE, "work", "trailer-build")


def run(args, cwd=None):
    p = subprocess.run(args, capture_output=True, text=True, cwd=cwd, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{' '.join(args)}\n{p.stderr[-2400:]}")
    return p


def ff(*args, cwd=None):
    return run(["ffmpeg", "-y", "-v", "error", *args], cwd=cwd)


def frames_of(seconds):
    return int(round(seconds * FPS))


def ass_text(s):
    return str(s).replace("{", "(").replace("}", ")").replace("\n", r"\N")


def ass_ts(s):
    s = max(0.0, s)
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def load_segment(guide_id):
    work = os.path.join(HERE, "work", guide_id)
    tl = json.load(open(os.path.join(work, "timeline.json"), encoding="utf-8"))
    voice = {r["id"]: r for r in json.load(open(os.path.join(work, "voice.json"), encoding="utf-8"))}
    plan, t, frames = [], 0.0, 0
    for row in tl["timeline"]:
        d = row.get("frames", frames_of(row["dur"])) / FPS
        plan.append({"id": row["id"], "start": t, "dur": d, "frames": row.get("frames", frames_of(row["dur"])), "line": voice[row["id"]]})
        t += d
        frames += plan[-1]["frames"]
    if not os.path.isdir(tl["framesDir"]):
        raise SystemExit(f"frames missing for {guide_id}: {tl['framesDir']} (run render.cjs)")
    return {"id": guide_id, "work": work, "timeline": tl, "plan": plan, "body": t, "frames": frames}


def encode_body(seg):
    out = os.path.join(CLIPS, f"body-{seg['id']}.mp4")
    ff(
        "-framerate", str(FPS), "-i", os.path.join(seg["timeline"]["framesDir"], "%05d.jpg"),
        "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-r", str(FPS), "-frames:v", str(seg["frames"]), out,
    )
    return out


def encode_card(name, seconds, out):
    png = os.path.join(CARDS, name + ".png")
    if not os.path.exists(png):
        raise SystemExit(f"card missing: {png} (run render-cards.cjs)")
    n = frames_of(seconds)
    dur = n / FPS
    fade_out = max(0.1, dur - 0.85)
    vf = (
        "scale=3840:2160:flags=lanczos,"
        "zoompan=z='min(1+0.00042*on,1.035)'"
        ":x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2'"
        f":d=1:s={W}x{H}:fps={FPS},"
        f"fade=t=in:st=0:d=0.7,fade=t=out:st={fade_out:.3f}:d=0.8,"
        "format=yuv420p"
    )
    ff("-loop", "1", "-i", png, "-vf", vf, "-frames:v", str(n),
       "-c:v", "libx264", "-crf", "15", "-preset", "slow", "-r", str(FPS), out)
    return out


def make_scrim(path):
    """A bottom vignette that the captions sit in.

    Short pages (cart, favourites, messages) end with the footer inside the
    frame, and a caption landing on the footer links reads as a collision.
    One long, smooth ramp keeps the cream pages airy while bedding the
    captions in; on the night pages it is almost invisible. A single ramp,
    not two, so flat pages show no seam where the slope changes.
    """
    alpha = "0.85*min(1,max(0,(Y-660)/420))"
    ff(
        "-f", "lavfi",
        "-i", f"color=c=black:s={W}x{H},format=rgba,geq=r=0:g=0:b=0:a='255*({alpha})'",
        "-frames:v", "1", path,
    )


def make_subs(path, layout):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: line,{FONT},40,&H00FFFFFF,&H000000FF,&H00141010,&H00000000,0,0,0,0,100,100,0,0,1,1.8,0,2,140,140,56,1
Style: beat,{FONT},32,&H00E8D2A8,&H000000FF,&H00141010,&H90000000,0,0,0,0,100,100,3,0,1,2,1,2,160,160,108,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for seg in layout["segments"]:
        for p in seg["plan"]:
            a = seg["start"] + p["start"] + LEAD
            b = seg["start"] + p["start"] + p["dur"] - TAIL
            if b - a < 0.2:
                continue
            events.append(f"Dialogue: 0,{ass_ts(a)},{ass_ts(b)},line,,0,0,0,,{ass_text(p['line']['text'])}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(head + "\n".join(events) + "\n")


def measure_loudness(path):
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    m = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        raise RuntimeError("could not read loudnorm measurement:\n" + p.stderr[-1500:])
    return json.loads(m[-1])


def main():
    spec = json.load(open(os.path.join(HERE, "trailer.json"), encoding="utf-8"))
    cards = spec["cards"]
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(CLIPS, exist_ok=True)

    shop = load_segment("trailer-shop")
    admin = load_segment("trailer-admin")

    intro_f = frames_of(cards["intro"]["seconds"])
    chapter_f = frames_of(cards["chapter"]["seconds"])
    outro_f = frames_of(cards["outro"]["seconds"])

    shop_start = intro_f / FPS
    chapter_start = shop_start + shop["body"]
    admin_start = chapter_start + chapter_f / FPS
    outro_start = admin_start + admin["body"]
    total = outro_start + outro_f / FPS
    print(f"intro {intro_f / FPS:.2f}s | shop {shop['body']:.2f}s | chapter {chapter_f / FPS:.2f}s "
          f"| admin {admin['body']:.2f}s | outro {outro_f / FPS:.2f}s  ->  {total:.2f}s")

    layout = {
        "segments": [
            {**shop, "start": shop_start},
            {**admin, "start": admin_start},
        ]
    }

    print("encoding bodies")
    joined = os.path.join(CLIPS, "joined.mp4")
    if not FAST:
        shop_mp4 = encode_body(shop)
        admin_mp4 = encode_body(admin)

        print("encoding cards")
        intro_mp4 = encode_card("intro", cards["intro"]["seconds"], os.path.join(CLIPS, "card-intro.mp4"))
        chapter_mp4 = encode_card("chapter", cards["chapter"]["seconds"], os.path.join(CLIPS, "card-chapter.mp4"))
        outro_mp4 = encode_card("outro", cards["outro"]["seconds"], os.path.join(CLIPS, "card-outro.mp4"))

        order = [intro_mp4, shop_mp4, chapter_mp4, admin_mp4, outro_mp4]
        listing = os.path.join(CLIPS, "list.txt")
        with open(listing, "w", encoding="utf-8") as fh:
            for f in order:
                fh.write("file '" + f.replace("\\", "/") + "'\n")
        ff("-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", joined)

    # ---- narration, laid at the frame-exact start of each beat ------------
    print("mixing narration")
    voice = os.path.join(CLIPS, "voice.wav")
    if not FAST:
        ins, chains, mixes = [], [], []
        i = 0
        for seg in layout["segments"]:
            for p in seg["plan"]:
                ins += ["-i", p["line"]["file"]]
                ms = int(round((seg["start"] + p["start"] + LEAD) * 1000))
                chains.append(f"[{i}:a]adelay={ms}:all=1[a{i}]")
                mixes.append(f"[a{i}]")
                i += 1
        graph = ";".join(chains) + ";" + "".join(mixes)
        graph += (
            f"amix=inputs={len(mixes)}:normalize=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,"
            f"apad=whole_dur={total:.3f},aformat=channel_layouts=stereo[voice]"
        )
        ff(*ins, "-filter_complex", graph, "-map", "[voice]", "-c:a", "pcm_s24le", voice)

    # ---- score, trimmed and ducked under the narration -------------------
    print("mixing score")
    raw = os.path.join(CLIPS, "mix-raw.wav")
    mix = os.path.join(CLIPS, "mix.wav")
    if not FAST:
        graph = (
            "[1:a]atrim=0:%.3f,afade=t=out:st=%.3f:d=4.0,volume=0.92[bed];"
            "[0:a]asplit=2[vmain][vkey];"
            "[vkey]aformat=channel_layouts=stereo[key];"
            "[bed][key]sidechaincompress=threshold=0.035:ratio=5:attack=18:release=520:makeup=1[duck];"
            "[vmain]aformat=channel_layouts=stereo[vs];"
            "[vs][duck]amix=inputs=2:normalize=0:duration=first,"
            "aresample=48000,aformat=channel_layouts=stereo[a]"
        ) % (total, max(0.1, total - 4.0))
        ff("-i", voice, "-i", MUSIC, "-filter_complex", graph, "-map", "[a]", "-c:a", "pcm_s24le", raw)

        measured = measure_loudness(raw)
        ln = (
            "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true"
            f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
            f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
            f":offset={measured['target_offset']},aresample=48000"
        )
        ff("-i", raw, "-af", ln, "-c:a", "pcm_s24le", mix)

    print("subtitles")
    subs = os.path.join(CLIPS, "subs.ass")
    make_subs(subs, layout)
    scrim = os.path.join(CLIPS, "scrim.png")
    make_scrim(scrim)

    for name, path in (("joined", joined), ("mix", mix)):
        if not os.path.exists(path):
            raise SystemExit(f"--fast needs {name}: {path}")

    # The vignette beds the captions in, but the cards are graded on their own
    # and carry no captions - darkening their lower half muddies the logo. So
    # it is only composited during the two filmed segments.
    body = (f"between(t,{shop_start:.3f},{chapter_start:.3f})"
            f"+between(t,{admin_start:.3f},{outro_start:.3f})")

    final = os.path.join(OUT, "trailer.mp4")
    print("final encode")
    ff(
        "-i", joined, "-i", mix, "-loop", "1", "-i", scrim,
        "-filter_complex", f"[0:v][2:v]overlay=0:0:enable='{body}',ass=subs.ass[v]",
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-metadata", "title=Charme - la visite",
        "-movflags", "+faststart", "-t", f"{total:.3f}", final,
        cwd=CLIPS,
    )

    poster = os.path.join(OUT, "trailer-poster.jpg")
    ff("-ss", "1.6", "-i", os.path.join(CLIPS, "card-intro.mp4"), "-frames:v", "1", "-q:v", "2", poster)
    print(f"final: {final}")
    print(f"poster: {poster}")


if __name__ == "__main__":
    main()
