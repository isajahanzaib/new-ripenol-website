'use strict';

/* ═══════════════════════════════════════════════════
   THEME TOGGLE
   Pill switch in the nav — saves preference to localStorage
═══════════════════════════════════════════════════ */
(function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-switch');
    if (!btn) return;

    // Restore saved preference
    const saved = localStorage.getItem('ripenol-theme');
    if (saved) html.setAttribute('data-theme', saved);

    btn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('ripenol-theme', next);
    });
})();


/* ═══════════════════════════════════════════════════
   3D BOTTLE SCENE
   Loads Ripenol_Bottle_1.glb, slow Y rotation + float
═══════════════════════════════════════════════════ */
(function initBottle() {
    const canvas = document.getElementById('bottle-canvas');
    const container = canvas.parentElement;
    if (!canvas || typeof THREE === 'undefined') return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    function resize() {
        const r = container.getBoundingClientRect();
        const w = r.width;
        const h = r.height;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    camera.position.set(0, 0, 4.5);

    // ── Scene ──
    const scene = new THREE.Scene();

    // ── Lights ──
    // Hemisphere light — mimics sky/ground bounce, kills the flat plastic look
    var hemi = new THREE.HemisphereLight(0xF0F4FF, 0x1A2A1A, 0.65);
    scene.add(hemi);

    // Primary key — overhead studio spot, strong, slightly front-right
    // High Y position (10) means light hits top of bottle strongly and falls off down the sides
    var key = new THREE.DirectionalLight(0xFFFCF5, 2.2);
    key.position.set(1.5, 10, 4);
    scene.add(key);

    // Soft fill — opposite side, very weak, just lifts the shadow side off pure black
    var fill = new THREE.DirectionalLight(0xCCDDFF, 0.22);
    fill.position.set(-5, 2, 1);
    scene.add(fill);

    // Rim — catches the back edge of the bottle, separates it from the dark background
    var rim = new THREE.DirectionalLight(0xDDFFEE, 0.28);
    rim.position.set(-1, 5, -7);
    scene.add(rim);

    // ── Soft Multi-Layer Shadow ──
    // Layer 1 — wide, very faint outer glow shadow
    var sg1 = new THREE.CircleGeometry(1.1, 64);
    var sm1 = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.10
    });
    var sd1 = new THREE.Mesh(sg1, sm1);
    sd1.rotation.x = -Math.PI / 2;
    sd1.position.y = -1.38;
    scene.add(sd1);

    // Layer 2 — medium, slightly stronger
    var sg2 = new THREE.CircleGeometry(0.72, 64);
    var sm2 = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.16
    });
    var sd2 = new THREE.Mesh(sg2, sm2);
    sd2.rotation.x = -Math.PI / 2;
    sd2.position.y = -1.37;
    scene.add(sd2);

    // Layer 3 — tight core under the bottle base, darkest
    var sg3 = new THREE.CircleGeometry(0.38, 64);
    var sm3 = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.22
    });
    var sd3 = new THREE.Mesh(sg3, sm3);
    sd3.rotation.x = -Math.PI / 2;
    sd3.position.y = -1.36;
    scene.add(sd3);

    // ── Bottle group ──
    const bottleGroup = new THREE.Group();
    scene.add(bottleGroup);

    let bottleLoaded = false;
    let time = 0;

    // ── Load GLB ──
    const loader = new THREE.GLTFLoader();
    loader.load(
        'Ripenol_Bottle_1.glb',
        function onLoad(gltf) {
            const model = gltf.scene;

            // Centre and scale to fit camera view
            const box = new THREE.Box3().setFromObject(model);
            const centre = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            model.position.sub(centre);
            model.scale.setScalar(2.6 / maxDim);

            // Material quality enhancements
            model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    var mats = Array.isArray(child.material)
                        ? child.material
                        : [child.material];
                    mats.forEach(function (m) {
                        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
                            m.envMapIntensity = 0.0;   // kill any fake env reflection making it look self-lit
                            m.roughness = Math.max(m.roughness, 0.62);  // soften — stops the plastic sheen
                            m.metalness = Math.min(m.metalness, 0.05);  // bottle is not metal
                            m.needsUpdate = true;
                        }
                    });
                }
            });

            bottleGroup.add(model);
            bottleLoaded = true;
        },
        undefined,
        function onError(err) {
            console.warn('Ripenol GLB could not be loaded:', err);
        }
    );

    // ── Render loop ──
    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        if (bottleLoaded) {
            // Slow continuous Y rotation — full turn every ~14 seconds
            bottleGroup.rotation.y = time * 0.45;
            // Static height per user request - raised even higher
            bottleGroup.position.y = 0.85;
            // Very subtle fore-aft tilt
            bottleGroup.rotation.x = Math.sin(time * 0.3) * 0.025;
            
            // Animate 3-layer shadow
            var lift = bottleGroup.position.y;
            var spread = 1.0 - (lift * 0.10);
            var fade   = Math.max(0, 1.0 - (lift * 0.18));

            sd1.scale.x = spread * 1.0; sd1.scale.z = sd1.scale.x;
            sd1.material.opacity = 0.10 * fade;

            sd2.scale.x = spread * 0.88; sd2.scale.z = sd2.scale.x;
            sd2.material.opacity = 0.16 * fade;

            sd3.scale.x = spread * 0.60; sd3.scale.z = sd3.scale.x;
            sd3.material.opacity = 0.22 * fade;
        }

        renderer.render(scene, camera);
    }

    // Initial size, then start loop
    resize();
    animate();

    window.addEventListener('resize', resize);
})();


/* ═══════════════════════════════════════════════════
   NAV — scroll shadow
═══════════════════════════════════════════════════ */
(function initNav() {
    var nav = document.getElementById('nav');
    window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    });
})();


/* ═══════════════════════════════════════════════════
   FADE IN OBSERVER
═══════════════════════════════════════════════════ */
(function initFadeIn() {
    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) e.target.classList.add('vis');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fi').forEach(function (el) {
        obs.observe(el);
    });
})();


/* ═══════════════════════════════════════════════════
   BAR CHART ANIMATION
   Animates in when #performance scrolls into view
═══════════════════════════════════════════════════ */
(function initBars() {
    var gen = document.getElementById('bar-gen');
    var rip = document.getElementById('bar-rip');
    var sec = document.getElementById('performance');
    if (!gen || !rip || !sec) return;

    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) {
                gen.style.width = '24%';
                rip.style.width = '100%';
            } else {
                gen.style.width = '0%';
                rip.style.width = '0%';
            }
        });
    }, { threshold: 0.3 });

    obs.observe(sec);
})();


/* ═══════════════════════════════════════════════════
   MOBILE NAV DRAWER
═══════════════════════════════════════════════════ */
(function initMobileNav() {
    var overlay = document.getElementById('mob-overlay');
    var drawer = document.getElementById('mob-drawer');
    var ham = document.getElementById('n-ham');
    var closeX = document.getElementById('drawer-x');
    if (!overlay || !drawer) return;

    function openDrawer() { drawer.classList.add('open'); overlay.classList.add('open'); }
    function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); }

    if (ham) ham.addEventListener('click', openDrawer);
    if (closeX) closeX.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.querySelectorAll('.drawer-a').forEach(function (a) {
        a.addEventListener('click', closeDrawer);
    });
})();


/* ═══════════════════════════════════════════════════
   SMOOTH SCROLL — btn-ghost "Learn more"
═══════════════════════════════════════════════════ */
(function initScrollBtns() {
    document.querySelectorAll('[data-scroll-to]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = document.getElementById(btn.getAttribute('data-scroll-to'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
})();


/* ═══════════════════════════════════════════════════
   COPY PHONE NUMBER
═══════════════════════════════════════════════════ */
(function initCopyPhone() {
    var btn = document.getElementById('copy-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
        navigator.clipboard.writeText('+96896687703').then(function () {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function () {
                btn.textContent = 'Copy Number';
                btn.classList.remove('copied');
            }, 2000);
        }).catch(function () {
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = 'Copy Number'; }, 1500);
        });
    });
})();


/* ═══════════════════════════════════════════════════
   ENQUIRY FORM
   Basic validation → success state
═══════════════════════════════════════════════════ */
(function initForm() {
    var submitBtn = document.getElementById('cf-submit');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', function () {
        var nameInp = document.getElementById('cf-name');
        var emailInp = document.getElementById('cf-email');
        var msgInp = document.getElementById('cf-msg');
        var valid = true;

        [nameInp, emailInp, msgInp].forEach(function (inp) {
            if (!inp || !inp.value.trim()) {
                if (inp) {
                    inp.style.borderColor = 'rgba(180, 50, 50, .55)';
                    inp.style.boxShadow = '0 0 0 3px rgba(180, 50, 50, .06)';
                    setTimeout(function () {
                        inp.style.borderColor = '';
                        inp.style.boxShadow = '';
                    }, 2000);
                }
                valid = false;
            }
        });

        if (!valid) return;

        var wrap = document.getElementById('cf-wrap');
        var success = document.getElementById('cf-success');
        if (wrap) wrap.style.display = 'none';
        if (success) success.style.display = 'block';
    });
})();