/* ============================================================
   STUDIO PIXEL — Interações
   ============================================================ */

(function () {
  "use strict";

  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- 1. NAVBAR SCROLL ---------- */
  const navbar = document.getElementById("navbar");

  function onScroll() {
    const scrollTop = window.scrollY;
    if (scrollTop > 40) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");

    updateNavCompact();
    onParallaxScroll();
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 2. MENU MOBILE ---------- */
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");

  if (menuToggle && nav) {
    // Cria o overlay de fundo
    const backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function openMenu() {
      nav.classList.add("open");
      menuToggle.classList.add("open");
      backdrop.classList.add("open");
      menuToggle.setAttribute("aria-label", "Fechar menu");
      document.body.style.overflow = "hidden";
    }
    function closeMenu() {
      nav.classList.remove("open");
      menuToggle.classList.remove("open");
      backdrop.classList.remove("open");
      menuToggle.setAttribute("aria-label", "Abrir menu");
      document.body.style.overflow = "";
    }

    menuToggle.addEventListener("click", () => {
      nav.classList.contains("open") ? closeMenu() : openMenu();
    });

    backdrop.addEventListener("click", closeMenu);

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Fecha com ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) closeMenu();
    });

    // Fecha se redimensionar para desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- 2.1 INDICADOR ANIMADO ---------- */
  const navPillEl = document.querySelector(".nav--pill");
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));

  const navIndicator = document.createElement("span");
  navIndicator.className = "nav__indicator";
  if (navPillEl) navPillEl.prepend(navIndicator);

  function moveIndicatorTo(link) {
    if (!navIndicator || !link || !navPillEl) return;
    if (window.innerWidth <= 900) return;

    const pillRect = navPillEl.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const leftPos = linkRect.left - pillRect.left;
    const rightPos = pillRect.right - linkRect.right;

    navIndicator.style.clipPath = `inset(6px ${rightPos}px 6px ${leftPos}px round 100px)`;
    navIndicator.classList.add("active");
  }

  function pinLink(link) {
    navLinks.forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");
    moveIndicatorTo(link);
  }

  navLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => {
      if (!navPillEl.querySelector(".is-active")) {
        moveIndicatorTo(link);
      }
    });
  });

  if (navPillEl) {
    navPillEl.addEventListener("mouseleave", () => {
      const active = navPillEl.querySelector(".is-active");
      if (active) moveIndicatorTo(active);
      else navIndicator.classList.remove("active");
    });
  }

  /* ---------- 2.2 SCROLL SUAVE ---------- */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  function smoothScrollTo(targetY) {
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    const dist = Math.abs(distance);
    const duration = Math.min(600, Math.max(380, 300 + dist * 0.12));
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navLink = anchor.classList.contains("nav__link")
        ? anchor
        : navLinks.find((l) => l.getAttribute("href") === href);
      if (navLink) pinLink(navLink);

      // Altura real da navbar no momento do clique + respiro extra
      const navbarH = navbar ? navbar.getBoundingClientRect().height : 0;
      const offset = navbarH + 24; // respiro para a seção não colar no topo
      const targetY = target.getBoundingClientRect().top + window.scrollY - offset;

      smoothScrollTo(targetY);
      history.pushState(null, "", href);
    });
  });

  /* ---------- 2.3 SCROLL SPY ---------- */
  const sectionIds = ["top", "portfolio"];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  function setActiveLink(id) {
    const link = navLinks.find((l) => l.getAttribute("href") === `#${id}`);
    if (link) pinLink(link);
  }

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- 3. BOTÕES MAGNÉTICOS ---------- */
  const magnetics = document.querySelectorAll(".magnetic");
  if (!isTouch) {
    magnetics.forEach((el) => {
      let rafId = null;
      let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

      function loop() {
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        el.style.transform = `translate(${currentX}px, ${currentY}px)`;
        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          rafId = requestAnimationFrame(loop);
        } else {
          rafId = null;
        }
      }

      el.addEventListener("mouseenter", () => el.classList.add("is-hovering"));
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        targetX = (e.clientX - rect.left - rect.width / 2) * 0.25;
        targetY = (e.clientY - rect.top - rect.height / 2) * 0.35;
        if (!rafId) rafId = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", () => {
        el.classList.remove("is-hovering");
        targetX = 0; targetY = 0;
        if (!rafId) rafId = requestAnimationFrame(loop);
      });
    });
  }

  /* ---------- 4. REVEAL ON SCROLL ---------- */
  const revealEls = document.querySelectorAll(".reveal:not(.hero .reveal)");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => entry.target.classList.add("visible"), Number(delay));
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("visible");
    });
  }, 100);

  /* ---------- 5. SPOTLIGHT NOS CARDS ---------- */
  if (!isTouch) {
    document.querySelectorAll(".spotlight-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- 6. PARALLAX ---------- */
  const bgLayers = document.querySelectorAll(".bg-layer");
  const siteBg = document.querySelector(".site-bg");

  function resizeSiteBg() {
    if (siteBg) siteBg.style.height = document.body.scrollHeight + "px";
  }
  window.addEventListener("load", resizeSiteBg);
  window.addEventListener("resize", resizeSiteBg);
  setTimeout(resizeSiteBg, 300);

  function onParallaxScroll() {
    const scrollY = window.scrollY;
    bgLayers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0.3;
      layer.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
    });
  }

  /* ---------- 7. NAV COMPACTA ---------- */
  const navPill = document.querySelector(".nav--pill");
  function updateNavCompact() {
    if (navPill) navPill.classList.toggle("nav--compact", window.scrollY > 600);
  }

  /* ---------- 8. GLOBO TERRESTRE ---------- */
  (function initGlobe() {
    const svgEl = document.getElementById("globeSvg");
    if (!svgEl || typeof d3 === "undefined" || typeof topojson === "undefined") return;

    const width = 560, height = 560;
    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
    const projection = d3.geoOrthographic().scale(width * 0.46).translate([width / 2, height / 2]).rotate([0, -20]).clipAngle(90).precision(0.5);
    const path = d3.geoPath().projection(projection);

    svg.append("circle").attr("cx", width / 2).attr("cy", height / 2).attr("r", projection.scale()).attr("fill", "rgba(232,255,90,0.03)").attr("stroke", "rgba(232,255,90,0.18)").attr("stroke-width", 1);
    svg.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", path).attr("fill", "none").attr("stroke", "rgba(255,255,255,0.06)").attr("stroke-width", 0.5);

    const countriesGroup = svg.append("g").attr("class", "countries");

    let isDragging = false, lastX = 0, lastY = 0;
    let rotX = 0, rotY = -20, targetRotX = 0, targetRotY = -20, lastInteract = 0;

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((world) => {
      const countries = topojson.feature(world, world.objects.countries).features;
      countriesGroup.selectAll("path").data(countries).join("path").attr("class", "country").attr("d", path).attr("fill", "rgba(232,255,90,0.12)").attr("stroke", "rgba(232,255,90,0.35)").attr("stroke-width", 0.4).attr("vector-effect", "non-scaling-stroke");
    }).catch((err) => console.warn("Erro ao carregar países:", err));

    function updateProjection() {
      projection.rotate([rotX, rotY]);
      countriesGroup.selectAll("path").attr("d", path);
      svg.select(".graticule").attr("d", path);
    }

    function animate() {
      if (!isDragging && performance.now() - lastInteract > 3000) targetRotX += 0.05;
      rotX += (targetRotX - rotX) * 0.05;
      rotY += (targetRotY - rotY) * 0.05;
      updateProjection();
      requestAnimationFrame(animate);
    }

    svgEl.addEventListener("pointerdown", (e) => {
      isDragging = true; lastInteract = performance.now();
      lastX = e.clientX; lastY = e.clientY;
      svgEl.setPointerCapture(e.pointerId);
    });

    svgEl.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      targetRotX += (e.clientX - lastX) * 0.25;
      targetRotY += (e.clientY - lastY) * 0.25;
      targetRotY = Math.max(-60, Math.min(60, targetRotY));
      lastX = e.clientX; lastY = e.clientY; lastInteract = performance.now();
    });

    function onPointerUp(e) {
      isDragging = false; lastInteract = performance.now();
      if (svgEl.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
    }
    svgEl.addEventListener("pointerup", onPointerUp);
    svgEl.addEventListener("pointercancel", onPointerUp);
    requestAnimationFrame(animate);
  })();

  /* ---------- 9. INICIALIZAÇÃO ---------- */
  if (navLinks.length > 0) {
    pinLink(navLinks[0]);
  }
  onScroll();
})();
