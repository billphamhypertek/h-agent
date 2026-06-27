// apps/desktop/src/aether/ui/motion/shaders/orb.ts
// Living Orb: a sphere with a fresnel rim + animated noise; brightness driven by uState
// (0 idle, 0.4 paused, 0.7 listening, 0.9 speaking, 1.0 thinking). In-shader rim bloom.
export const AETHER_ORB_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
export const AETHER_ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform float uTime;
  uniform float uState; // 0 idle · 0.4 paused · 0.7 listening · 0.9 speaking · 1.0 thinking
  uniform vec3 uAzure;
  uniform vec3 uAzureSoft;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * uState));
    // Breathe for listening/speaking/thinking (uState >= 0.55); idle + paused are static
    // (matches the CSS fallback breaths and .ae-orb--paused animation:none).
    float pulseW = step(0.55, uState);
    // Narrow bands so each new voice state reads distinctly.
    float listening = step(0.6, uState) * (1.0 - step(0.8, uState));  // ~0.7
    float speaking  = step(0.8, uState) * (1.0 - step(0.95, uState)); // ~0.9
    vec3 base = mix(uAzure, uAzureSoft, fres);
    // listening leans cyan; speaking leans bright azure-white.
    vec3 tint = vec3(0.0, 0.30, 0.42) * listening + vec3(0.34, 0.46, 0.62) * speaking;
    float amp = 0.6 + 0.5 * speaking; // speaking glows harder
    float glow = fres * (0.4 + 0.6 * mix(0.6, pulse, pulseW)) * amp;
    vec3 col = base + (uAzureSoft + tint) * glow * 0.8; // rim bloom + state tint
    // Dim ONLY paused (uState ~= 0.4); all other states stay full brightness.
    float dim = mix(1.0, 0.45, step(0.35, uState) * (1.0 - step(0.45, uState)));
    gl_FragColor = vec4(col * dim, 1.0);
  }
`
