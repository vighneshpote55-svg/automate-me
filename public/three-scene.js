/**
 * Automate Me — Interactive 3D WebGL Scenes & 3D Layer Parallax
 * Uses Three.js with an intelligent 2.5D Canvas fallback engine.
 */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 769px) and (hover: hover)').matches;

  // --------------------------------------------------------------------------
  // 1. HERO 3D CANVAS SCENE
  // --------------------------------------------------------------------------
  function initHero3D() {
    const canvas = document.getElementById('hero3dCanvas');
    if (!canvas) return;

    if (reduceMotion) {
      canvas.style.display = 'none';
      return;
    }

    // Check if Three.js is available
    if (typeof THREE !== 'undefined') {
      initThreeHeroScene(canvas);
    } else {
      initFallbackHeroCanvas(canvas);
    }
  }

  function initThreeHeroScene(canvas) {
    let renderer, scene, camera;
    let coreGroup, wireIcosahedron, innerOctahedron, ring1, ring2, particlesMesh;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    let isVisible = true;
    let animationFrameId = null;

    const container = canvas.parentElement;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 18;

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Central Wireframe Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(4.2, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x12b6d5,
      wireframe: true,
      transparent: true,
      opacity: 0.38
    });
    wireIcosahedron = new THREE.Mesh(icoGeo, icoMat);
    coreGroup.add(wireIcosahedron);

    // 2. Inner Solid Glowing Octahedron
    const octGeo = new THREE.OctahedronGeometry(2.2, 0);
    const octMat = new THREE.MeshPhongMaterial({
      color: 0x0b51b4,
      emissive: 0x126be3,
      emissiveIntensity: 0.5,
      shininess: 90,
      flatShading: true,
      transparent: true,
      opacity: 0.85
    });
    innerOctahedron = new THREE.Mesh(octGeo, octMat);
    coreGroup.add(innerOctahedron);

    // 3. Orbiting 3D Torus Rings
    const ring1Geo = new THREE.TorusGeometry(6.2, 0.04, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x126be3,
      transparent: true,
      opacity: 0.45
    });
    ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(8.0, 0.03, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x35d69f,
      transparent: true,
      opacity: 0.3
    });
    ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = -Math.PI / 5;
    coreGroup.add(ring2);

    // 4. Floating 3D Starfield Particles (optimized for mobile performance)
    const particleCount = container.clientWidth < 768 ? 90 : 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorA = new THREE.Color(0x12b6d5);
    const colorB = new THREE.Color(0x126be3);
    const colorC = new THREE.Color(0x35d69f);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;

      const rand = Math.random();
      const c = rand < 0.4 ? colorA : rand < 0.8 ? colorB : colorC;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });
    particlesMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(particlesMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x12b6d5, 2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x0b51b4, 1.8, 50);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Mouse listener
    window.addEventListener('pointermove', (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    }, { passive: true });

    // Window resize & container dimension observer
    function onWindowResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      if (w < 768) {
        camera.position.z = 24;
      } else {
        camera.position.z = 18;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    onWindowResize();
    window.addEventListener('resize', onWindowResize, { passive: true });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(onWindowResize);
      ro.observe(container);
    }

    // IntersectionObserver to pause when not visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationFrameId) {
          animate();
        }
      });
    }, { threshold: 0.05 });
    observer.observe(container);

    // Animation Loop
    function animate() {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera/core rotation toward mouse
      targetX += (mouseX * 0.4 - targetX) * 0.05;
      targetY += (mouseY * 0.4 - targetY) * 0.05;

      coreGroup.rotation.y += 0.005;
      coreGroup.rotation.x += 0.002;
      wireIcosahedron.rotation.y -= 0.003;
      innerOctahedron.rotation.y += 0.01;
      innerOctahedron.rotation.z += 0.005;

      ring1.rotation.z += 0.004;
      ring2.rotation.z -= 0.003;

      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;

      coreGroup.position.x = targetX * 2.5;
      coreGroup.position.y = -targetY * 2.5;
      coreGroup.rotation.x = targetY * 0.6;
      coreGroup.rotation.y = targetX * 0.8;

      renderer.render(scene, camera);
    }

    animate();
  }

  // Fallback Canvas engine if Three.js CDN fails or is offline
  function initFallbackHeroCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height;
    let isVisible = true;
    let animId = null;
    let mouseX = 0, mouseY = 0;

    const container = canvas.parentElement;

    function resize() {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(container);
    }

    window.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left - width / 2;
      mouseY = e.clientY - rect.top - height / 2;
    }, { passive: true });

    // Create 3D particle nodes
    const nodes = [];
    const numNodes = 60;
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 0.8,
        y: (Math.random() - 0.5) * height * 0.8,
        z: Math.random() * 400 + 100,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 1.5,
        color: Math.random() > 0.4 ? '#12b6d5' : '#126be3'
      });
    }

    let angleY = 0;

    function draw() {
      if (!isVisible) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);

      angleY += 0.003;
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const cx = width / 2 + mouseX * 0.05;
      const cy = height / 2 + mouseY * 0.05;

      const projected = [];

      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (Math.abs(node.x) > width * 0.45) node.vx *= -1;
        if (Math.abs(node.y) > height * 0.45) node.vy *= -1;

        // Rotate in 3D
        const rx = node.x * cosY - node.z * sinY;
        const rz = node.x * sinY + node.z * cosY + 300;

        const scale = 400 / rz;
        const px = cx + rx * scale;
        const py = cy + node.y * scale;

        projected.push({ px, py, scale, color: node.color, radius: node.radius * scale });
      });

      // Draw connecting lines
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.strokeStyle = `rgba(18, 182, 213, ${(1 - dist / 110) * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      projected.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId) draw();
      });
    });
    observer.observe(container);

    draw();
  }

  // --------------------------------------------------------------------------
  // 2. INTERACTIVE 3D TECH ORB SCENE (TECHNOLOGIES SECTION)
  // --------------------------------------------------------------------------
  function initTech3D() {
    const canvas = document.getElementById('tech3dCanvas');
    if (!canvas) return;

    if (reduceMotion) {
      canvas.parentElement.style.display = 'none';
      return;
    }

    if (typeof THREE !== 'undefined') {
      initThreeTechScene(canvas);
    } else {
      initFallbackHeroCanvas(canvas);
    }
  }

  function initThreeTechScene(canvas) {
    const container = canvas.parentElement;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const globGroup = new THREE.Group();
    scene.add(globGroup);

    // Glass / wireframe tech globe
    const sphereGeo = new THREE.IcosahedronGeometry(3.8, 2);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x0b51b4,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
      metalness: 0.8
    });
    const globMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globGroup.add(globMesh);

    // Inner glowing nucleus
    const nucGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const nucMat = new THREE.MeshBasicMaterial({
      color: 0x12b6d5,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const nucleus = new THREE.Mesh(nucGeo, nucMat);
    globGroup.add(nucleus);

    // Orbital ring
    const ringGeo = new THREE.RingGeometry(4.8, 5.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x35d69f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    globGroup.add(ring);

    // Tech badges in 3D orbit
    const techTags = ['AI / ML', 'Python', 'React', 'Java', 'IoT', 'Cloud', 'Data Science', 'Docker'];
    const tagGroup = new THREE.Group();
    globGroup.add(tagGroup);

    const radius = 5.2;
    techTags.forEach((tag, idx) => {
      const phi = Math.acos(-1 + (2 * idx) / techTags.length);
      const theta = Math.sqrt(techTags.length * Math.PI) * phi;

      const nodeGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x12b6d5 : 0x35d69f
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);

      nodeMesh.position.x = radius * Math.cos(theta) * Math.sin(phi);
      nodeMesh.position.y = radius * Math.sin(theta) * Math.sin(phi);
      nodeMesh.position.z = radius * Math.cos(phi);

      tagGroup.add(nodeMesh);
    });

    const light1 = new THREE.PointLight(0x12b6d5, 2.5, 40);
    light1.position.set(8, 8, 8);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x0b51b4, 2, 40);
    light2.position.set(-8, -8, -8);
    scene.add(light2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Interactive Drag to Rotate
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      globGroup.rotation.y += deltaX * 0.008;
      globGroup.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    let isVisible = true;
    let animId = null;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animId) animate();
      });
    }, { threshold: 0.1 });
    observer.observe(container);

    function animate() {
      if (!isVisible) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        globGroup.rotation.y += 0.006;
        globGroup.rotation.x += 0.002;
      }
      nucleus.rotation.y -= 0.01;
      ring.rotation.z += 0.004;

      renderer.render(scene, camera);
    }

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize, { passive: true });

    animate();
  }

  // --------------------------------------------------------------------------
  // 3. TRUE 3D PERSPECTIVE DEPTH & LIGHT SHINE ON CARDS
  // --------------------------------------------------------------------------
  function init3DCardDepth() {
    if (reduceMotion || !isDesktop) return;

    const board = document.querySelector('.project-board.tilt-card');
    if (!board) return;

    // Create dynamic 3D specular shine overlay
    const shine = document.createElement('div');
    shine.className = 'board-3d-shine';
    board.appendChild(shine);

    board.addEventListener('pointermove', (e) => {
      const rect = board.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      board.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
      board.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
    });
  }

  // --------------------------------------------------------------------------
  // INITIALIZE ALL 3D SCENES ON DOM READY
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHero3D();
      init3DCardDepth();
    });
  } else {
    initHero3D();
    init3DCardDepth();
  }
})();
