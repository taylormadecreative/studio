/* Taylormade Creative — site.js */
(function () {
  "use strict";

  /* JS is alive: allow reveal-hiding (content is visible-by-default without JS) */
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- nav scroll state ---- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- mobile menu ---- */
  var toggle = document.getElementById("navToggle");
  var sheet = document.getElementById("mobileSheet");
  if (toggle && sheet) {
    var setMenu = function (open) {
      sheet.classList.toggle("open", open);
      if (nav) nav.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () {
      setMenu(!sheet.classList.contains("open"));
    });
    sheet.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("open")) { setMenu(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860 && sheet.classList.contains("open")) setMenu(false);
    }, { passive: true });
  }

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- work filters ---- */
  var filterBtns = document.querySelectorAll(".work-filters button");
  var items = document.querySelectorAll(".work-item");
  if (filterBtns.length && items.length) {
    filterBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.classList.contains("active") ? "true" : "false");
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        var f = btn.getAttribute("data-filter");
        items.forEach(function (it) {
          var show = f === "all" || it.getAttribute("data-cat") === f;
          it.classList.toggle("hide", !show);
        });
      });
    });
  }

  /* ---- lightbox ---- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbClose = document.getElementById("lbClose");
  if (lb && lbImg && lbClose && items.length) {
    var lastFocus = null;
    var openLb = function (src, alt) {
      lastFocus = document.activeElement;
      lbImg.src = src; lbImg.alt = alt || "";
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      lbClose.focus();
      document.body.style.overflow = "hidden";
    };
    var closeLb = function () {
      lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
      lbImg.removeAttribute("src"); document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    };
    items.forEach(function (it) {
      var img = it.querySelector("img");
      if (!img) return;
      it.setAttribute("tabindex", "0");
      it.setAttribute("role", "button");
      var fire = function () { openLb(img.getAttribute("src"), img.getAttribute("alt")); };
      it.addEventListener("click", fire);
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); }
      });
    });
    lbClose.addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("open")) closeLb();
    });
  }

  /* ---- sticky mobile CTA: appears after the hero, hides near the booking form ---- */
  var sticky = document.getElementById("stickyCta");
  var hero = document.querySelector(".hero");
  var book = document.getElementById("book") || document.getElementById("quote");
  if (sticky && hero) {
    var updateSticky = function () {
      var pastHero = window.scrollY > hero.offsetHeight - 80;
      var nearBook = false;
      if (book) {
        var r = book.getBoundingClientRect();
        nearBook = r.top < window.innerHeight && r.bottom > 0;
      }
      var show = pastHero && !nearBook;
      sticky.classList.toggle("show", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
    };
    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });
  }

  /* ---- year ---- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
