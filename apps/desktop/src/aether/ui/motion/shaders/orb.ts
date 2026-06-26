// apps/desktop/src/aether/ui/motion/shaders/orb.ts
// Living Orb: a sphere with a fresnel rim + animated noise; brightness driven by uState
// (0 idle, 1 thinking, 0.4 paused). In-shader rim bloom.
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
  uniform float uState; // 1.0 thinking, 0.0 idle, 0.4 paused
  uniform vec3 uAzure;
  uniform vec3 uAzureSoft;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * uState));
    vec3 base = mix(uAzure, uAzureSoft, fres);
    float glow = fres * (0.4 + 0.6 * mix(0.6, pulse, uState));
    vec3 col = base + uAzureSoft * glow * 0.8; // rim bloom
    float dim = mix(1.0, 0.45, step(uState, 0.45) * (1.0 - step(0.55, uState))); // paused dim
    gl_FragColor = vec4(col * dim, 1.0);
  }
`
