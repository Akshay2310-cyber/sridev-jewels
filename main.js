(function () {
  "use strict";

  var PHONE = "918072679578";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // WhatsApp links carry a prefilled message from data-wa
  $$("[data-wa]").forEach(function (a) {
    var text = a.getAttribute("data-wa") || "Hello Sri Dev Jewels, I would like to know more about your jewellery.";
    a.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
    a.target = "_blank";
    a.rel = "noopener";
  });
  $$(".year").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // header shrinks once you scroll
  var header = $("#header");
  var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 40); };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // mobile drawer
  var drawer = $("#drawer"), burger = $(".burger");
  var setDrawer = function (open) {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", function () { setDrawer(true); });
  drawer.addEventListener("click", function (e) { if (e.target.closest("[data-close], a")) setDrawer(false); });
  addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawer(false); });

  // hero slideshow
  var slides = $$(".slide"), dots = $$(".dots button"), current = 0, timer = null;
  var show = function (i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, j) { s.classList.toggle("is-active", j === current); });
    dots.forEach(function (d, j) {
      d.classList.remove("is-active");
      if (j === current) { void d.offsetWidth; d.classList.add("is-active"); }
      d.setAttribute("aria-selected", String(j === current));
    });
  };
  var play = function () { clearInterval(timer); if (!reduced) timer = setInterval(function () { show(current + 1); }, 6000); };
  dots.forEach(function (d, j) { d.addEventListener("click", function () { show(j); play(); }); });
  var hero = $(".hero");
  var x0 = null;
  hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { show(current + (dx < 0 ? 1 : -1)); play(); }
    x0 = null;
  });
  show(0);
  play();

  // collections rail arrows
  var rail = $("#rail");
  var prev = $('[data-rail="prev"]'), next = $('[data-rail="next"]');
  var step = function () { var t = $(".tile", rail); return t ? t.getBoundingClientRect().width + 3 : 300; };
  var syncArrows = function () {
    prev.disabled = rail.scrollLeft < 4;
    next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  };
  prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); });
  next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); });
  rail.addEventListener("scroll", syncArrows, { passive: true });
  syncArrows();

  // trust row becomes a swipe carousel on phones; keep its dots in step
  var trust = $("#trust"), tdots = $$(".trust__dots i");
  trust.addEventListener("scroll", function () {
    var i = Math.round(trust.scrollLeft / trust.clientWidth);
    tdots.forEach(function (d, j) { d.classList.toggle("is-on", j === i); });
  }, { passive: true });

  // footer sections are accordions on phones, always open on desktop
  var mq = matchMedia("(max-width: 990px)");
  var syncDetails = function () { $$(".footer details").forEach(function (d) { d.open = !mq.matches; }); };
  syncDetails();
  mq.addEventListener("change", syncDetails);

  // today's rate (IBJA benchmark via /api/rates); nothing is shown if it cannot be loaded
  var inr = function (n) { return "₹" + Math.round(n).toLocaleString("en-IN"); };
  fetch("/api/rates", { headers: { accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      if (!d || !d.gold22 || !d.silver) throw new Error("incomplete");
      var ann = $("#ann-rate");
      ann.textContent = "Today's 22K gold " + inr(d.gold22) + "/g";
      ann.hidden = false;
      $("#trust-rate").textContent = "22K gold is " + inr(d.gold22) + " per gram today, " + d.date + ". IBJA benchmark, before GST and making charges.";
      $("#rates-mini").innerHTML =
        "<dt>22 Karat</dt><dd>" + inr(d.gold22) + "/g</dd>" +
        "<dt>24 Karat</dt><dd>" + inr(d.gold24) + "/g</dd>" +
        "<dt>18 Karat</dt><dd>" + inr(d.gold18) + "/g</dd>" +
        "<dt>Silver</dt><dd>" + inr(d.silver) + "/g</dd>";
      $("#rates-note").textContent = "IBJA benchmark for " + d.date + (d.session ? " " + d.session : "") + ", per gram, before GST and making charges.";
    })
    .catch(function () {
      $("#rates-mini").innerHTML = '<dt>Call us</dt><dd><a href="tel:+' + PHONE + '">+91 80726 79578</a></dd>';
      $("#rates-note").textContent = "Today's rate could not be loaded just now.";
    });
})();
