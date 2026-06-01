#!/usr/bin/env python3
"""Upload the BURNED origin trailer to YouTube via the Data API v3.

Two phases (run --auth-only first, then the real upload):

  # 1) one-time OAuth — prints a URL to authorize, caches a refresh token
  python upload_trailer.py --auth-only \
      --client-secret /c/Users/brigg/ai-learning-journey/.secrets/yt_client.json \
      --token         /c/Users/brigg/ai-learning-journey/.secrets/yt_token.json

  # 2) upload (reuses the cached token, no browser)
  python upload_trailer.py \
      --client-secret .../.secrets/yt_client.json \
      --token         .../.secrets/yt_token.json \
      --video    projects/burned/videos/origin-trailer/out/trailer-final.mp4 \
      --thumbnail projects/burned/videos/origin-trailer/out/thumbnail.jpg \
      --privacy public

Secrets (client JSON + token) live in the gitignored .secrets/ dir and never
enter the repo. The script reads them off disk; it never prints their contents.
"""
import argparse
import os
import sys

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

# youtube.upload is the minimal scope needed for videos.insert + thumbnails.set
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

# ---- Locked metadata (approved 2026-06-01) -------------------------------
TITLE = "BURNED — Official Trailer (the party game one human directed, machines built)"

DESCRIPTION = """\
The Pendleton Agency is now hiring. BURNED is a spy-comedy card game for 2–10 \
players — Jackbox-style: the TV is the briefing table, every phone is a private \
controller. Recruit, sabotage, and try not to get… burned.

▶ PLAY FREE: https://burnedgame.pages.dev/board
Open /board on a TV or laptop, then everyone scans the QR to check in. No installs.

— THE TWIST —
A guy who builds data pipelines wanted his favorite card game on a screen. He had \
no idea how to build it. So he didn't — he handed it to a machine and directed. \
Not one image, not one sound, not one line of code was made by his hand. Even the \
narrator is synthetic.

Written · designed · coded · scored · narrated by machines. One human directed.

—
Built on Cloudflare Workers + Durable Objects · React 19. Trailer rendered in \
Remotion using the real game UI and card art, frame-animated.
"""

TAGS = [
    "BURNED", "party game", "spy comedy", "Archer", "Jackbox", "card game",
    "couch multiplayer", "phone controller", "local multiplayer", "indie game",
    "The Pendleton Agency", "AI game", "built by AI", "Cloudflare", "Remotion",
]

CATEGORY_ID = "20"  # Gaming


def get_credentials(client_secret_path: str, token_path: str) -> Credentials:
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not os.path.exists(client_secret_path):
            sys.exit(f"ERROR: client secret not found: {client_secret_path}")
        flow = InstalledAppFlow.from_client_secrets_file(client_secret_path, SCOPES)
        # Loopback flow: prints an auth URL, waits for the browser redirect on a
        # random localhost port. open_browser=False so it works when launched
        # headless — we relay the printed URL to the user to click.
        creds = flow.run_local_server(port=0, open_browser=False, prompt="consent")
    with open(token_path, "w", encoding="utf-8") as f:
        f.write(creds.to_json())
    os.chmod(token_path, 0o600)
    return creds


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--client-secret", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--video")
    ap.add_argument("--thumbnail")
    ap.add_argument("--privacy", default="public",
                    choices=["public", "unlisted", "private"])
    ap.add_argument("--auth-only", action="store_true",
                    help="run only the OAuth flow, cache the token, then exit")
    args = ap.parse_args()

    creds = get_credentials(args.client_secret, args.token)
    if args.auth_only:
        print("AUTH_OK — refresh token cached.")
        return

    if not args.video or not os.path.exists(args.video):
        sys.exit(f"ERROR: --video not found: {args.video}")

    youtube = build("youtube", "v3", credentials=creds)
    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": CATEGORY_ID,
        },
        "status": {
            "privacyStatus": args.privacy,
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(args.video, chunksize=-1, resumable=True,
                            mimetype="video/mp4")
    request = youtube.videos().insert(part="snippet,status", body=body,
                                      media_body=media)
    print(f"Uploading {args.video} ({args.privacy})...")
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  {int(status.progress() * 100)}%")
    video_id = response["id"]
    print(f"VIDEO_ID {video_id}")
    print(f"WATCH https://youtu.be/{video_id}")
    print(f"STUDIO https://studio.youtube.com/video/{video_id}/edit")

    if args.thumbnail and os.path.exists(args.thumbnail):
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(args.thumbnail),
            ).execute()
            print("THUMBNAIL_SET")
        except HttpError as e:
            # Custom thumbnails require a phone-verified channel. Don't fail the
            # whole upload over it — the video is already live.
            print(f"THUMBNAIL_FAILED (channel may need verification at "
                  f"youtube.com/verify): {e}")


if __name__ == "__main__":
    main()
