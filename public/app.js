const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const desktopPointerQuery = window.matchMedia("(min-width: 769px) and (hover: hover) and (pointer: fine)");
const reduceMotion = reduceMotionQuery.matches;

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

// GA4-ready event helper. It is intentionally inert until a real gtag setup is added.
const trackEvent = (eventName, parameters = {}) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, parameters);
};
window.automateMeTrackEvent = trackEvent;

const header = $(".site-header");
const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");
const scrollProgress = $("#scrollProgress");

const closeMenu = () => {
  mainNav?.classList.remove("open");
  menuToggle?.classList.remove("active");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation");
  document.body.classList.remove("menu-open");
};

menuToggle?.addEventListener("click", () => {
  const open = !mainNav?.classList.contains("open");
  mainNav?.classList.toggle("open", open);
  menuToggle.classList.toggle("active", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  document.body.classList.toggle("menu-open", open);
});

$$('.nav-links a').forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("pointerdown", (event) => {
  if (!mainNav?.classList.contains("open")) return;
  const target = event.target;
  if (mainNav.contains(target) || menuToggle?.contains(target)) return;
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mainNav?.classList.contains("open")) {
    closeMenu();
    menuToggle?.focus();
  }
});

let scrollFrame = 0;
const updateScrollUI = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollRange > 0 ? Math.min(scrollTop / scrollRange, 1) : 0;

  header?.classList.toggle("scrolled", scrollTop > 30);
  // Use GPU-friendly transform on the progress element if present
  if (scrollProgress) {
    scrollProgress.style.transform = `scaleX(${progress})`;
    scrollProgress.style.transformOrigin = 'left center';
  }
  scrollFrame = 0;
};

const requestScrollUI = () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollUI);
};

window.addEventListener("scroll", requestScrollUI, { passive: true });
window.addEventListener("resize", requestScrollUI, { passive: true });
updateScrollUI();

const query = new URLSearchParams(location.search);
["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
  const field = document.querySelector(`[name="${key}"]`);
  if (field) field.value = query.get(key) || "";
});

const landingPage = document.querySelector('[name="landing_page"]');
if (landingPage) landingPage.value = location.href;

async function submitLead(payload, statusElement) {
  if (statusElement) {
    statusElement.textContent = "Submitting your enquiry...";
    statusElement.className = "form-status";
  }

  try {
    const scriptUrl = window.AUTOMATE_ME_CONFIG?.GOOGLE_SCRIPT_URL?.trim() || "";
    const validScriptUrl = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(scriptUrl);
    if (!validScriptUrl || scriptUrl.includes("PASTE_GOOGLE_APPS_SCRIPT_URL_HERE")) {
      throw new Error("The enquiry form is not configured yet. Please contact us on WhatsApp.");
    }

    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      body.set(key, value == null ? "" : String(value));
    });

    // no-cors plus URL-encoded data avoids an Apps Script preflight. Apps Script
    // responses are opaque cross-origin, so a resolved request means accepted.
    const response = await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      credentials: "omit",
      body
    });

    if (response.type !== "opaque" && !response.ok) {
      throw new Error("Could not submit your enquiry.");
    }

    if (statusElement) {
      statusElement.textContent = "Thank you! We've received your enquiry and will contact you soon.";
      statusElement.className = "form-status success form-success-message";
    }
    return true;
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = error.message || "Something went wrong. Please try again or contact us on WhatsApp.";
      statusElement.className = "form-status error form-error-message";
    }
    return false;
  }
}

function validateField(input) {
  const label = input.closest("label") || input.parentElement;
  let errorEl = label.querySelector(".field-error");

  let message = "";
  if (input.validity.valueMissing) {
    if (input.type === "checkbox") {
      message = "Please agree to the consent terms before submitting.";
    } else if (input.tagName.toLowerCase() === "select") {
      message = "Please select an option.";
    } else {
      const fieldName = input.name === "name" ? "name" : input.name === "message" ? "project requirements" : input.name || "field";
      message = `Please enter your ${fieldName}.`;
    }
  } else if (input.type === "tel" && input.value.trim() && !/^[\d\s\+\-\(\)]{7,}$/.test(input.value.trim())) {
    message = "Please enter a valid phone number.";
  } else if (input.type === "email" && input.value.trim() && !input.checkValidity()) {
    message = "Please enter a valid email address.";
  }

  if (message) {
    input.classList.add("invalid");
    label.classList.add("has-error");
    if (!errorEl) {
      errorEl = document.createElement("span");
      errorEl.className = "field-error";
      errorEl.setAttribute("role", "alert");
      label.appendChild(errorEl);
    }
    errorEl.textContent = message;
    return false;
  } else {
    clearFieldError(input);
    return true;
  }
}

function clearFieldError(input) {
  const label = input.closest("label") || input.parentElement;
  const errorEl = label.querySelector(".field-error");
  input.classList.remove("invalid");
  label.classList.remove("has-error");
  if (errorEl) {
    errorEl.remove();
  }
}

const leadForm = $("#lead-form");

leadForm?.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => clearFieldError(field));
  field.addEventListener("change", () => clearFieldError(field));
});

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  let isValid = true;
  requiredFields.forEach((field) => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  if (!isValid) {
    const firstInvalid = form.querySelector(".invalid");
    firstInvalid?.focus();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  if (data.website) return;

  data.source = "website_full_form";
  data.submitted_at = new Date().toISOString();
  data.landing_page = data.landing_page || location.href;
  data.referrer = document.referrer;
  data.consent = data.consent === "true" ? "true" : "false";

  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button?.querySelector(".submit-label");
  const originalLabel = "Submit Project Enquiry";

  if (button) {
    button.disabled = true;
    button.classList.add("is-submitting");
  }
  if (buttonLabel) buttonLabel.textContent = "Submitting...";

  const submitted = await submitLead(data, $("#formStatus"));

  if (!submitted) {
    button?.classList.remove("is-submitting");
    if (button) button.disabled = false;
    if (buttonLabel) buttonLabel.textContent = originalLabel;
    return;
  }

  button?.classList.remove("is-submitting");
  button?.classList.add("is-success");
  if (buttonLabel) buttonLabel.textContent = "✓ Enquiry Submitted";
  trackEvent("generate_lead", { form_id: "lead-form" });

  const attribution = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
    attribution[key] = data[key] || "";
  });

  form.reset();
  Object.entries(attribution).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) field.value = value;
  });
  const refreshedLandingPage = form.querySelector('[name="landing_page"]');
  if (refreshedLandingPage) refreshedLandingPage.value = location.href;

  window.setTimeout(() => {
    button?.classList.remove("is-success");
    if (button) button.disabled = false;
    if (buttonLabel) buttonLabel.textContent = originalLabel;
  }, 3000);
});

$$('a[href="#lead-form"]').forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("click_free_consultation", {
      link_location: link.closest("section")?.id || "sitewide"
    });
  });
});

$$('a[href^="https://wa.me/"]').forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("click_whatsapp", {
      link_location: link.closest("section")?.id || "sitewide"
    });
  });
});

leadForm?.addEventListener("focusin", () => {
  trackEvent("lead_form_start", { form_id: "lead-form" });
}, { once: true });

$$('.faq-list details').forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    $$('.faq-list details').forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

// Add classes for smoother FAQ animations so CSS can animate without layout jumps
$$('.faq-list details').forEach((detail) => {
  const summary = detail.querySelector('summary');
  const answer = detail.querySelector('p');
  if (!summary || !answer) return;

  detail.addEventListener('toggle', () => {
    if (detail.open) {
      summary.classList.add('is-open');
      answer.style.display = 'block';
      // Allow CSS transition to run
      requestAnimationFrame(() => answer.classList.add('is-visible'));
    } else {
      summary.classList.remove('is-open');
      answer.classList.remove('is-visible');
      // Wait for transition then hide to preserve layout
      const hide = () => { answer.style.display = ''; answer.removeEventListener('transitionend', hide); };
      answer.addEventListener('transitionend', hide);
    }
  });
});

const staggerGroups = [
  ".value-grid article",
  ".deliverable-list > div",
  ".why-list > div",
  ".contact-list a",
  ".faq-list details"
];
staggerGroups.forEach((selector) => {
  $$(selector).forEach((element) => element.classList.add("reveal-card"));
});

const processGrid = $(".process-grid");
const trustStrip = $(".trust-strip");
const revealElements = $$(".reveal, .reveal-card").filter(
  (element) => !element.matches(".hero-copy, .hero-visual")
);

const revealImmediately = () => {
  revealElements.forEach((element) => element.classList.add("is-visible"));
  processGrid?.classList.add("is-visible");
  document.documentElement.classList.add("hero-loaded");
};

const animateCounter = (element, target, suffix = "") => {
  if (!element) return;
  const duration = 900;
  const start = performance.now();
  const tick = (now) => {
    const elapsed = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    element.textContent = `${Math.round(target * eased)}${suffix}`;
    if (elapsed < 1) requestAnimationFrame(tick);
  };
  element.textContent = `0${suffix}`;
  requestAnimationFrame(tick);
};

const prepareTrustCounters = () => {
  if (!trustStrip) return null;
  const values = $$("strong", trustStrip);
  values.slice(2).forEach((value) => value.classList.add("soft-stat"));

  return () => {
    animateCounter(values[0], 10, "+");
    animateCounter(values[1], 4);
    values.slice(2).forEach((value, index) => {
      window.setTimeout(() => value.classList.add("is-visible"), index * 90);
    });
  };
};

const setupMotion = () => {
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealImmediately();
    return;
  }

  const runTrustCounters = prepareTrustCounters();
  let trustCountersRan = false;

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

  revealElements.forEach((element) => revealObserver.observe(element));

  if (processGrid) {
    const processObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0]?.isIntersecting) return;
      processGrid.classList.add("is-visible");
      observer.disconnect();
    }, { threshold: 0.2 });
    processObserver.observe(processGrid);
  }

  if (trustStrip && runTrustCounters) {
    const trustObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0]?.isIntersecting || trustCountersRan) return;
      trustCountersRan = true;
      runTrustCounters();
      observer.disconnect();
    }, { threshold: 0.35 });
    trustObserver.observe(trustStrip);
  }

  document.documentElement.classList.add("motion-ready");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.documentElement.classList.add("hero-loaded"));
  });
};

const setupDashboardParallax = () => {
  if (reduceMotion || !desktopPointerQuery.matches) return;
  const card = $(".tilt-card");
  if (!card) return;

  let parallaxFrame = 0;
  let rotateX = 0;
  let rotateY = 0;

  const renderParallax = () => {
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    parallaxFrame = 0;
  };

  card.addEventListener("pointermove", (event) => {
    const bounds = card.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateX = Number((-relativeY * 4).toFixed(2));
    rotateY = Number((relativeX * 6).toFixed(2));
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(renderParallax);
  });

  card.addEventListener("pointerleave", () => {
    rotateX = 0;
    rotateY = 0;
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(renderParallax);
    window.setTimeout(() => {
      if (rotateX === 0 && rotateY === 0) card.style.transform = "";
    }, 240);
  });
};

const setupMagneticCTA = () => {
  if (reduceMotion || !desktopPointerQuery.matches) return;
  const button = $(".magnetic-cta");
  if (!button) return;

  let magneticFrame = 0;
  let translateX = 0;
  let translateY = 0;

  const renderMagneticPosition = () => {
    button.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    magneticFrame = 0;
  };

  button.addEventListener("pointermove", (event) => {
    const bounds = button.getBoundingClientRect();
    translateX = Number((((event.clientX - bounds.left) / bounds.width - 0.5) * 10).toFixed(2));
    translateY = Number((((event.clientY - bounds.top) / bounds.height - 0.5) * 8).toFixed(2));
    if (!magneticFrame) magneticFrame = requestAnimationFrame(renderMagneticPosition);
  });

  button.addEventListener("pointerleave", () => {
    translateX = 0;
    translateY = 0;
    if (!magneticFrame) magneticFrame = requestAnimationFrame(renderMagneticPosition);
    window.setTimeout(() => {
      if (translateX === 0 && translateY === 0) button.style.transform = "";
    }, 220);
  });
};

setupMotion();
setupDashboardParallax();
setupMagneticCTA();

// WhatsApp floating pulse control: add pulse class, pause on hover/focus (respect reduced-motion)
(() => {
  const btn = document.querySelector('.floating-whatsapp');
  if (!btn) return;
  if (reduceMotion) return;

  // Start with pulse enabled
  btn.classList.add('pulse');

  let reenableTimer = null;
  const disablePulse = () => {
    btn.classList.remove('pulse');
    if (reenableTimer) { clearTimeout(reenableTimer); reenableTimer = null; }
  };
  const scheduleEnable = (delay = 900) => {
    if (reenableTimer) clearTimeout(reenableTimer);
    reenableTimer = setTimeout(() => btn.classList.add('pulse'), delay);
  };

  btn.addEventListener('pointerenter', disablePulse);
  btn.addEventListener('pointerleave', () => scheduleEnable(900));
  btn.addEventListener('focusin', disablePulse);
  btn.addEventListener('focusout', () => scheduleEnable(900));
})();

// Spotlight mouse-following effect (desktop only) and respect reduced-motion
(()=>{
  if (reduceMotion || !desktopPointerQuery.matches) return;
  const selectors = ['.service-card', '.domain-card', '.tech-grid article'];
  const elements = selectors.flatMap(s => [...document.querySelectorAll(s)]);
  if (!elements.length) return;

  elements.forEach((el) => {
    el.classList.add('spotlight');
    // ensure overflow:hidden is set
    el.style.overflow = el.style.overflow || 'hidden';

    let rafId = 0;
    let mouseX = '50%';
    let mouseY = '50%';
    const setVars = () => {
      el.style.setProperty('--mouse-x', mouseX);
      el.style.setProperty('--mouse-y', mouseY);
      rafId = 0;
    };

    const onPointerMove = (ev) => {
      const rect = el.getBoundingClientRect();
      const rx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const ry = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
      mouseX = (rx * 100).toFixed(2) + '%';
      mouseY = (ry * 100).toFixed(2) + '%';
      el.classList.add('is-active');
      if (!rafId) rafId = requestAnimationFrame(setVars);
    };

    const onPointerLeave = () => {
      mouseX = '50%';
      mouseY = '50%';
      el.classList.remove('is-active');
      if (!rafId) rafId = requestAnimationFrame(setVars);
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onPointerLeave);

    // For keyboard focus/show, reveal center spotlight briefly
    el.addEventListener('focusin', () => {
      el.classList.add('is-active');
      mouseX = '50%'; mouseY = '50%';
      if (!rafId) rafId = requestAnimationFrame(setVars);
      window.setTimeout(() => el.classList.remove('is-active'), 700);
    });
  });
})();

// Hero entrance animation: stagger eyebrow → headline → paragraph → CTAs → points → project board
(()=>{
  let heroAnimated = false;
  const animateHeroEntrance = () => {
    if (heroAnimated) return;
    heroAnimated = true;

    document.querySelectorAll('.hero-copy, .hero-visual').forEach(el => el.classList.add('is-visible'));

    // Respect reduced motion preference
    if (reduceMotion) {
      document.querySelectorAll('.hero-copy .eyebrow, .hero-copy h1, .hero-copy .hero-text, .hero-copy .hero-actions, .hero-copy .hero-points, .project-board').forEach(el => el.classList.add('is-visible'));
      return;
    }

    const eyebrow = document.querySelector('.hero-copy .eyebrow');
    const headline = document.querySelector('.hero-copy h1');
    const para = document.querySelector('.hero-copy .hero-text');
    const ctas = document.querySelector('.hero-copy .hero-actions');
    const points = document.querySelector('.hero-copy .hero-points');
    const board = document.querySelector('.project-board');

    const items = [eyebrow, headline, para, ctas, points, board].filter(Boolean);

    items.forEach(el => el.classList.add('hero-animate'));

    // Stagger ~100ms (within requested 80-120ms). Keep total < ~800ms.
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('is-visible'), i * 100);
    });

    // After entrance, add very subtle floating to the board
    if (board) setTimeout(() => board.classList.add('board-float'), items.length * 100 + 450);
  };

  const mo = new MutationObserver(() => {
    if (document.documentElement.classList.contains('hero-loaded')) {
      animateHeroEntrance();
      mo.disconnect();
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
