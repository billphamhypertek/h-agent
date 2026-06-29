// apps/desktop/src/aether/ui/motion/shaders/ambient.ts
// Full-screen navy/azure ambient field. In-shader soft bloom (no postprocessing dep).
export const AETHER_AMBIENT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
export const AETHER_AMBIENT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uNavy;   // #07397d
  uniform vec3 uAzure;  // #4aa3ff
  uniform float uLight; // 0 = dark "Spatial Depth" · 1 = light "Arctic Glass"
  float blob(vec2 p, vec2 c, float r) { return smoothstep(r, 0.0, length(p - c)); }
  void main() {
    vec2 p = vUv;
    float t = uTime * 0.06;
    float g = blob(p, vec2(0.5 + 0.18 * sin(t), 0.1), 0.7)
            + blob(p, vec2(0.8, 1.0 + 0.12 * cos(t * 1.3)), 0.7);
    float gi = clamp(g * 0.5, 0.0, 1.0);
    // Base backdrop: dark navy depth, or a clean near-white arctic wash in light mode.
    vec3 base = mix(uNavy * 0.35, vec3(0.95, 0.97, 1.0), uLight);
    // Light mode is a calm, low-contrast wash — the azure accent barely tints and the
    // bloom is almost gone, so cards stay readable and nothing glares.
    vec3 col = mix(base, uAzure, gi * mix(1.0, 0.1, uLight));
    col += uAzure * pow(g, 3.0) * mix(0.25, 0.035, uLight); // in-shader bloom
    gl_FragColor = vec4(col, 1.0);
  }
`
