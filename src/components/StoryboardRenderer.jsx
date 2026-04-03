import { useRef, useEffect, useState, useMemo, memo } from 'react';

const OSU_WIDTH_4_3 = 640;
const OSU_WIDTH_16_9 = 854;
const OSU_HEIGHT = 480;

// Pre-computed origin values as flat arrays for faster access
const ORIGIN_X = [0, 0.5, 0, 1, 0.5, 0.5, 0.5, 1, 0, 1];
const ORIGIN_Y = [0, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 1, 1];

// Vertex shader - transforms sprite vertices
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;

  uniform vec2 u_resolution;
  uniform vec2 u_translation;
  uniform vec2 u_scale;
  uniform vec2 u_origin;
  uniform float u_rotation;

  varying vec2 v_texCoord;

  void main() {
    // Offset by origin (so origin becomes the pivot point)
    vec2 pos = a_position - u_origin;

    // Apply scale
    pos = pos * u_scale;

    // Apply rotation around origin
    float c = cos(u_rotation);
    float s = sin(u_rotation);
    vec2 rotated = vec2(
      pos.x * c - pos.y * s,
      pos.x * s + pos.y * c
    );

    // Translate to final position
    vec2 position = rotated + u_translation;

    // Convert to clip space (-1 to 1)
    vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    v_texCoord = a_texCoord;
  }
`;

// Fragment shader - samples texture with alpha and color tint
const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_alpha;
  uniform vec3 u_color; // RGB tint (1,1,1 = no tint)

  varying vec2 v_texCoord;

  void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    // Multiply texture color by tint color
    vec3 tinted = texColor.rgb * u_color;
    gl_FragColor = vec4(tinted, texColor.a * u_alpha);
  }
`;

// Circle SDF fragment shader
const CIRCLE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform float u_alpha;
  uniform vec3 u_color;
  uniform vec4 u_circleParams; // borderFrac, ringFrac, pixelSize, mode

  varying vec2 v_texCoord;

  void main() {
    vec2 uv = v_texCoord * 2.0 - 1.0;
    float dist = length(uv);
    float pw = u_circleParams.z;

    float borderFrac = u_circleParams.x;
    float ringFrac = u_circleParams.y;

    if (dist > 1.0 + pw) discard;
    float circle = smoothstep(1.0 + pw, 1.0 - pw, dist);

    float borderInner = 1.0 - borderFrac;
    float ringInner = borderInner - ringFrac;

    float pastBorder = smoothstep(borderInner + pw, borderInner - pw, dist);
    float pastRing = smoothstep(ringInner + pw, ringInner - pw, dist);

    vec3 col;
    float a;
    if (ringFrac < 0.001) {
      // Ring-only mode (approach circle): only border visible, interior transparent
      col = vec3(1.0);
      a = 1.0 - pastBorder; // 1 at border, 0 inside
    } else {
      // Full circle: border -> color ring -> dark interior
      col = vec3(1.0);
      col = mix(col, u_color, pastBorder);
      col = mix(col, vec3(0.0), pastRing * 0.6);
      a = mix(1.0, 0.4, pastRing);
    }

    float hl = smoothstep(0.5, 0.0, length(uv - vec2(-0.1, -0.2))) * 0.15;
    col += vec3(hl);

    float finalA = circle * a * u_alpha;
    if (finalA < 0.004) discard;
    gl_FragColor = vec4(col, finalA);
  }
`;

// Slider body SDF shader — reads path from texture, no uniform limit
const SLIDER_FRAGMENT_SHADER = `
  precision mediump float;

  uniform float u_alpha;
  uniform vec3 u_color;
  uniform sampler2D u_pathTex;   // path points encoded as pixels (x,y per pixel)
  uniform float u_pathCount;     // number of points
  uniform float u_sliderRadius;  // radius in local space
  uniform float u_sliderPw;      // AA pixel width in local space
  uniform vec2 u_sliderAspect;   // (bw, bh) for aspect correction

  varying vec2 v_texCoord;

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    // Correct for aspect ratio: scale texcoord to real-world proportions
    vec2 p = v_texCoord * u_sliderAspect;
    int count = int(u_pathCount);

    vec4 prev = texture2D(u_pathTex, vec2(0.5 / u_pathCount, 0.5));
    vec2 prevPt = prev.rg * u_sliderAspect;

    float d = 99999.0;
    for (int i = 1; i < 512; i++) {
      if (i >= count) break;
      float u = (float(i) + 0.5) / u_pathCount;
      vec4 cur = texture2D(u_pathTex, vec2(u, 0.5));
      vec2 curPt = cur.rg * u_sliderAspect;
      d = min(d, sdSegment(p, prevPt, curPt));
      prevPt = curPt;
    }

    float r = u_sliderRadius;
    float pw = u_sliderPw;
    float borderW = r * 0.15;

    if (d > r + borderW + pw) discard;

    float outer = smoothstep(r + borderW + pw, r + borderW - pw, d);
    float inner = smoothstep(r + pw, r - pw, d);

    vec3 col = mix(vec3(1.0), u_color * 0.2, inner);
    float a = mix(1.0, 0.35, inner);

    float finalA = outer * a * u_alpha;
    if (finalA < 0.004) discard;
    gl_FragColor = vec4(col, finalA);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// Easing functions based on osu! spec (0-34)
// Reference: https://osu.ppy.sh/wiki/en/Storyboard/Scripting/Commands
function getEasedValue(t, easing) {
  switch (easing) {
    case 0: return t; // Linear
    case 1: return t * (2 - t); // Easing Out (start fast, slow down)
    case 2: return t * t; // Easing In (start slow, speed up)
    case 3: return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Quad In/Out
    case 4: return t * t; // Quad In
    case 5: return 1 - (1 - t) * (1 - t); // Quad Out
    case 6: return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Quad In/Out
    case 7: return t * t * t; // Cubic In
    case 8: return 1 - Math.pow(1 - t, 3); // Cubic Out
    case 9: return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // Cubic In/Out
    case 10: return t * t * t * t; // Quart In
    case 11: return 1 - Math.pow(1 - t, 4); // Quart Out
    case 12: return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; // Quart In/Out
    case 13: return t * t * t * t * t; // Quint In
    case 14: return 1 - Math.pow(1 - t, 5); // Quint Out
    case 15: return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2; // Quint In/Out
    case 16: return 1 - Math.cos((t * Math.PI) / 2); // Sine In
    case 17: return Math.sin((t * Math.PI) / 2); // Sine Out
    case 18: return -(Math.cos(Math.PI * t) - 1) / 2; // Sine In/Out
    case 19: return t === 0 ? 0 : Math.pow(2, 10 * t - 10); // Expo In
    case 20: return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // Expo Out
    case 21: return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; // Expo In/Out
    case 22: return 1 - Math.sqrt(1 - t * t); // Circ In
    case 23: return Math.sqrt(1 - Math.pow(t - 1, 2)); // Circ Out
    case 24: return t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2; // Circ In/Out
    case 25: { // Elastic In
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    case 26: { // Elastic Out
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    case 27: // Elastic Half Out
    case 28: // Elastic Quarter Out
      return getEasedValue(t, 26); // Fallback to elastic out
    case 29: { // Elastic In/Out
      const c5 = (2 * Math.PI) / 4.5;
      return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }
    case 30: return 2.70158 * t * t * t - 1.70158 * t * t; // Back In
    case 31: return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2); // Back Out
    case 32: { // Back In/Out
      const c2 = 1.70158 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }
    case 33: // Bounce In
      return 1 - getEasedValue(1 - t, 34);
    case 34: { // Bounce Out
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
    default: return t; // Unknown easing, use linear
  }
}

function lerp(a, b, t, easing) {
  const et = getEasedValue(t < 0 ? 0 : t > 1 ? 1 : t, easing);
  return a + (b - a) * et;
}

function StoryboardRenderer({
  storyboard,
  storyboardBaseUrl = null,
  imageUrls = null,          // Map of normalized path → blob URL (client-side alternative)
  currentTimeRef,            // Ref from parent - no React re-renders!
  width: propWidth,
  height: propHeight,
  onProgress = null,
  hitTimes = [],
  overlayCanvasRef = null,  // Legacy Canvas2D overlay (kept for compat)
  playfieldData = null,     // { objects, radius, preempt, fadeIn, widescreen } for direct WebGL rendering
  className = '',
  style = {},
}) {
  const isWidescreen = storyboard?.widescreen ?? false;
  const OSU_WIDTH = isWidescreen ? OSU_WIDTH_16_9 : OSU_WIDTH_4_3;
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const circleProgramRef = useRef(null);
  const sliderProgramRef = useRef(null);
  const texturesRef = useRef({});
  const bufferRef = useRef(null);
  const whitePixelRef = useRef(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef(null);
  const sizeRef = useRef({ width: propWidth || 640, height: propHeight || 480 });
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const overlayTexRef = useRef(null);
  const pfTexturesRef = useRef(null); // { circleTextures, approachTex, numberTextures, radius }
  const pfDataRef = useRef(playfieldData);
  pfDataRef.current = playfieldData;

  // Auto-size from container if no explicit dimensions
  useEffect(() => {
    if (propWidth && propHeight) { sizeRef.current = { width: propWidth, height: propHeight }; return; }
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      const h = Math.floor(entry.contentRect.height);
      if (w > 0 && h > 0) {
        sizeRef.current = { width: w, height: h };
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = w; canvas.height = h; }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [propWidth, propHeight]);

  // Pre-process storyboard data with visibility time ranges
  const { sortedSprites, spritesByStart, spritesByEnd, commandsBySprite, imageList } = useMemo(() => {
    if (!storyboard?.sprites?.length) {
      return { sortedSprites: [], commandsBySprite: {}, imageList: [] };
    }

    const cmdMap = {};
    const spriteTimeRanges = {};
    const cmds = storyboard.commands || [];

    // Helper to expand loop commands
    const expandLoopCommand = (loopCmd) => {
      const expanded = [];
      const loopStart = loopCmd.start_time;
      const loopCount = loopCmd.loop_count || 1;
      const subCmds = loopCmd.sub_commands || [];

      if (subCmds.length === 0) return expanded;

      // Find the duration of one loop iteration
      // Duration is the SPAN of sub-commands (max_end - min_start), not max_end
      let minStart = Infinity, maxEnd = 0;
      for (const sub of subCmds) {
        if (sub.start_time < minStart) minStart = sub.start_time;
        if (sub.end_time > maxEnd) maxEnd = sub.end_time;
      }
      const loopDuration = maxEnd - minStart;

      // Expand each iteration
      // First iteration uses original times offset by loopStart
      // Subsequent iterations add loopDuration offset
      let orderCounter = 0;
      for (let iter = 0; iter < loopCount; iter++) {
        const iterOffset = loopStart + iter * loopDuration;
        for (const sub of subCmds) {
          expanded.push({
            type: sub.type,
            start_time: iterOffset + sub.start_time,
            end_time: iterOffset + sub.end_time,
            easing: sub.easing || 0,
            params: sub.params,
            _order: orderCounter++,
          });
        }
      }
      return expanded;
    };

    // Helper to expand trigger commands based on hit times
    // Triggers activate when an event (like HitSound) occurs within [start_time, end_time]
    // Sub-commands have relative timing from the trigger activation moment
    const expandTriggerCommand = (triggerCmd, hitTimesArray) => {
      const expanded = [];
      const triggerStart = triggerCmd.start_time;
      const triggerEnd = triggerCmd.end_time;
      const subCmds = triggerCmd.sub_commands || [];
      const triggerName = triggerCmd.trigger_name || '';

      if (subCmds.length === 0) return expanded;

      // Only process HitSound triggers for now (most common for beat-sync effects)
      // Other triggers: Failing, Passing, HitSoundClap, HitSoundFinish, HitSoundWhistle
      if (!triggerName.startsWith('HitSound')) {
        return expanded;
      }

      // Find hit times within the trigger's active window
      let orderCounter = 0;
      for (const hitTime of hitTimesArray) {
        if (hitTime >= triggerStart && hitTime <= triggerEnd) {
          // This hit activates the trigger - expand sub_commands relative to hit time
          for (const sub of subCmds) {
            expanded.push({
              type: sub.type,
              start_time: hitTime + sub.start_time,
              end_time: hitTime + sub.end_time,
              easing: sub.easing || 0,
              params: sub.params,
              _order: orderCounter++,
            });
          }
        }
      }
      return expanded;
    };

    for (let i = 0; i < cmds.length; i++) {
      const cmd = cmds[i];
      const id = cmd.sprite_id;
      if (!cmdMap[id]) cmdMap[id] = [];

      // Handle loop commands by expanding them
      if (cmd.type === 'L' && cmd.sub_commands) {
        const expanded = expandLoopCommand(cmd);
        for (const expCmd of expanded) {
          cmdMap[id].push(expCmd);
          // Update time range
          if (!spriteTimeRanges[id]) {
            spriteTimeRanges[id] = { start: expCmd.start_time, end: expCmd.end_time };
          } else {
            if (expCmd.start_time < spriteTimeRanges[id].start) spriteTimeRanges[id].start = expCmd.start_time;
            if (expCmd.end_time > spriteTimeRanges[id].end) spriteTimeRanges[id].end = expCmd.end_time;
          }
        }
        continue;
      }

      // Handle trigger commands by expanding them based on hit times
      if (cmd.type === 'T' && cmd.sub_commands) {
        const expanded = expandTriggerCommand(cmd, hitTimes);
        for (const expCmd of expanded) {
          cmdMap[id].push(expCmd);
          // Update time range
          if (!spriteTimeRanges[id]) {
            spriteTimeRanges[id] = { start: expCmd.start_time, end: expCmd.end_time };
          } else {
            if (expCmd.start_time < spriteTimeRanges[id].start) spriteTimeRanges[id].start = expCmd.start_time;
            if (expCmd.end_time > spriteTimeRanges[id].end) spriteTimeRanges[id].end = expCmd.end_time;
          }
        }
        continue;
      }

      cmdMap[id].push({
        type: cmd.type,
        start_time: cmd.start_time,
        end_time: cmd.end_time,
        easing: cmd.easing || 0,
        params: cmd.params,
        _order: i, // Preserve original order for stable sort
      });

      if (!spriteTimeRanges[id]) {
        spriteTimeRanges[id] = { start: cmd.start_time, end: cmd.end_time };
      } else {
        if (cmd.start_time < spriteTimeRanges[id].start) {
          spriteTimeRanges[id].start = cmd.start_time;
        }
        if (cmd.end_time > spriteTimeRanges[id].end) {
          spriteTimeRanges[id].end = cmd.end_time;
        }
      }
    }

    const sorted = [];
    const sprites = storyboard.sprites;
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      // Process Background (0), Foreground (3), and Overlay (4) layers
      // Skip Fail (1) and Pass (2) as they are conditional game state layers
      if (s.layer !== 0 && s.layer !== 3 && s.layer !== 4) continue;

      const range = spriteTimeRanges[s.id];
      if (!range) continue;

      // Pre-compute normalized filepath to avoid string ops in render loop
      const normalizedPath = s.filepath.replace(/\\/g, '/');

      // Pre-compute origin values for faster lookup
      const originIdx = s.origin || 0;
      const originX = ORIGIN_X[originIdx] ?? 0.5;
      const originY = ORIGIN_Y[originIdx] ?? 0.5;

      // Pre-compute animation data
      let framePaths = null;
      let frameDelay = 0;
      let frameCount = 0;
      const isLoopOnce = s.loop_type === 'LoopOnce';

      if (s.type === 'animation' && s.frame_count > 0) {
        frameCount = s.frame_count;
        frameDelay = s.frame_delay || 16.67; // Default ~60fps
        framePaths = new Array(frameCount);
        const dotIdx = normalizedPath.lastIndexOf('.');
        for (let f = 0; f < frameCount; f++) {
          if (dotIdx > 0) {
            framePaths[f] = normalizedPath.slice(0, dotIdx) + f + normalizedPath.slice(dotIdx);
          } else {
            framePaths[f] = normalizedPath + f;
          }
        }
      }

      sorted.push({
        id: s.id,
        layer: s.layer,
        x: s.x,
        y: s.y,
        startTime: range.start,
        endTime: range.end,
        normalizedPath,
        originX,
        originY,
        framePaths,
        frameDelay,
        frameCount,
        isLoopOnce,
      });
    }
    sorted.sort((a, b) => a.layer - b.layer || a.id - b.id);

    // Build time-sorted index for fast active sprite lookup
    // spritesByStart[i] = index into sorted[], ordered by startTime
    const spritesByStart = sorted.map((_, i) => i).sort((a, b) => sorted[a].startTime - sorted[b].startTime);
    // spritesByEnd[i] = index into sorted[], ordered by endTime
    const spritesByEnd = sorted.map((_, i) => i).sort((a, b) => sorted[a].endTime - sorted[b].endTime);

    for (const id in cmdMap) {
      // Stable sort: by start_time, then by original order
      cmdMap[id].sort((a, b) => a.start_time - b.start_time || (a._order ?? 0) - (b._order ?? 0));
    }

    return {
      sortedSprites: sorted,
      spritesByStart,
      spritesByEnd,
      commandsBySprite: cmdMap,
      imageList: storyboard.images || []
    };
  }, [storyboard, hitTimes]);


  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true,
    });

    if (!gl) {
      console.error('WebGL not supported, falling back to 2D');
      return;
    }

    glRef.current = gl;

    // Create shaders and program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    // Create circle SDF program (shares vertex shader)
    const circleFragShader = createShader(gl, gl.FRAGMENT_SHADER, CIRCLE_FRAGMENT_SHADER);
    const circleProgram = circleFragShader ? createProgram(gl, vertexShader, circleFragShader) : null;
    circleProgramRef.current = circleProgram;

    // Create slider body SDF program (shares vertex shader)
    const sliderFragShader = createShader(gl, gl.FRAGMENT_SHADER, SLIDER_FRAGMENT_SHADER);
    const sliderProgram = sliderFragShader ? createProgram(gl, vertexShader, sliderFragShader) : null;
    sliderProgramRef.current = sliderProgram;

    // Create vertex buffer for a unit quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Position (x, y) and texCoord (u, v) interleaved
    const vertices = new Float32Array([
      // Triangle 1
      0, 0, 0, 0,
      1, 0, 1, 0,
      0, 1, 0, 1,
      // Triangle 2
      0, 1, 0, 1,
      1, 0, 1, 0,
      1, 1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    bufferRef.current = buffer;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create 1x1 white pixel texture for solid color drawing (black bars)
    const whitePixel = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, whitePixel);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]));
    whitePixelRef.current = whitePixel;

    return () => {
      gl.deleteProgram(program);
      if (circleProgram) gl.deleteProgram(circleProgram);
      if (sliderProgram) gl.deleteProgram(sliderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (circleFragShader) gl.deleteShader(circleFragShader);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(whitePixel);
    };
  }, []);

  // Build playfield textures (circles per combo color, slider bodies, approach ring)
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !playfieldData) { pfTexturesRef.current = null; return; }

    const { objects, radius } = playfieldData;
    const RES = 4; // render textures at 4x for crisp edges
    const texSize = Math.ceil((radius * 2 + 20) * RES); // extra padding so border isn't at edge
    const c = document.createElement('canvas');
    c.width = texSize; c.height = texSize;
    const ctx = c.getContext('2d');

    function canvasToTex(canvas, mipmap = true) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (mipmap) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    }

    // Circle texture per combo color — all edges drawn as strokes for Canvas AA
    const r2 = radius * RES;
    const borderW = 4 * RES;
    const circleTextures = new Map();
    const uniqueColors = [...new Set(objects.map(o => o.color))];
    for (const color of uniqueColors) {
      c.width = texSize; c.height = texSize;
      ctx.clearRect(0, 0, texSize, texSize);
      const cx = texSize / 2, cy = texSize / 2;
      // White border (thick stroke — AA'd by canvas)
      ctx.beginPath(); ctx.arc(cx, cy, r2 - borderW / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = borderW; ctx.stroke();
      // Color ring (stroke, not fill — AA'd edges)
      const ringW = borderW * 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, r2 - borderW - ringW / 2, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = ringW; ctx.stroke();
      // Interior (large stroke to fill center area)
      const innerR = r2 - borderW - ringW;
      if (innerR > 0) {
        ctx.beginPath(); ctx.arc(cx, cy, innerR / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = innerR; ctx.stroke();
      }
      // Glossy highlight
      ctx.beginPath(); ctx.arc(cx - r2 * 0.1, cy - r2 * 0.15, r2 * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = r2 * 0.3; ctx.stroke();
      circleTextures.set(color, { tex: canvasToTex(c), w: texSize / RES, h: texSize / RES });
    }

    // Approach circle texture at 2x (white ring, thick so thinning is visible)
    const acSize = texSize * 4;
    c.width = acSize; c.height = acSize;
    ctx.clearRect(0, 0, acSize, acSize);
    const acx = acSize / 2, acy = acSize / 2, acr = acSize / 2 - 8;
    ctx.beginPath(); ctx.arc(acx, acy, acr, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10 * RES; ctx.stroke();
    const approachTex = { tex: canvasToTex(c), w: acSize / RES, h: acSize / RES };


    // Combo number textures — text clipped to circle mask (no transparent quad edges)
    const numberTextures = new Map();
    const numSize = Math.ceil(radius * 2 * RES);
    for (let n = 1; n <= 30; n++) {
      // Setting width resets canvas state including clip
      c.width = numSize; c.height = numSize;
      ctx.save();
      ctx.beginPath();
      ctx.arc(numSize / 2, numSize / 2, numSize / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.font = `bold ${radius * 0.9 * RES}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(n, numSize / 2 + RES * 0.3, numSize / 2 + RES * 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(n, numSize / 2, numSize / 2);
      ctx.restore();
      numberTextures.set(n, { tex: canvasToTex(c, false), w: numSize / RES, h: numSize / RES });
    }

    // Slider path textures — encode path points as float texture pixels
    const sliderPathTextures = new Map();
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.type !== 'slider' || !obj.sliderPath || obj.sliderPath.length < 2) continue;

      const path = obj.sliderPath;
      // Compute bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of path) {
        if (pt.x < minX) minX = pt.x; if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x; if (pt.y > maxY) maxY = pt.y;
      }
      const pad = radius + 10;
      minX -= pad; minY -= pad; maxX += pad; maxY += pad;
      const bw2 = maxX - minX, bh = maxY - minY;

      // Downsample if > 512 points
      let sampledPath = path;
      if (path.length > 512) {
        sampledPath = [];
        for (let j = 0; j < 512; j++) {
          const t = j / 511;
          sampledPath.push(path[Math.min(path.length - 1, Math.floor(t * (path.length - 1)))]);
        }
      }

      // Encode points as RGBA pixels: R = x, G = y (8-bit, 0-255 → 0.0-1.0)
      const count = sampledPath.length;
      const pixels = new Uint8Array(count * 4);
      for (let j = 0; j < count; j++) {
        pixels[j * 4] = Math.round(((sampledPath[j].x - minX) / bw2) * 255);
        pixels[j * 4 + 1] = Math.round(((sampledPath[j].y - minY) / bh) * 255);
        pixels[j * 4 + 2] = 0;
        pixels[j * 4 + 3] = 255;
      }

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, count, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      sliderPathTextures.set(i, { tex, count, minX, minY, bw: bw2, bh });
    }

    pfTexturesRef.current = { circleTextures, approachTex, numberTextures, sliderPathTextures, radius };

    return () => {
      for (const { tex } of circleTextures.values()) gl.deleteTexture(tex);
      gl.deleteTexture(approachTex.tex);
      for (const { tex } of numberTextures.values()) gl.deleteTexture(tex);
      for (const { tex } of sliderPathTextures.values()) gl.deleteTexture(tex);
      pfTexturesRef.current = null;
    };
  }, [playfieldData]);

  // Load images as WebGL textures
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !imageList.length) {
      setReady(true);
      onProgress?.(0, 0);
      return;
    }

    let loaded = 0;
    const total = imageList.length;
    const textures = {};

    onProgress?.(0, total);

    for (let i = 0; i < total; i++) {
      const path = imageList[i];
      // Normalize path for consistent key lookup
      const normalizedPath = path.replace(/\\/g, '/');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        // Set texture parameters for non-power-of-2 images
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Store with normalized path as key
        textures[normalizedPath] = { texture, width: img.width, height: img.height };
        loaded++;
        onProgress?.(loaded, total);

        if (loaded === total) {
          texturesRef.current = textures;
          setReady(true);
        }
      };

      img.onerror = () => {
        loaded++;
        onProgress?.(loaded, total);
        if (loaded === total) {
          texturesRef.current = textures;
          setReady(true);
        }
      };

      // Resolve image source: prefer imageUrls map, fall back to base URL
      if (imageUrls && imageUrls[normalizedPath]) {
        img.src = imageUrls[normalizedPath];
      } else if (storyboardBaseUrl) {
        img.src = `${storyboardBaseUrl}${encodeURI(normalizedPath)}`;
      } else {
        // No source available, skip
        loaded++;
        onProgress?.(loaded, total);
        if (loaded === total) { texturesRef.current = textures; setReady(true); }
        continue;
      }
    }

    return () => {
      for (const path in textures) {
        gl.deleteTexture(textures[path].texture);
      }
      setReady(false);
    };
  }, [imageList, storyboardBaseUrl, imageUrls, onProgress]);

  // Animation loop with WebGL rendering
  useEffect(() => {
    if (!ready || !sortedSprites.length) return;

    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const textures = texturesRef.current;

    // Get attribute and uniform locations (cache these)
    const aPosition = gl.getAttribLocation(program, 'a_position');
    const aTexCoord = gl.getAttribLocation(program, 'a_texCoord');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTranslation = gl.getUniformLocation(program, 'u_translation');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOrigin = gl.getUniformLocation(program, 'u_origin');
    const uRotation = gl.getUniformLocation(program, 'u_rotation');
    const uAlpha = gl.getUniformLocation(program, 'u_alpha');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uTexture = gl.getUniformLocation(program, 'u_texture');

    const missingTextures = new Set();

    const renderBatch = new Array(sortedSprites.length);
    let batchSize = 0;

    // Incremental active set — avoids scanning thousands of sprites per frame
    // spritesByStart is sorted by startTime, spritesByEnd by endTime
    // We track cursors into both arrays and maintain a sorted active list
    let startCursor = 0;  // next sprite in spritesByStart to check for activation
    let endCursor = 0;    // next sprite in spritesByEnd to check for deactivation
    let lastTime = -Infinity;
    const activeSet = new Set();
    let activeDrawOrder = []; // sorted indices for draw order

    function rebuildActiveSet(time) {
      // Full rebuild (on seek or first frame)
      activeSet.clear();
      for (let i = 0; i < sortedSprites.length; i++) {
        const s = sortedSprites[i];
        if (s.startTime <= time && s.endTime >= time) activeSet.add(i);
      }
      // Reset cursors via binary search
      let lo = 0, hi = spritesByStart.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; sortedSprites[spritesByStart[mid]].startTime <= time ? lo = mid + 1 : hi = mid; }
      startCursor = lo;
      lo = 0; hi = spritesByEnd.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; sortedSprites[spritesByEnd[mid]].endTime < time ? lo = mid + 1 : hi = mid; }
      endCursor = lo;
      activeDrawOrder = [...activeSet].sort((a, b) => a - b);
    }

    function updateActiveSet(time) {
      const dt = time - lastTime;
      // If time jumped backwards or far forward, full rebuild
      if (dt < 0 || dt > 2000) {
        rebuildActiveSet(time);
        return;
      }
      let changed = false;
      // Add newly started sprites
      while (startCursor < spritesByStart.length && sortedSprites[spritesByStart[startCursor]].startTime <= time) {
        const idx = spritesByStart[startCursor];
        if (sortedSprites[idx].endTime >= time) { activeSet.add(idx); changed = true; }
        startCursor++;
      }
      // Remove ended sprites
      while (endCursor < spritesByEnd.length && sortedSprites[spritesByEnd[endCursor]].endTime < time) {
        const idx = spritesByEnd[endCursor];
        if (activeSet.has(idx)) { activeSet.delete(idx); changed = true; }
        endCursor++;
      }
      if (changed) activeDrawOrder = [...activeSet].sort((a, b) => a - b);
    }

    let lastW = 0, lastH = 0;
    function bindGLState(width, height) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
      gl.enableVertexAttribArray(aPosition);
      gl.enableVertexAttribArray(aTexCoord);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
      gl.uniform1i(uTexture, 0);
      gl.uniform2f(uResolution, width, height);
      lastW = width; lastH = height;
    }

    const render = () => {
      const { width, height } = sizeRef.current;
      const scale = height / OSU_HEIGHT;
      const offsetX = (width - OSU_WIDTH * scale) / 2;

      // Only re-bind GL state when canvas resized (resize resets all state)
      if (width !== lastW || height !== lastH) {
        const canvas = canvasRef.current;
        if (canvas && (canvas.width !== width || canvas.height !== height)) {
          canvas.width = width; canvas.height = height;
        }
        bindGLState(width, height);
      }

      const time = currentTimeRef?.current || 0;
      batchSize = 0;

      // === PASS 1: Incremental active sprite update ===
      updateActiveSet(time);
      lastTime = time;

      // Process active sprites in draw order
      for (let ai = 0; ai < activeDrawOrder.length; ai++) {
        const sprite = sortedSprites[activeDrawOrder[ai]];

        const cmds = commandsBySprite[sprite.id];
        if (!cmds) continue;

        // Calculate state - defaults per osu! spec
        let x = sprite.x, y = sprite.y;
        let uniformScale = 1, vectorScaleX = 1, vectorScaleY = 1;
        let rot = 0;
        let colorR = 1, colorG = 1, colorB = 1;
        let flipH = false, flipV = false, additive = false;
        let alpha = 1;
        let hasInitF = false, hasInitS = false, hasInitV = false;
        let hasInitM = false, hasInitMX = false, hasInitMY = false;
        let hasInitR = false, hasInitC = false;

        const cmdLen = cmds.length;

        // Binary search: find last command where start_time <= time
        // All commands before this are either active or already completed
        let cLo = 0, cHi = cmdLen;
        while (cLo < cHi) { const mid = (cLo + cHi) >> 1; cmds[mid].start_time <= time ? cLo = mid + 1 : cHi = mid; }
        // cLo = first command where start_time > time
        // Process commands [0..cLo-1] that started (active or completed), then [cLo..] for init values

        // Process active/completed commands (start_time <= time)
        for (let j = 0; j < cLo; j++) {
          const cmd = cmds[j];
          const type = cmd.type;
          const params = cmd.params;
          const end_time = cmd.end_time;
          const easing = cmd.easing;
          const dur = end_time - cmd.start_time;
          const prog = dur > 0 ? Math.min(1, (time - cmd.start_time) / dur) : 1;

          switch (type) {
            case 'F': alpha = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitF = true; break;
            case 'M': x = lerp(params[0], params[2] ?? params[0], prog, easing); y = lerp(params[1], params[3] ?? params[1], prog, easing); hasInitM = true; break;
            case 'MX': x = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitMX = true; break;
            case 'MY': y = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitMY = true; break;
            case 'S': uniformScale = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitS = true; break;
            case 'V': vectorScaleX = lerp(params[0], params[2] ?? params[0], prog, easing); vectorScaleY = lerp(params[1], params[3] ?? params[1], prog, easing); hasInitV = true; break;
            case 'R': rot = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitR = true; break;
            case 'C': colorR = lerp(params[0], params[3] ?? params[0], prog, easing) / 255; colorG = lerp(params[1], params[4] ?? params[1], prog, easing) / 255; colorB = lerp(params[2], params[5] ?? params[2], prog, easing) / 255; hasInitC = true; break;
            case 'P': if (time <= end_time) { if (params[0] === 'H') flipH = true; else if (params[0] === 'V') flipV = true; else if (params[0] === 'A') additive = true; } break;
          }
        }

        // Grab initial values from upcoming commands (start_time > time)
        for (let j = cLo; j < cmdLen; j++) {
          if (hasInitF && hasInitS && hasInitV && hasInitM && hasInitMX && hasInitMY && hasInitR && hasInitC) break;
          const cmd = cmds[j];
          const type = cmd.type;
          const params = cmd.params;
          if (type === 'F' && !hasInitF) { alpha = params[0]; hasInitF = true; }
          else if (type === 'S' && !hasInitS) { uniformScale = params[0]; hasInitS = true; }
          else if (type === 'V' && !hasInitV) { vectorScaleX = params[0]; vectorScaleY = params[1]; hasInitV = true; }
          else if (type === 'M' && !hasInitM) { x = params[0]; y = params[1]; hasInitM = true; }
          else if (type === 'MX' && !hasInitMX) { x = params[0]; hasInitMX = true; }
          else if (type === 'MY' && !hasInitMY) { y = params[0]; hasInitMY = true; }
          else if (type === 'R' && !hasInitR) { rot = params[0]; hasInitR = true; }
          else if (type === 'C' && !hasInitC) { colorR = params[0]/255; colorG = params[1]/255; colorB = params[2]/255; hasInitC = true; }
        }

        if (alpha <= 0) continue;

        // Handle animation sprites
        let texturePath = sprite.normalizedPath;
        const frameCount = sprite.frameCount;
        if (frameCount > 0) {
          const animTime = time - sprite.startTime;
          if (animTime >= 0) {
            let frameIndex = (animTime / sprite.frameDelay) | 0;
            frameIndex = sprite.isLoopOnce ? (frameIndex < frameCount ? frameIndex : frameCount - 1) : frameIndex % frameCount;
            texturePath = sprite.framePaths[frameIndex];
          }
        }

        const texInfo = textures[texturePath];
        if (!texInfo) {
          missingTextures.add(texturePath);
          continue;
        }

        // Store in batch (reuse object slots to avoid GC)
        const scX = uniformScale * vectorScaleX;
        const scY = uniformScale * vectorScaleY;
        const item = renderBatch[batchSize] || (renderBatch[batchSize] = {});
        item.texInfo = texInfo;
        item.texturePath = texturePath;
        item.additive = additive;
        // Widescreen storyboards use coordinates from -107 to 747 (center at 320)
        // Need to shift X by 107 to convert to 0-854 range
        item.x = (x + (isWidescreen ? 107 : 0)) * scale + offsetX;
        item.y = y * scale;
        item.scX = texInfo.width * scX * scale * (flipH ? -1 : 1);
        item.scY = texInfo.height * scY * scale * (flipV ? -1 : 1);
        item.rot = rot;
        item.alpha = alpha;
        item.colorR = colorR;
        item.colorG = colorG;
        item.colorB = colorB;
        item.originX = sprite.originX;
        item.originY = sprite.originY;
        batchSize++;
      }

      // === PASS 2: Draw with minimal state changes ===
      gl.viewport(0, 0, width, height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      let lastBlendMode = false; // false = normal, true = additive
      let lastTexture = null;

      for (let i = 0; i < batchSize; i++) {
        const item = renderBatch[i];

        // Only switch blend mode when needed
        if (item.additive !== lastBlendMode) {
          gl.blendFunc(gl.SRC_ALPHA, item.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
          lastBlendMode = item.additive;
        }

        // Only bind texture when it changes
        if (item.texInfo.texture !== lastTexture) {
          gl.bindTexture(gl.TEXTURE_2D, item.texInfo.texture);
          lastTexture = item.texInfo.texture;
        }

        // Set uniforms and draw
        gl.uniform2f(uOrigin, item.originX, item.originY);
        gl.uniform2f(uTranslation, item.x, item.y);
        gl.uniform2f(uScale, item.scX, item.scY);
        gl.uniform1f(uRotation, item.rot);
        gl.uniform1f(uAlpha, item.alpha);
        gl.uniform3f(uColor, item.colorR, item.colorG, item.colorB);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Draw black bars at the sides AFTER sprites
      // Both 4:3 (640x480) and 16:9 (854x480) storyboards need bars if display is wider
      // Left bar: from 0 to offsetX, Right bar: from offsetX + OSU_WIDTH*scale to width
      if (whitePixelRef.current && offsetX > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, whitePixelRef.current);

        // Reset blend mode to normal for solid bars
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Black color, full opacity
        gl.uniform3f(uColor, 0, 0, 0);
        gl.uniform1f(uAlpha, 1);
        gl.uniform1f(uRotation, 0);
        gl.uniform2f(uOrigin, 0, 0);

        // Left bar
        gl.uniform2f(uTranslation, 0, 0);
        gl.uniform2f(uScale, offsetX, height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Right bar
        gl.uniform2f(uTranslation, offsetX + OSU_WIDTH * scale, 0);
        gl.uniform2f(uScale, offsetX + 1, height); // +1 to cover any rounding gaps
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Draw playfield objects as native WebGL quads
      const pf = pfTexturesRef.current;
      const pfData = pfDataRef.current;
      if (pf && pfData) {
        const { objects, fadeIn, timingPoints: pfTp } = pfData;
        const pfIsWide = pfData.widescreen;
        const PF_X = pfIsWide ? 171 : 64, PF_Y = 48;
        const pfScale = scale;
        const pfOX = offsetX + PF_X * pfScale;
        const pfOY = PF_Y * pfScale;

        // Beat pulse — find current BPM point and compute beat phase
        let beatPulse = 0;
        if (pfTp) {
          let beatLen = 500, beatOrigin = 0;
          for (let i = pfTp.length - 1; i >= 0; i--) {
            if (pfTp[i].uninherited && pfTp[i].offset <= time) {
              beatLen = pfTp[i].msPerBeat; beatOrigin = pfTp[i].offset; break;
            }
          }
          if (beatLen > 0) {
            const phase = ((time - beatOrigin) % beatLen + beatLen) % beatLen / beatLen;
            // Sharp attack, quick decay: 1 at beat, fades to 0
            beatPulse = Math.max(0, 1 - phase * 3);
          }
        }
        const pulseScale = 1 + beatPulse * 0.04; // subtle 4% size pulse
        const pulseBright = 1 + beatPulse * 0.3;  // 30% brightness boost on beat

        // Binary search for visible objects
        let pfLo = 0, pfHi = objects.length;
        while (pfLo < pfHi) { const mid = (pfLo + pfHi) >> 1; objects[mid].fadeOutEnd < time ? pfLo = mid + 1 : pfHi = mid; }
        const pfVisible = [];
        for (let i = pfLo; i < objects.length; i++) {
          if (objects[i].appearTime > time) break;
          if (objects[i].fadeOutEnd >= time) pfVisible.push(i);
        }

        // Circle SDF program uniforms
        const cp = circleProgramRef.current;
        const cpLocs = cp ? {
          aPos: gl.getAttribLocation(cp, 'a_position'),
          aTex: gl.getAttribLocation(cp, 'a_texCoord'),
          uRes: gl.getUniformLocation(cp, 'u_resolution'),
          uTrans: gl.getUniformLocation(cp, 'u_translation'),
          uScale: gl.getUniformLocation(cp, 'u_scale'),
          uOrigin: gl.getUniformLocation(cp, 'u_origin'),
          uRot: gl.getUniformLocation(cp, 'u_rotation'),
          uAlpha: gl.getUniformLocation(cp, 'u_alpha'),
          uColor: gl.getUniformLocation(cp, 'u_color'),
          uParams: gl.getUniformLocation(cp, 'u_circleParams'),
        } : null;

        function useTextureProgram() {
          gl.useProgram(program);
          gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
          gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
          gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
          gl.uniform2f(uResolution, width, height);
          gl.uniform1i(uTexture, 0);
        }

        function useCircleProgram() {
          gl.useProgram(cp);
          gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
          gl.vertexAttribPointer(cpLocs.aPos, 2, gl.FLOAT, false, 16, 0);
          gl.vertexAttribPointer(cpLocs.aTex, 2, gl.FLOAT, false, 16, 8);
          gl.uniform2f(cpLocs.uRes, width, height);
          gl.uniform1f(cpLocs.uRot, 0);
          gl.uniform2f(cpLocs.uOrigin, 0.5, 0.5);
        }

        const circleSize = pf.radius * pfScale * 2.2; // slightly larger to contain AA edges
        const borderFrac = 0.12;
        const ringFrac = 0.12;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        let currentProgram = 'tex';
        useTextureProgram();
        gl.uniform1f(uRotation, 0);
        gl.uniform2f(uOrigin, 0.5, 0.5);

        // Draw in reverse (later objects behind earlier ones)
        for (let v = pfVisible.length - 1; v >= 0; v--) {
          const idx = pfVisible[v];
          const obj = objects[idx];
          let alpha = 1;
          if (time < obj.appearTime + fadeIn) alpha = (time - obj.appearTime) / fadeIn;
          if (time > obj.hitTime) alpha = 1 - (time - obj.hitTime) / 200;
          if (alpha <= 0) continue;

          const ox = pfOX + obj.x * pfScale;
          const oy = pfOY + obj.y * pfScale;

          // Slider body — SDF polyline via path texture
          if (obj.type === 'slider') {
            const sp = sliderProgramRef.current;
            const spt = pf.sliderPathTextures?.get(idx);
            if (sp && spt) {
              gl.useProgram(sp);
              gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
              const spAPos = gl.getAttribLocation(sp, 'a_position');
              const spATex = gl.getAttribLocation(sp, 'a_texCoord');
              gl.vertexAttribPointer(spAPos, 2, gl.FLOAT, false, 16, 0);
              gl.vertexAttribPointer(spATex, 2, gl.FLOAT, false, 16, 8);
              gl.uniform2f(gl.getUniformLocation(sp, 'u_resolution'), width, height);
              gl.uniform1f(gl.getUniformLocation(sp, 'u_rotation'), 0);

              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, spt.tex);
              gl.uniform1i(gl.getUniformLocation(sp, 'u_pathTex'), 0);
              gl.uniform1f(gl.getUniformLocation(sp, 'u_pathCount'), spt.count);
              gl.uniform2f(gl.getUniformLocation(sp, 'u_sliderAspect'), spt.bw, spt.bh);
              gl.uniform1f(gl.getUniformLocation(sp, 'u_sliderRadius'), pf.radius);
              gl.uniform1f(gl.getUniformLocation(sp, 'u_sliderPw'), 2.0 / pfScale);

              const hex = obj.color;
              const scr = parseInt(hex.slice(1, 3), 16) / 255;
              const scg = parseInt(hex.slice(3, 5), 16) / 255;
              const scb = parseInt(hex.slice(5, 7), 16) / 255;
              gl.uniform1f(gl.getUniformLocation(sp, 'u_alpha'), alpha);
              gl.uniform3f(gl.getUniformLocation(sp, 'u_color'), scr, scg, scb);

              gl.uniform2f(gl.getUniformLocation(sp, 'u_origin'), 0, 0);
              gl.uniform2f(gl.getUniformLocation(sp, 'u_translation'), pfOX + spt.minX * pfScale, pfOY + spt.minY * pfScale);
              gl.uniform2f(gl.getUniformLocation(sp, 'u_scale'), spt.bw * pfScale, spt.bh * pfScale);
              gl.drawArrays(gl.TRIANGLES, 0, 6);

              currentProgram = 'slider';
            }
          }

          // Circle (or slider head) — SDF shader for perfect AA
          if ((obj.type === 'circle' || obj.type === 'slider') && cp) {
            const headX = obj.type === 'slider' && obj.sliderPath?.length ? pfOX + obj.sliderPath[0].x * pfScale : ox;
            const headY = obj.type === 'slider' && obj.sliderPath?.length ? pfOY + obj.sliderPath[0].y * pfScale : oy;

            if (currentProgram !== 'circle') { useCircleProgram(); currentProgram = 'circle'; }

            // Parse combo color
            const hex = obj.color;
            const cr = parseInt(hex.slice(1, 3), 16) / 255;
            const cg = parseInt(hex.slice(3, 5), 16) / 255;
            const cb = parseInt(hex.slice(5, 7), 16) / 255;

            gl.uniform1f(cpLocs.uAlpha, alpha);
            gl.uniform3f(cpLocs.uColor, cr * pulseBright, cg * pulseBright, cb * pulseBright);
            const csPx = circleSize * pulseScale;
            gl.uniform4f(cpLocs.uParams, borderFrac, ringFrac, 4.0 / csPx, 0);
            gl.uniform2f(cpLocs.uTrans, headX, headY);
            gl.uniform2f(cpLocs.uScale, csPx, csPx);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Combo number (circle-clipped texture)
            const nt = pf.numberTextures.get(obj.num);
            if (nt) {
              if (currentProgram !== 'tex') { useTextureProgram(); currentProgram = 'tex'; }
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, nt.tex);
              gl.uniform1f(uAlpha, alpha);
              gl.uniform3f(uColor, 1, 1, 1);
              gl.uniform1f(uRotation, 0);
              gl.uniform2f(uTranslation, headX, headY);
              gl.uniform2f(uOrigin, 0.5, 0.5);
              gl.uniform2f(uScale, nt.w * pfScale, nt.h * pfScale);
              gl.drawArrays(gl.TRIANGLES, 0, 6);
            }

            // Approach circle — shrinks to circle at obj.time (click moment), not hitTime (slider end)
            if (time < obj.time) {
              const t = (obj.time - time) / (obj.time - obj.appearTime);
              const aSize = circleSize * (1 + t * 2.5);
              // Approach circle: thick border, no ring, no interior
              const aBorderFrac = 0.04 + t * 0.04; // thicker when far, thinner when close
              if (currentProgram !== 'circle') { useCircleProgram(); currentProgram = 'circle'; }
              gl.uniform1f(cpLocs.uAlpha, alpha);
              gl.uniform3f(cpLocs.uColor, cr * pulseBright, cg * pulseBright, cb * pulseBright);
              gl.uniform4f(cpLocs.uParams, aBorderFrac, 0.0, 4.0 / aSize, 0);
              gl.uniform2f(cpLocs.uTrans, headX, headY);
              gl.uniform2f(cpLocs.uScale, aSize, aSize);
              gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
          }

          // Slider ball — SDF circle
          if (obj.type === 'slider' && time >= obj.time && time <= obj.hitTime && obj.sliderPath?.length >= 2) {
            const elapsed = time - obj.time;
            const slideTime = obj.sliderDur / obj.slides;
            const slideIdx = Math.floor(elapsed / slideTime);
            let st = (elapsed % slideTime) / slideTime;
            if (slideIdx % 2 === 1) st = 1 - st;
            const path = obj.sliderPath;
            let target = Math.max(0, Math.min(1, st)) * obj.sliderPathLen, dist = 0;
            let bx = path[0].x, by = path[0].y;
            for (let j = 1; j < path.length; j++) {
              const dx = path[j].x - path[j-1].x, dy = path[j].y - path[j-1].y;
              const seg = Math.sqrt(dx*dx + dy*dy);
              if (dist + seg >= target) { const f = seg > 0 ? (target-dist)/seg : 0; bx = path[j-1].x+dx*f; by = path[j-1].y+dy*f; break; }
              dist += seg; bx = path[j].x; by = path[j].y;
            }
            const hex = obj.color;
            const bcr = parseInt(hex.slice(1, 3), 16) / 255;
            const bcg = parseInt(hex.slice(3, 5), 16) / 255;
            const bcb = parseInt(hex.slice(5, 7), 16) / 255;
            if (currentProgram !== 'circle') { useCircleProgram(); currentProgram = 'circle'; }
            gl.uniform1f(cpLocs.uAlpha, 1);
            gl.uniform3f(cpLocs.uColor, bcr, bcg, bcb);
            const ballSz = circleSize * 1.1;
            gl.uniform4f(cpLocs.uParams, borderFrac, ringFrac, 4.0 / ballSz, 0);
            gl.uniform2f(cpLocs.uTrans, pfOX + bx * pfScale, pfOY + by * pfScale);
            gl.uniform2f(cpLocs.uScale, ballSz, ballSz);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
        }
        // Restore texture program
        if (currentProgram !== 'tex') useTextureProgram();
      }

      // FPS counter — render to tiny canvas, upload as GL texture only on change
      const fpsData = fpsRef.current;
      fpsData.frames++;
      const now = performance.now();
      if (now - fpsData.lastTime >= 1000) {
        fpsData.fps = fpsData.frames;
        fpsData.frames = 0;
        fpsData.lastTime = now;
        // Re-render FPS texture (once per second)
        const fc = fpsData.canvas || (fpsData.canvas = document.createElement('canvas'));
        fc.width = 52; fc.height = 18;
        const fctx = fc.getContext('2d');
        fctx.fillStyle = 'rgba(0,0,0,0.6)';
        fctx.fillRect(0, 0, 52, 18);
        fctx.font = '11px monospace';
        fctx.fillStyle = fpsData.fps >= 50 ? '#44ff44' : fpsData.fps >= 30 ? '#ffcc00' : '#ff4444';
        fctx.fillText(fpsData.fps + ' fps', 6, 13);
        if (!fpsData.tex) fpsData.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fpsData.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fc);
      }
      if (fpsData.tex) {
        gl.bindTexture(gl.TEXTURE_2D, fpsData.tex);
        gl.uniform2f(uOrigin, 0, 0);
        gl.uniform2f(uTranslation, 4, 4);
        gl.uniform2f(uScale, 52, 18);
        gl.uniform1f(uRotation, 0);
        gl.uniform1f(uAlpha, 1);
        gl.uniform3f(uColor, 1, 1, 1);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, sortedSprites, spritesByStart, spritesByEnd, commandsBySprite, isWidescreen, OSU_WIDTH, playfieldData]);

  if (!storyboard?.sprites?.length) return null;

  const w = propWidth || '100%';
  const h = propHeight || '100%';

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: w, height: h, position: 'relative', ...style }}
    >
      <canvas
        ref={canvasRef}
        width={sizeRef.current.width}
        height={sizeRef.current.height}
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(StoryboardRenderer);
