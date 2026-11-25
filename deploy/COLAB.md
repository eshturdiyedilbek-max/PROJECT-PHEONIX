# Run Phoenix on a free Google Colab GPU

A laptop CPU needs ~8 s per sign, too slow for live. Colab's free T4 GPU is meant to bring that under 1 s.
[`phoenix_colab.ipynb`](phoenix_colab.ipynb) does everything: clone, install, download models, benchmark, start the server, and open a public HTTPS/WSS tunnel.

## Steps

1. **Get the notebook into Colab** (the repo is private, so the "Open in Colab" badge won't work):
   - Download `deploy/phoenix_colab.ipynb` from GitHub, then in Colab use **File > Upload notebook**, or
   - in Colab, **File > Open notebook > GitHub**, tick **Include private repos**, sign in to GitHub, and pick `deploy/phoenix_colab.ipynb`.
2. **GPU:** **Runtime > Change runtime type > T4 GPU > Save**.
3. **Secrets** (key icon 🔑 in the left sidebar), with **Notebook access** turned on:
   - `GITHUB_TOKEN`: fine-grained token from https://github.com/settings/personal-access-tokens/new: *Only select repositories* = PROJECT-PHEONIX, *Contents: Read-only*, expiry 7 days.
   - `GEMINI_API_KEY`: Google AI Studio key (optional; without it there is no sentence smoothing and speech-to-text uses Whisper).
   If they are missing, the notebook asks you to paste them. Neither is printed, written to disk in the repo, or left in `.git/config`.
4. **Runtime > Run all.** The first run takes about 5 to 10 minutes.
5. Copy the URLs that step 7b prints:
   ```
   API base (HTTPS):   https://<random>.trycloudflare.com
   Sign WebSocket:     wss://<random>.trycloudflare.com/ws/sign?lang=rsl
   ```
   Point the frontend at them. Same API as [`docs/API.md`](../docs/API.md).

## What each step does

| Step | What |
|---|---|
| 1 Settings | Russian model (`mvit32-2` default), ASL on/off, Whisper CPU/GPU, CORS (`*` for the demo) |
| 2 GPU check | `nvidia-smi`; stops with a clear message if the runtime has no GPU |
| 3 Secrets | Colab Secrets, or a hidden prompt |
| 4 Code | shallow clone of `main` with the token, then removes the token from the git remote |
| 5 Install | `pip install -e .`, swaps `onnxruntime` for `onnxruntime-gpu` (with its own CUDA/cuDNN wheels; picks the CUDA 12 or 13 build from the driver), installs `cloudflared` |
| 6 Models | `scripts/download_models.py`: Slovo RSL + SignFlow-A ASL (~150 MB each) + Whisper |
| 7a Benchmark | `scripts/gpu_bench.py`: device used and ms per word for each sign model |
| 7b Server | `uvicorn app.main:app` on port 8000 (SQLite in `/content`), waits for `/api/health`, checks `sign_devices` says `cuda`, starts a Cloudflare quick tunnel and prints the URLs |
| 8 Test | streams frames over the public `wss://` URL with `scripts/smoke_ws.py` (optionally your own video) |

`GET /api/health` now includes `"sign_devices": {"rsl": "cuda", "asl": "cuda"}`, so the frontend or you can see at any time whether the GPU is in use.

## Limits (read before the demo)

- **The URL changes** every time 7b is re-run or Colab restarts. Update the frontend each time.
- Free Colab disconnects after ~90 min without activity and after 12 h at most, and a GPU isn't always available at busy times. Start it 15 minutes before the demo and keep the tab open.
- Colab's free tier is meant for interactive notebook work, and Google may stop sessions that look like long-running web hosting. Fine for a hackathon demo; not a permanent host.
- Quick tunnels (`trycloudflare.com`) have no uptime guarantee.
- History and contributions are stored in `/content` and are lost when the runtime resets.
- The Gemini key is only inside the Colab runtime. Revoke it after the hackathon as planned.

## If something goes wrong

- **"running on CPU" warning in 7a/7b:** the GPU build of ONNX Runtime could not load CUDA/cuDNN. Look at `!grep -iE "cuda|cudnn" /content/phoenix_server.log`. Re-running step 5 and then 7b usually fixes a half-finished install.
- **Clone fails with 403/404:** the token can't read the repo; check it has *Contents: Read-only* on PROJECT-PHEONIX.
- **Model download fails:** the Slovo models are hosted on a server in Russia; re-run step 6 (finished files are skipped).
- **Server crashed:** step 7b prints the end of the log; the full log is `/content/phoenix_server.log`.
