export const synthFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_decalTexture;
uniform vec3 u_decalTransform;
uniform float u_linkDecalToMath;
uniform sampler2D u_textTexture;
uniform vec3 u_textTransform;
uniform float u_linkTextToMath;

uniform vec2 u_resolution;
uniform vec2 u_imageResolution;

// Per-layer effect uniforms: L0 = background, L1 = decal, L2 = text
uniform float u_L0_t;
uniform float u_L0_melt;
uniform float u_L0_bleed;
uniform float u_L0_noise;
uniform float u_L0_posterize;
uniform vec2 u_L0_maskCenter;
uniform float u_L0_maskRadius;
uniform float u_L0_twirl;
uniform vec3 u_L0_colorA;
uniform vec3 u_L0_colorB;
uniform float u_L0_duotoneBlend;
uniform float u_L0_colorCycle;
uniform float u_L0_halftone;
uniform float u_L0_scanline;

uniform float u_L1_t;
uniform float u_L1_melt;
uniform float u_L1_bleed;
uniform float u_L1_noise;
uniform float u_L1_posterize;
uniform vec2 u_L1_maskCenter;
uniform float u_L1_maskRadius;
uniform float u_L1_twirl;
uniform vec3 u_L1_colorA;
uniform vec3 u_L1_colorB;
uniform float u_L1_duotoneBlend;
uniform float u_L1_colorCycle;
uniform float u_L1_halftone;
uniform float u_L1_scanline;

uniform float u_L2_t;
uniform float u_L2_melt;
uniform float u_L2_bleed;
uniform float u_L2_noise;
uniform float u_L2_posterize;
uniform vec2 u_L2_maskCenter;
uniform float u_L2_maskRadius;
uniform float u_L2_twirl;
uniform vec3 u_L2_colorA;
uniform vec3 u_L2_colorB;
uniform float u_L2_duotoneBlend;
uniform float u_L2_colorCycle;
uniform float u_L2_halftone;
uniform float u_L2_scanline;

varying vec2 v_uv;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float proceduralNoiseFor(vec2 screenUV, vec2 res, float noiseLevel, float tAnim) {
  float level = max(noiseLevel, 0.0);
  if (level <= 0.0001) {
    return 0.0;
  }
  vec2 q = screenUV * res * 0.75 + vec2(tAnim * 47.13, tAnim * 31.97);
  float n = hash21(floor(q)) + hash21(floor(q + vec2(1.0, 0.0))) * 0.5;
  n = n * 2.0 - 1.0;
  return n * level;
}

vec2 spaceDistortionFor(vec2 uv, float meltIntensity, float tAnim) {
  float m = max(meltIntensity, 0.0);
  if (m <= 0.0001) {
    return uv;
  }
  float ax = uv.x * 6.2831853 * 8.0;
  float ay = uv.y * 6.2831853 * 8.0;
  float w1 = sin(ay + tAnim * 2.1) * cos(ax * 0.5 + tAnim * 1.3);
  float w2 = cos(ax + tAnim * 1.7) * sin(ay * 0.5 - tAnim * 0.9);
  vec2 offset = vec2(w1, w2) * m * 0.06;
  return uv + offset;
}

vec3 colorMutationFor(vec3 col, float bleed, float posterizeSteps) {
  float b = clamp(bleed, 0.0, 1.0);
  float steps = clamp(posterizeSteps, 2.0, 256.0);

  mat3 bleedMat = mat3(
    1.0 - b * 0.35, b * 0.2, b * 0.15,
    b * 0.15, 1.0 - b * 0.35, b * 0.2,
    b * 0.2, b * 0.15, 1.0 - b * 0.35
  );
  col = clamp(bleedMat * col, 0.0, 1.0);

  col = floor(col * steps + 0.00001) / steps;
  return clamp(col, 0.0, 1.0);
}

vec2 applyTwirl(vec2 uv, vec2 center, float intensity) {
  vec2 offset = uv - center;
  float dist = length(offset);
  float angle = dist * intensity;
  float s = sin(angle);
  float c = cos(angle);
  mat2 rot = mat2(c, -s, s, c);
  return center + rot * offset;
}

vec3 applyDuotoneFor(vec3 color, vec3 cA, vec3 cB, float blend, float cycleSpeed, float tAnim) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  float lfo = sin(tAnim * cycleSpeed);
  float t = clamp(luminance + lfo * 0.25, 0.0, 1.0);
  vec3 mappedColor = mix(cA, cB, t);
  return mix(color, mappedColor, blend);
}

vec3 applyHalftoneFor(vec3 color, vec2 uv, float resolution, float intensity) {
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float dots = sin(uv.x * resolution * 0.5) * sin(uv.y * resolution * 0.5);
  vec3 halftoneColor = mix(vec3(0.0), vec3(1.0), step(dots, luma));
  return mix(color, halftoneColor, intensity);
}

vec3 applyScanlinesFor(vec3 color, vec2 uv, float resolution, float intensity) {
  float lines = 0.5 + 0.5 * sin(uv.y * resolution * 1.5);
  return mix(color, color * lines, intensity);
}

vec2 layerWarp(vec2 uv, float tAnim, float melt, vec2 maskCenter, float maskRadius, float twirl) {
  float maskAmt = smoothstep(maskRadius, maskRadius - 0.1, distance(uv, maskCenter));
  vec2 distortedUV = applyTwirl(spaceDistortionFor(uv, melt, tAnim), maskCenter, twirl);
  return mix(uv, distortedUV, maskAmt);
}

vec3 layerShade(
  vec3 baseRgb,
  vec2 sampleUV,
  vec2 screenUV,
  vec2 canvas,
  float tAnim,
  float bleed,
  float posterizeSteps,
  vec3 cA,
  vec3 cB,
  float duoBlend,
  float cycleSpeed,
  float halftone,
  float scanline,
  float noiseLevel
) {
  vec3 rgb = colorMutationFor(baseRgb, bleed, posterizeSteps);
  rgb = applyDuotoneFor(rgb, cA, cB, duoBlend, cycleSpeed, tAnim);
  rgb = applyHalftoneFor(rgb, sampleUV, canvas.y, halftone);
  rgb = applyScanlinesFor(rgb, sampleUV, canvas.y, scanline);
  rgb += vec3(proceduralNoiseFor(screenUV, canvas, noiseLevel, tAnim));
  return clamp(rgb, 0.0, 1.0);
}

void main() {
  vec2 canvas = max(u_resolution, vec2(1.0));
  vec2 image = max(u_imageResolution, vec2(1.0));
  float canvasAspect = canvas.x / canvas.y;
  float imageAspect = image.x / image.y;
  // object-fit: cover — fill the canvas, crop overflow (no letterboxing)
  float coverScale;
  if (canvasAspect > imageAspect) {
    coverScale = canvas.x / image.x;
  } else {
    coverScale = canvas.y / image.y;
  }
  vec2 canvasCoord = v_uv * canvas;
  vec2 center = canvas * 0.5;
  vec2 delta = canvasCoord - center;

  vec2 baseUV = delta / (image * coverScale) + 0.5;

  // --- Layer 0: background ---
  vec2 uv0 = layerWarp(baseUV, u_L0_t, u_L0_melt, u_L0_maskCenter, u_L0_maskRadius, u_L0_twirl);
  vec4 tex0 = texture2D(u_texture, uv0);
  vec3 bgRgb = layerShade(
    tex0.rgb,
    uv0,
    v_uv,
    canvas,
    u_L0_t,
    u_L0_bleed,
    u_L0_posterize,
    u_L0_colorA,
    u_L0_colorB,
    u_L0_duotoneBlend,
    u_L0_colorCycle,
    u_L0_halftone,
    u_L0_scanline,
    u_L0_noise
  );

  // --- Layer 1: decal ---
  vec2 gridDecal = mix(baseUV, uv0, u_linkDecalToMath);
  float decalSc = max(u_decalTransform.z, 0.0001);
  vec2 decalRaw = (gridDecal - vec2(u_decalTransform.x, u_decalTransform.y) - 0.5) / decalSc + 0.5;
  vec4 decalPixel = vec4(0.0);
  if (decalRaw.x >= 0.0 && decalRaw.x <= 1.0 && decalRaw.y >= 0.0 && decalRaw.y <= 1.0) {
    vec2 uv1 = layerWarp(decalRaw, u_L1_t, u_L1_melt, u_L1_maskCenter, u_L1_maskRadius, u_L1_twirl);
    vec4 t1 = texture2D(u_decalTexture, uv1);
    if (uv1.x >= 0.0 && uv1.x <= 1.0 && uv1.y >= 0.0 && uv1.y <= 1.0) {
      vec3 dRgb = layerShade(
        t1.rgb,
        uv1,
        v_uv,
        canvas,
        u_L1_t,
        u_L1_bleed,
        u_L1_posterize,
        u_L1_colorA,
        u_L1_colorB,
        u_L1_duotoneBlend,
        u_L1_colorCycle,
        u_L1_halftone,
        u_L1_scanline,
        u_L1_noise
      );
      decalPixel = vec4(dRgb, t1.a);
    }
  }

  vec3 withDecal = mix(bgRgb, decalPixel.rgb, decalPixel.a);

  // --- Layer 2: text ---
  vec2 gridText = mix(baseUV, uv0, u_linkTextToMath);
  float textSc = max(u_textTransform.z, 0.0001);
  vec2 textRaw = (gridText - vec2(u_textTransform.x, u_textTransform.y) - 0.5) / textSc + 0.5;
  vec4 textPixel = vec4(0.0);
  if (textRaw.x >= 0.0 && textRaw.x <= 1.0 && textRaw.y >= 0.0 && textRaw.y <= 1.0) {
    vec2 uv2 = layerWarp(textRaw, u_L2_t, u_L2_melt, u_L2_maskCenter, u_L2_maskRadius, u_L2_twirl);
    vec4 t2 = texture2D(u_textTexture, uv2);
    if (uv2.x >= 0.0 && uv2.x <= 1.0 && uv2.y >= 0.0 && uv2.y <= 1.0) {
      vec3 xRgb = layerShade(
        t2.rgb,
        uv2,
        v_uv,
        canvas,
        u_L2_t,
        u_L2_bleed,
        u_L2_posterize,
        u_L2_colorA,
        u_L2_colorB,
        u_L2_duotoneBlend,
        u_L2_colorCycle,
        u_L2_halftone,
        u_L2_scanline,
        u_L2_noise
      );
      textPixel = vec4(xRgb, t2.a);
    }
  }

  vec3 outRgb = mix(withDecal, textPixel.rgb, textPixel.a);
  gl_FragColor = vec4(outRgb, 1.0);
}
`;
