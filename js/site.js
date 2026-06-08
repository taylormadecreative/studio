/* Taylormade Creative — site.js */
(function () {
  "use strict";

  /* ---- nav scroll state ---- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- mobile menu ---- */
  var toggle = document.getElementById("navToggle");
  var sheet = document.getElementById("mobileSheet");
  var setMenu = function (open) {
    sheet.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", function () {
    setMenu(!sheet.classList.contains("open"));
  });
  sheet.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });

  /* ---- scroll reveal ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      items.forEach(function (it) {
        var show = f === "all" || it.getAttribute("data-cat") === f;
        it.classList.toggle("hide", !show);
      });
    });
  });

  /* ---- lightbox ---- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbClose = document.getElementById("lbClose");
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
    lbImg.src = ""; document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };
  items.forEach(function (it) {
    var img = it.querySelector("img");
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

  /* ---- year ---- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
