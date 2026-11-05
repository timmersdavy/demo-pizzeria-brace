(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var dataEl = document.getElementById("scene-data");
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var EXTRA = DATA._extra;

  var $ = function (id) { return document.getElementById(id); };
  var pizzaImg = $("pizza"), nowName = $("now-name"), nowDesc = $("now-desc"), nowPrice = $("now-price");
  var lines = $("bon-lines"), total = $("bon-total"), orderBtn = $("order"), live = $("live");
  var chiliBtn = $("chili"), timerDial = document.querySelector(".timer-dial"), timerMin = $("timer-min");
  var dialog = $("confirm");
  var picks = Array.prototype.slice.call(document.querySelectorAll(".pick"));

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var G = window.gsap && !reduce ? window.gsap : null;
  var fmt = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
  var money = function (v) { return fmt.format(v); };

  var current = picks.length ? picks[0].dataset.id : null;
  var cart = []; // {id, name, price, qty}
  var chili = false;
  var busy = false;

  // Grote beelden alvast inladen, zodat wisselen vlot gaat
  Object.keys(DATA).forEach(function (id) {
    if (id.charAt(0) === "_") return;
    var i = new Image(); i.src = "assets/img/" + id + ".webp";
  });

  function setText(id) {
    var p = DATA[id];
    nowName.textContent = p.name;
    nowDesc.textContent = p.desc;
    nowPrice.textContent = money(p.price);
    pizzaImg.alt = "Pizza " + p.name + " van bovenaf gezien";
  }

  function choose(id, btn) {
    if (id === current || busy) return;
    picks.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    var dir = picks.indexOf(btn) > picks.findIndex(function (b) { return b.dataset.id === current; }) ? 1 : -1;
    current = id;
    if (!G) { pizzaImg.src = "assets/img/" + id + ".webp"; setText(id); return; }
    busy = true;
    var tl = G.timeline({ onComplete: function () { busy = false; } });
    tl.to(pizzaImg, { xPercent: 130 * dir, rotation: 120 * dir, opacity: 0, duration: 0.35, ease: "power2.in" })
      .add(function () { pizzaImg.src = "assets/img/" + id + ".webp"; setText(id); })
      .fromTo(pizzaImg, { xPercent: -130 * dir, rotation: -160 * dir, opacity: 0 },
        { xPercent: 0, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(1.4)" })
      .fromTo([nowName, nowDesc], { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 }, "<0.1");
  }

  function minutes() {
    var pizzas = cart.filter(function (l) { return DATA[l.id]; });
    if (!pizzas.length) return 0;
    var count = pizzas.reduce(function (s, l) { return s + l.qty; }, 0);
    var base = Math.max.apply(null, pizzas.map(function (l) { return DATA[l.id].min; }));
    return Math.min(base + 2 * (count - 1), 30);
  }

  function render(announce) {
    lines.innerHTML = "";
    var all = cart.slice();
    if (chili) all.push({ id: EXTRA.id, name: EXTRA.name, price: EXTRA.price, qty: 1 });
    if (!all.length) {
      var e = document.createElement("li");
      e.className = "bon-empty";
      e.textContent = "Nog niets op je bon. Kies een pizza en tik op “In de doos”.";
      lines.appendChild(e);
    }
    var sum = 0;
    all.forEach(function (l) {
      sum += l.price * l.qty;
      var li = document.createElement("li");
      li.innerHTML = '<span class="qty"></span><span class="nm"></span><span class="pr"></span>';
      li.querySelector(".qty").textContent = l.qty + "×";
      li.querySelector(".nm").textContent = l.name;
      li.querySelector(".pr").textContent = money(l.price * l.qty);
      var rm = document.createElement("button");
      rm.type = "button"; rm.className = "rm"; rm.textContent = "−";
      rm.setAttribute("aria-label", "Eén " + l.name + " minder");
      rm.addEventListener("click", function () { remove(l.id); });
      li.appendChild(rm);
      lines.appendChild(li);
    });
    total.textContent = money(sum);
    orderBtn.disabled = !all.length;

    var m = minutes();
    timerMin.textContent = m;
    if (G) G.to(timerDial, { rotation: -m * 6, duration: 1.1, ease: "elastic.out(1, 0.6)" });
    else timerDial.style.transform = "rotate(" + (-m * 6) + "deg)";

    if (announce) live.textContent = announce + " Totaal " + money(sum) + ".";
    return lines.lastElementChild;
  }

  function add() {
    var p = DATA[current];
    var line = cart.find(function (l) { return l.id === current; });
    if (line) line.qty += 1; else cart.push({ id: current, name: p.name, price: p.price, qty: 1 });
    var target = render(p.name + " toegevoegd.");
    var hit = cart.findIndex(function (l) { return l.id === current; });
    if (lines.children[hit]) target = lines.children[hit];
    fly(target);
  }

  function remove(id) {
    if (id === EXTRA.id) { setChili(false); return; }
    var i = cart.findIndex(function (l) { return l.id === id; });
    if (i < 0) return;
    var name = cart[i].name;
    cart[i].qty -= 1;
    if (!cart[i].qty) cart.splice(i, 1);
    render("Eén " + name + " verwijderd.");
    orderBtn.focus();
    if (orderBtn.disabled) $("add").focus();
  }

  function fly(target) {
    if (!G || !target) return;
    var from = pizzaImg.getBoundingClientRect(), to = target.getBoundingClientRect();
    var ghost = new Image();
    ghost.src = "assets/img/" + current + "-mini.webp";
    ghost.alt = ""; ghost.className = "ghost";
    ghost.setAttribute("aria-hidden", "true");
    document.body.appendChild(ghost);
    G.set(ghost, { position: "fixed", left: from.left, top: from.top, width: from.width, height: from.height, zIndex: 60, pointerEvents: "none", margin: 0 });
    G.to(ghost, {
      left: to.left + 4, top: to.top + to.height / 2 - 14, width: 28, height: 28, rotation: 360,
      duration: 0.7, ease: "power2.inOut",
      onComplete: function () {
        ghost.remove();
        G.fromTo(target, { backgroundColor: "rgba(169,46,26,.18)" }, { backgroundColor: "rgba(169,46,26,0)", duration: 0.8 });
      }
    });
    G.fromTo(pizzaImg, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
  }

  function setChili(on) {
    chili = on;
    chiliBtn.setAttribute("aria-pressed", on ? "true" : "false");
    render(on ? "Pikante olie toegevoegd." : "Pikante olie verwijderd.");
  }

  function openConfirm() {
    var ul = $("confirm-lines");
    ul.innerHTML = "";
    var all = cart.slice();
    if (chili) all.push({ name: EXTRA.name, qty: 1, price: EXTRA.price });
    all.forEach(function (l) {
      var li = document.createElement("li");
      li.textContent = l.qty + "× " + l.name + ", " + money(l.price * l.qty);
      ul.appendChild(li);
    });
    $("confirm-total").textContent = total.textContent;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else alert("Demo: bij een echte zaak gaat je bestelling nu naar de pizzeria.");
  }

  picks.forEach(function (b) { b.addEventListener("click", function () { choose(b.dataset.id, b); }); });
  $("add").addEventListener("click", add);
  chiliBtn.addEventListener("click", function () { setChili(!chili); });
  orderBtn.addEventListener("click", openConfirm);
  $("confirm-close").addEventListener("click", function () { dialog.close(); orderBtn.focus(); });

  render();

  // Binnenkomst en scroll-effecten, enkel met animatie aan
  if (!G) return;
  var desktop = window.matchMedia("(min-width: 900px)").matches;
  G.from(".box", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" });
  G.from(pizzaImg, { rotation: -200, scale: 0.6, opacity: 0, duration: 1, delay: 0.25, ease: "back.out(1.3)" });
  G.from(".now > *", { y: 10, opacity: 0, duration: 0.4, stagger: 0.08, delay: 0.6 });
  if (desktop) {
    G.from(".paper", { x: 60, rotation: 8, opacity: 0, duration: 0.8, delay: 0.4, ease: "power3.out" });
    G.from([".timer", ".chili"], { x: -50, opacity: 0, duration: 0.7, delay: 0.5, stagger: 0.1, ease: "power3.out" });
  }
  G.from(".pick", { y: 20, opacity: 0, duration: 0.5, delay: 0.7, stagger: 0.07 });

  if (window.ScrollTrigger && desktop) {
    G.registerPlugin(window.ScrollTrigger);
    G.to(".pizza-slot", {
      rotation: 70, ease: "none",
      scrollTrigger: { trigger: ".scene", start: "top top", end: "bottom top", scrub: 0.6 }
    });
    G.to(".scene-bg", {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".scene", start: "top top", end: "bottom top", scrub: true }
    });
    G.from(".story-img img", {
      rotation: -90, scale: 0.8, opacity: 0, ease: "power2.out",
      scrollTrigger: { trigger: ".story", start: "top 80%", end: "center center", scrub: 0.8 }
    });
  }
})();
