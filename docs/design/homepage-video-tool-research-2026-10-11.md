# Recording a devShark product video

Research date: 11 October 2026. Issue #349. Prices below are the displayed dollar prices; annual equivalents describe an annual commitment. This is a documentation-based comparison, not a hands-on benchmark. Nothing was installed, purchased, recorded, or uploaded.

The owner will create the video later. The homepage therefore ships an honest placeholder, not an older portfolio recording. The intended deliverable is a short recording of real devShark interactions: selecting a path, answering a quiz, writing code, running tests, and submitting a solution.

## Recommendation

**Use Screen Studio on this Mac for a polished first version.** Its cursor smoothing, automatic click zooms, manual framing and editing fit this particular demo. A single month is a reasonable option for one video. **Use Screenity Free for a zero-cost prototype with direct WebM download.** **Cap Desktop is the lower-cost option for repeated local production**, especially if a commercial lifetime license is useful. These are judgments based on the documented features and the banner's needs, not measured quality rankings.

| Tool | Relevant workflow | Displayed price | WebM delivery | Main tradeoff |
|---|---|---|---|---|
| Screen Studio | macOS recorder with automatic zooms, editable cursor motion, cropping and timeline editing; recording and rendering are local | $29/month, or $9/month billed annually ($108/year) | Documented MP4/GIF export; convert MP4 to WebM | Strong fit for the desired presentation, but Mac-only and subscription-based |
| Cap Desktop | Studio Mode records a local editable project; click-based zooms, manual focal points, trims, transitions and cursor adjustment | Commercial Desktop license: $29/year or $58 once | Plan on MP4 → WebM; documentation and marketing disagree about native WebM | Lower long-term cost; free personal use does not cover a product-marketing workflow |
| Screenity Free | Chrome extension records actual tab/window interactions, with no account; download locally | Free | Explicitly documented WebM download; MP4 also available | More manual finishing; advanced scene editing and zooms belong to Pro |
| Tella | Mac/Windows/Chrome recording, multi-clip editing, auto zoom and cloud sharing | Pro $13/user/month billed annually ($156/year); Premium $19 ($228/year) | Documented MP4 export; convert to WebM | Useful for tutorials and collaboration; cloud workflow and annual spend add little to this single banner |
| OBS Studio | Local window capture, scenes and hotkeys on Mac, Windows and Linux | Free and open source | Official basic guide recommends MKV, with MP4 remux; convert an MP4 master to WebM | Good capture control; expect more manual work for cursor treatment and editorial zooms |

### Evidence and limits

Screen Studio's current site documents automatic/manual zoom, cursor editing, export up to 4K/60 fps and the above subscription prices. Local recordings and exports stay on the device; optional share links, cloud transcription and AI voiceover use cloud services. The previous one-time license is no longer offered. [Official product, export, privacy and pricing information](https://screen.studio/).

Cap's Studio guide says projects remain local until a shareable-link export. Click zooms need recorded cursor metadata: importing a finished MP4 does not recreate it. The export table lists MP4, GIF and cursor-only MOV, while the features page advertises WebM among formats. Native WebM is therefore unconfirmed here. [Studio workflow and export table](https://cap.so/docs/recording/studio-mode), [format marketing](https://cap.so/features). Commercial rights require a paid Desktop license or Pro; a cloud subscription is unnecessary for local Desktop work. [Pricing](https://cap.so/pricing), [commercial licensing](https://cap.so/docs/commercial-license).

Screenity's free extension has no account requirement or recording limit, and its help explicitly documents WebM download. Advanced zooms, templates and multi-scene editing are Pro features. [Free versus Pro](https://help.screenity.io/get-started/is-screenity-free-to-use), [export formats](https://help.screenity.io/editing/how-to-download-your-videos). The paid editor advertises European hosting and $10/month billed yearly ($120/year); that is not a feature or price of the free extension. [Current product and annual pricing](https://screenity.io/).

Tella documents automatic zoom, editing, platform support and annually billed plans. Its export guide specifies MP4. The main product describes uploads while recording, so treat it as a cloud workflow. Premium's removal of branding concerns hosted video pages; do not infer that exported Pro files carry a watermark. [Pricing and feature comparison](https://www.tella.com/pricing), [MP4 export](https://www.tella.com/features/4k-export), [recording and upload workflow](https://www.tella.com/).

OBS documents free cross-platform capture and local recordings. Its basic recording guide recommends MKV for recoverability and provides remux to MP4. This comparison does not claim that WebM is impossible in advanced configurations; MP4 conversion is the straightforward documented path. [Official product](https://obsproject.com/), [recording/output guide](https://obsproject.com/kb/standard-recording-output-guide).

## Suggested 25–30 second recording

| Time | Actual interaction | What the viewer should understand |
|---|---|---|
| 0–4 s | Select JavaScript and open its learning path | Guided lessons have a clear progression |
| 4–10 s | Answer one quiz question, pause on its explanation | Quizzes teach through feedback |
| 10–21 s | Open a short coding task, type the solution, press Run | Learners write real code and see test results |
| 21–26 s | Submit the correct solution, pause on grading and Big O guidance | Correctness and efficiency feedback are separate |
| 26–30 s | Briefly show Today or a path checkpoint | The site supports an ongoing learning routine |

Record these as separate takes so mistakes and loading pauses are easy to trim. Use a demo account and public task; show only interactions that really work. Typing can be accelerated slightly, while test results and explanations need a readable pause. Click zoom alone may follow Run and miss the code: set a manual zoom across the editor and output together. Keep the original Deep End dark background and the current Apple application design. The recorder records what you do; it does not produce correct task solutions or navigate the product automatically just from its URL.

The banner calls for 16:9, preferably a 1920×1080 capture and a 1280×720 delivery at 30 fps, with no soundtrack or narration needed. Avoid wide ornamental frames that shrink the code. Judge legibility in the actual homepage banner and on a phone, rather than only at full screen. Include a matching still poster, an MP4 fallback and a short textual description of any information that is not already present on the page. Aim for a few megabytes initially; quality and file size need testing on the finished recording.

## WebM conversion and integration

Keep the MP4 master. An initial local VP9 conversion is:

```sh
ffmpeg -i devshark-demo.mp4 -an -vf "scale=1280:-2" -r 30 -c:v libvpx-vp9 -crf 30 -b:v 0 -pix_fmt yuv420p devshark-demo.webm
```

The CRF value is a starting point, not a measured quality guarantee. Inspect code readability and test file size; lower CRF for sharper text if needed. [Official WebM VP9 encoding guide](https://wiki.webmproject.org/ffmpeg/vp9-encoding-guide), [FFmpeg codec options](https://ffmpeg.org/ffmpeg-codecs.html#libvpx).

`HomeVideoBanner` accepts `webmSrc`, `posterSrc` and optional `mp4Src`. Add the finished public assets and pass that object from `Home.tsx`. Until then, pass no video: there is no media request, fake play button, carousel, editor or quiz. Playback is explicit using native controls, with `preload="none"`, inline playback and no autoplay/loop. This avoids automatic motion, including for visitors who prefer reduced motion. The existing unrelated `preview.webm` is not used.
