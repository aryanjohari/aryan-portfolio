# The Algorithm Engine

Master architectural document for **web-image-editor**: a browser-based, math-driven visual synthesizer. The product treats an uploaded image as a signal that passes through a **single full-screen quad** rendered with **custom GLSL**. All “effects” are **parameterized mathematical transforms** (UV distortion, channel mixing, quantization, procedural noise, time-modulated color) rather than a stack of bitmap filters.

This README is written so an AI assistant (or a new contributor) can quickly grasp **context**, **capabilities**, **data flow**, and **constraints** without spelunking the tree.

---

## Overview

**The Algorithm Engine** is a **WebGL-first image lab**: users upload a raster image, tune a small set of continuous parameters, and see the result in real time on a GPU fragment shader. The experience is intentionally minimal—one plane, one material, one fragment program—so the creative surface area is the **math inside the shader** and the **uniforms** that drive it.

---

## Tech Stack

| Layer | Choice | Role in this repo |
|--------|--------|-------------------|
| **App shell** | **React 19** + **Vite 8** | SPA entry (`main.tsx`), layout, controls |
| **Language** | **TypeScript** | Store, components, typed Three.js usage |
| **3D / WebGL** | **Three.js** + **React Three Fiber (R3F)** + **@react-three/drei** | `Canvas`, render loop, `OrthographicCamera`, `shaderMaterial` |
| **State** | **Zustand** | Global synth parameters, texture handle, panel visibility, image pixel dimensions |
| **Motion (UI)** | **GSAP** | Slide in/out of the control stack panel |
| **Styling** | **Tailwind CSS** | Layout, typography, control chrome |
| **Shaders** | **GLSL** (`.glsl` files) | Bundled via `vite-plugin-glsl`; imported as strings into `ShaderMaterial` |

**Path alias:** `@/` → `src/` (see `vite.config.ts`).

---

## Core Architecture

### High-level data flow

1. **File upload** — User picks PNG/JPEG/WebP. `TextureLoader` decodes via object URL, applies texture settings, then **`setImageTexture`** stores the Three.js `Texture` plus **native bitmap dimensions** in Zustand.
2. **Zustand (`useSynthStore`)** — Holds:
   - `imageTexture` / `imageResolution` (for aspect-aware sampling)
   - `SynthParams`: `meltIntensity`, `colorBleed`, `noiseLevel`, `posterizeSteps`, `timeScale`, `maskCenterX` / `maskCenterY` / `maskRadius`, `twirlIntensity`, `colorA` / `colorB` / `duotoneBlend`, `colorCycleSpeed`, `halftoneIntensity` / `scanlineIntensity`
   - UI: `panelOpen`, setters
3. **React Three Fiber** — `<Canvas>` with **`gl={{ preserveDrawingBuffer: true }}`** (needed for **PNG export**), **`dpr={[1, 2]}`**, default **`OrthographicCamera`** (manual frustum: ±1 plane, Z toward scene).
4. **Scene graph** — `SynthScene`: one **`mesh`** with **`planeGeometry(2, 2)`** filling the clip-space quad and **`SynthMaterial`** (shader pipeline).
5. **Fragment shader** — Samples `u_texture` after **object-fit: contain** UV remapping (letterboxed centered content). Applies **melt** on UVs, **localized mask** + **twirl** blend, then **color mutation (bleed + posterize)**, **duotone** (optionally **LFO-modulated** via `u_colorCycleSpeed`), **halftone / scanlines**, and **procedural grain**. **`u_time`** normally follows the R3F clock × `timeScale`; during WebM export it follows **`window.__SYNTH_EXPORT_TIME__`** × `timeScale` so melt, grain, and duotone LFO stay in sync with the recording (see Export).

### Key implementation details (for maintainers & AI)

- **Material remount:** `SynthMaterial` is keyed by `imageTexture?.uuid` so swapping images gets a clean material lifecycle when needed (`SynthCanvas.tsx` / `SynthScene`).
- **Uniform updates:** Initial `useMemo` seeds uniforms; **`useFrame`** pulls fresh values via `useSynthStore.getState()` so sliders can write through the store without relying on React render timing (`SliderControl` uses `getState().setParam`). **`u_time`** uses `__SYNTH_EXPORT_TIME__` when that global is set during WebM capture, then returns to the scene clock after export clears it (`exportLoopWebm.ts` `finally`).
- **Fallback texture:** When no image is loaded, a 1×1 `DataTexture` avoids invalid sampler state (`SynthMaterial.tsx`).
- **Vertex stage:** Pass-through UVs to the fragment shader (`vertex.glsl`).

---

## Current Capabilities

### Image upload pipeline

- **Formats:** PNG, JPEG, WebP (`accept` on file input).
- **Loading:** `URL.createObjectURL` → `TextureLoader` → revoke URL after load.
- **Color space:** `SRGBColorSpace` on the loaded texture.
- **NPOT / filtering:** `generateMipmaps = false`, **`LinearFilter`** for min/mag — avoids mip requirements on **non-power-of-two** sizes and keeps sampling predictable for full-screen quad use.
- **Object-fit: contain (shader):** Fragment shader maps quad UVs to texture space using **`u_resolution`** (draw buffer / canvas pixels) and **`u_imageResolution`** (bitmap pixels) so the **entire image is visible** inside the canvas, **letterboxed** (black bars) when aspects differ—like CSS `object-fit: contain` (logic is inline in `fragment.glsl`).

### Feature areas (shipped phases)

**Base signal & motion**

| Control | Store keys | Shader role |
|--------|------------|-------------|
| Melt, bleed, posterize, noise | `meltIntensity`, `colorBleed`, `posterizeSteps`, `noiseLevel` | `spaceDistortion`, `colorMutation`, `proceduralNoise` |
| Time | `timeScale` | Scales `u_time` (R3F clock or export override) for melt, grain, and duotone LFO |

**Localized masking (center / radius)**

- **Sliders:** `maskCenterX`, `maskCenterY`, `maskRadius`
- **Shader:** Radial weight on **`baseUV`** via `smoothstep` around `u_maskCenter` and `u_maskRadius`. That mask **blends** the twirled UV with the undistorted UV so warp is localized, not full-frame only.

**Warp (twirl)**

- **Slider:** `twirlIntensity`
- **Shader:** `applyTwirl` rotates UVs around the mask center; strength is gated by the mask above.

**Pro color engine (duotone + LFO)**

- **Controls:** `colorA`, `colorB` (pickers), `duotoneBlend`, **Color Cycle Speed** (`colorCycleSpeed`, UI range 0–5)
- **Uniforms:** `u_duotoneBlend`, `u_colorCycleSpeed`
- **Shader:** **`applyDuotone`** maps image luminance to a mix of `u_colorA` / `u_colorB`. A sine LFO, **`sin(u_time * u_colorCycleSpeed)`**, offsets that mix coordinate (scaled and clamped) so highlights and shadows **shift between the two inks** over time. When **`colorCycleSpeed` is 0**, `u_time * 0` yields no offset—duotone is **static** aside from `duotoneBlend`.

**Textures (halftone / scanlines)**

- **Sliders:** `halftoneIntensity`, `scanlineIntensity`
- **Uniforms:** `u_halftone`, `u_scanline`
- **Shader:** **`applyHalftone`** and **`applyScanlines`** run on RGB **after duotone, before grain**, using **`finalUV`** and **`u_resolution.y`** as the resolution scale so the pattern tracks output size.

### Export

- **PNG:** Reads the WebGL `<canvas>`, draws to an offscreen 2D canvas (optional scale; default export uses **1.5×** in `StackPanel`), triggers download (`exportImage.ts`). Depends on **`preserveDrawingBuffer: true`**.
- **WebM loop (synced):** `exportLoopWebm` uses **`MediaRecorder`** + `captureStream`. Each frame it sets **`window.__SYNTH_EXPORT_TIME__`** to the export timeline; **`SynthMaterial`** drives **`u_time`** from that value (× `timeScale`) while present, so the recorded loop matches the deterministic clock. A **`finally`** block **deletes** the property after capture so live preview returns to the R3F clock.

### Shell UX

- Right **Stack** panel: upload, sliders, export; **GSAP** slide off-screen with **Hide** / floating **Open Stack**.
- **@react-three/drei** `OrthographicCamera` with `makeDefault` + manual frustum matching the 2×2 plane.

---

## Constraints & Gotchas (for AI / contributors)

- **Single full-screen effect:** No multi-pass compositor or separate layer stack — localized masking and all color/texture steps still live in **one** fragment program.
- **Export coupling:** PNG/WebM grab `document.querySelector("canvas")` — assumes **one** prominent canvas (fragile if the DOM gains more canvases).
- **Debug logging:** `useSynthStore` / `UploadButton` use `DEBUG = true` console noise; tune before production polish.

---

## Future direction

Possible next steps (not implemented here): **audio reactivity** (FFT or envelope driving uniforms or additional LFO targets), richer **texture / print models** or multi-input blending, **multi-pass** or layer-style compositing, and export options (codec, duration UI, optional audio sync).

---

## Project scripts

```bash
npm run dev      # Vite dev server
npm run build    # Typecheck + production bundle
npm run preview  # Preview production build
npm run lint     # ESLint
```

---

## Entry points (quick map)

| Area | Primary files |
|------|----------------|
| App layout / Canvas | `src/App.tsx` |
| Global state | `src/store/useSynthStore.ts` |
| R3F scene | `src/webgl/SynthCanvas.tsx` |
| Shader material + uniforms | `src/webgl/materials/SynthMaterial.tsx` |
| GLSL | `src/webgl/shaders/vertex.glsl`, `src/webgl/shaders/fragment.glsl` |
| Upload | `src/components/UploadButton.tsx` |
| Controls + export triggers | `src/components/controls/StackPanel.tsx`, `SliderControl.tsx` |
| PNG export | `src/lib/export/exportImage.ts` |
| WebM capture | `src/lib/export/exportLoopWebm.ts` |
