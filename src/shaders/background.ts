export const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const backgroundFragmentShader = /* glsl */ `
uniform vec2 u_resolution;
uniform vec2 u_imageResolution;
uniform sampler2D u_map;
uniform float u_meltIntensity;
uniform float u_time;

varying vec2 vUv;

vec2 containUv(vec2 uv) {
  float rScreen = u_resolution.x / max(u_resolution.y, 1.0);
  float rImg = u_imageResolution.x / max(u_imageResolution.y, 1.0);
  if (rScreen > rImg) {
    float s = rImg / rScreen;
    uv.x = uv.x * s + (1.0 - s) * 0.5;
  } else {
    float s = rScreen / rImg;
    uv.y = uv.y * s + (1.0 - s) * 0.5;
  }
  return uv;
}

vec2 meltUv(vec2 uv, float melt, float t, vec2 screenUv) {
  if (melt < 0.0001) {
    return uv;
  }
  float y = screenUv.y;
  float drift =
    sin(uv.y * 9.0 + t * 1.4) * cos(uv.x * 6.5 - t * 0.9);
  uv.x += melt * 0.11 * drift * (0.35 + y * y);
  uv.y += melt * 0.048 * sin(uv.x * 13.0 + t * 1.8);
  uv.x += melt * 0.024 * sin(y * 22.0 + t * 2.2);
  return uv;
}

void main() {
  vec2 uv = containUv(vUv);
  uv = meltUv(uv, u_meltIntensity, u_time, vUv);
  uv = clamp(uv, vec2(0.001), vec2(0.999));
  gl_FragColor = vec4(texture2D(u_map, uv).rgb, 1.0);
}
`;
