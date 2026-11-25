#!/bin/bash
# build.sh V workers -> out/phoenix-V-120fps.mp4
set -e
cd "$(dirname "$0")"
V=${1:-A}; WK=${2:-4}; FPS=120
N=$(node -e "
const fs=require('fs');const src=fs.readFileSync('scene$V.js','utf8');const m=src.match(/duration:\s*([0-9.]+)/);console.log(Math.round(+m[1]*$FPS))")
rm -rf fr_$V; mkdir -p fr_$V out
CH=$(( (N + WK - 1) / WK ))
for i in $(seq 0 $((WK-1))); do
  node render.js $V $FPS fr_$V $((i*CH)) $(((i+1)*CH)) &
done
wait
ffmpeg -y -hide_banner -loglevel error -framerate $FPS -i fr_$V/f%06d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -level 5.2 -movflags +faststart -r $FPS out/phoenix-$V-120fps.mp4
ffmpeg -y -hide_banner -loglevel error -i out/phoenix-$V-120fps.mp4 -vf "fps=60,scale=1280:-2" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart out/phoenix-$V-preview-720p.mp4
rm -rf fr_$V
echo "done $V $N frames"; ls -la out/phoenix-$V-*
