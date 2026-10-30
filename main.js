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

  // collections carousel: arrows, dots, swipe, and a gentle auto-advance every 4s
  var rail = $("#rail"), tiles = $$(".tile", rail), rdots = $(".rail-dots");
  var prev = $('[data-rail="prev"]'), next = $('[data-rail="next"]');
  var step = function () { return tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : rail.clientWidth; };
  var atEnd = function () { return rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4; };
  var index = function () { return Math.round(rail.scrollLeft / step()); };
  var go = function (i) { rail.scrollTo({ left: Math.max(0, i) * step(), behavior: "smooth" }); };
  tiles.forEach(function (t, i) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", "Show " + t.textContent.trim());
    b.addEventListener("click", function () { go(i); hold(); });
    rdots.appendChild(b);
  });
  var rbtns = $$("button", rdots);
  var syncRail = function () {
    var i = atEnd() ? tiles.length - 1 : index();
    prev.disabled = rail.scrollLeft < 4;
    rbtns.forEach(function (b, j) { b.classList.toggle("is-on", j === i); });
  };
  var advance = function () { if (atEnd()) go(0); else go(index() + 1); };
  prev.addEventListener("click", function () { go(index() - 1); hold(); });
  next.addEventListener("click", function () { advance(); hold(); });
  rail.addEventListener("scroll", syncRail, { passive: true });
  syncRail();

  // auto-advance only while the rail is on screen and nobody is touching it
  var railTimer = null, railSeen = false, railHeld = 0;
  var tick = function () { if (railSeen && Date.now() > railHeld && !document.hidden) advance(); };
  var hold = function () { railHeld = Date.now() + 8000; };
  ["pointerdown", "touchstart", "wheel"].forEach(function (ev) { rail.addEventListener(ev, hold, { passive: true }); });
  rail.addEventListener("mouseenter", function () { railHeld = Infinity; });
  rail.addEventListener("mouseleave", hold);
  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { railSeen = es[0].isIntersecting; }, { threshold: 0.5 }).observe(rail);
    railTimer = setInterval(tick, 4000);
  }

  // bridal sets: gold pill slides between sets; each set's photos crossfade every 4.5s,
  // tapping a thumbnail or swiping the photo jumps, and the timer rests for a while after a touch
  var setTabs = $$(".sets__tabs button"), pill = $(".sets__pill"), setsBox = $("#sets");
  var DELAY = 4500, setTimer = null, setHeld = 0, setsSeen = false, active = null;
  var placePill = function (tab) {
    pill.style.width = tab.offsetWidth + "px";
    pill.style.transform = "translateX(" + tab.offsetLeft + "px)";
  };
  var setsApi = $$(".set").map(function (set) {
    var photos = $$(".set__photo img", set), thumbs = $$(".set__thumbs button", set), bar = $(".set__progress i", set), cur = 0;
    var restartBar = function () {
      bar.classList.remove("is-running"); void bar.offsetWidth;
      if (!reduced) { bar.style.setProperty("--set-delay", DELAY + "ms"); bar.classList.add("is-running"); }
    };
    var show = function (i) {
      cur = (i + photos.length) % photos.length;
      photos.forEach(function (p, k) { p.classList.toggle("is-on", k === cur); });
      thumbs.forEach(function (b, k) { b.classList.toggle("is-on", k === cur); });
      restartBar();
    };
    thumbs.forEach(function (b, i) { b.addEventListener("click", function () { show(i); setHeld = Date.now() + 9000; }); });
    var x0 = null, stage = $(".set__photo", set);
    stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { show(cur + (dx < 0 ? 1 : -1)); setHeld = Date.now() + 9000; }
    });
    return { el: set, show: show, next: function () { show(cur + 1); }, open: function () {
      set.hidden = false; set.classList.add("is-active");
      requestAnimationFrame(function () { requestAnimationFrame(function () { set.classList.add("is-shown"); }); });
      show(0);
    }, close: function () { set.hidden = true; set.classList.remove("is-active", "is-shown"); } };
  });
  active = setsApi[0];
  setTabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      setTabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on); });
      placePill(tab);
      tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
      if (active !== setsApi[i]) { active.close(); active = setsApi[i]; active.open(); }
      setHeld = Date.now() + 6000;
    });
  });
  var settle = function () { placePill($(".sets__tabs button.is-on")); };
  addEventListener("resize", settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  settle();
  active.open();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { setsSeen = es[0].isIntersecting; }, { threshold: 0.35 }).observe(setsBox);
  }
  if (!reduced) setTimer = setInterval(function () {
    if (setsSeen && !document.hidden && Date.now() > setHeld) active.next();
  }, DELAY);

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

  // today's Coimbatore / Chennai retail rate via /api/rates; nothing is shown if it cannot be loaded
  var inr = function (n) { return "₹" + Math.round(n).toLocaleString("en-IN"); };
  fetch("/api/rates", { headers: { accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      if (!d || !d.gold22) throw new Error("incomplete");
      var ann = $("#ann-rate");
      ann.textContent = "Today's 22K gold " + inr(d.gold22) + "/g";
      ann.hidden = false;
      $("#trust-rate").textContent = "22K gold is " + inr(d.gold22) + " per gram today in " + d.city + ", " + d.date + ". Before GST and making charges.";
      $("#rates-mini").innerHTML =
        "<dt>22 Karat</dt><dd>" + inr(d.gold22) + "/g</dd>" +
        "<dt>24 Karat</dt><dd>" + inr(d.gold24) + "/g</dd>" +
        (d.gold18 ? "<dt>18 Karat</dt><dd>" + inr(d.gold18) + "/g</dd>" : "") +
        (d.silver ? "<dt>Silver</dt><dd>" + inr(d.silver) + "/g</dd>" : "");
      $("#rates-note").textContent = d.city + " rate for " + d.date + ", per gram, before GST and making charges.";
    })
    .catch(function () {
      $("#rates-mini").innerHTML = '<dt>Call us</dt><dd><a href="tel:+' + PHONE + '">+91 80726 79578</a></dd>';
      $("#rates-note").textContent = "Today's rate could not be loaded just now.";
    });
})();
