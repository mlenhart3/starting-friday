/* Starting Friday: renders the site from the JSON files in /data. */
(function () {
  "use strict";

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function parseDate(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function short(d) { return MONTHS[d.getMonth()] + " " + d.getDate(); }
  function long(d) { return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate(); }
  function monthYear(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }

  // Preview a different day with ?today=2026-11-14
  function today() {
    var m = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m) return parseDate(m[1]);
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    });
  }

  function loadAll() {
    return getJSON("data/index.json").then(function (idx) {
      return Promise.all(idx.series.map(function (id) {
        return getJSON("data/series/" + id + ".json");
      }));
    });
  }

  function seriesLink(s, label, cls) {
    return el("a", { href: "series.html?s=" + encodeURIComponent(s.id), "class": cls || "btn", text: label });
  }

  function dateRange(s) {
    var a = parseDate(s.startDate), b = parseDate(s.endDate);
    return short(a) + " – " + short(b) + ", " + b.getFullYear();
  }

  function nextSession(s, now) {
    for (var i = 0; i < s.sessions.length; i++) {
      if (parseDate(s.sessions[i].date) >= now) return s.sessions[i];
    }
    return null;
  }

  function fail(target, err) {
    target.innerHTML = "";
    target.appendChild(el("p", { "class": "error", text: "Couldn’t load the study data. " + err.message }));
  }

  /* ---------- Home ---------- */
  function renderNext(root, current, now) {
    root.innerHTML = "";
    if (!current) return;
    var next = nextSession(current, now);
    var started = parseDate(current.startDate) <= now;
    var card = el("div", { "class": "next-card" });
    if (!next) {
      card.appendChild(el("p", { "class": "label", text: "Series complete" }));
      card.appendChild(el("h2", { text: current.title }));
      card.appendChild(el("p", { text: "That’s a wrap. Watch this space for what’s next." }));
    } else {
      var d = parseDate(next.date);
      card.appendChild(el("p", { "class": "label", text: started ? "Next Friday" : "Kicks off" }));
      card.appendChild(el("h2", { text: long(d) + " · " + current.time }));
      card.appendChild(el("p", { "class": "next-title" }, [
        el("strong", { text: "Week " + next.week + ": " }), next.title
      ]));
      var facts = el("dl", { "class": "facts" }, [
        el("div", {}, [el("dt", { text: "Leader" }), el("dd", { text: next.leader })]),
        el("div", {}, [el("dt", { text: "Read" }), el("dd", { text: "pp. " + next.pages })]),
        el("div", {}, [el("dt", { text: "Scripture" }), el("dd", { text: next.scripture.join("; ") })])
      ]);
      card.appendChild(facts);
      card.appendChild(seriesLink(current, "Open the discussion guide", "btn"));
      card.lastChild.href += "#week-" + next.week;
    }
    root.appendChild(card);
  }

  function renderCurrent(root, current, now) {
    root.innerHTML = "";
    if (!current) {
      root.appendChild(el("p", { "class": "muted", text: "No study is scheduled right now." }));
      return;
    }
    var next = nextSession(current, now);
    root.appendChild(el("div", { "class": "series-head" }, [
      el("h3", {}, [current.title]),
      el("p", { "class": "byline", text: (current.book ? "by " + current.book.author + " · " : "") + dateRange(current) + " · " + current.time }),
      el("p", { text: current.summary })
    ]));

    var table = el("table", { "class": "schedule" }, [
      el("thead", {}, [el("tr", {}, ["Wk", "Date", "Reading", "Pages", "Leader"].map(function (h) {
        return el("th", { scope: "col", text: h });
      }))]),
      el("tbody", {}, current.sessions.map(function (s) {
        var d = parseDate(s.date);
        var cls = d < now ? "past" : (next && next.week === s.week ? "next" : "");
        var a = el("a", { href: "series.html?s=" + encodeURIComponent(current.id) + "#week-" + s.week, text: s.title });
        return el("tr", { "class": cls }, [
          el("td", { "data-label": "Week", text: String(s.week) }),
          el("td", { "data-label": "Date", text: short(d) }),
          el("td", { "data-label": "Reading" }, [a]),
          el("td", { "data-label": "Pages", text: s.pages }),
          el("td", { "data-label": "Leader", text: s.leader })
        ]);
      }))
    ]);
    root.appendChild(el("div", { "class": "table-wrap" }, [table]));
    if (current.notes && current.notes.length) {
      root.appendChild(el("p", { "class": "muted small", text: current.notes[0] }));
    }
    root.appendChild(seriesLink(current, "Full guide with discussion questions"));
  }

  function renderBooks(root, list) {
    root.innerHTML = "";
    var shown = list.filter(function (s) { return s.book && s.book.links && s.book.links.length && s.status !== "past"; });
    if (!shown.length) {
      root.appendChild(el("p", { "class": "muted", text: "Book links will show up here when the next study is chosen." }));
      return;
    }
    shown.forEach(function (s) {
      var b = s.book;
      root.appendChild(el("article", { "class": "card book" }, [
        el("p", { "class": "label", text: s.status === "current" ? "Current study" : "Coming up" }),
        el("h3", { text: b.title }),
        el("p", { "class": "byline", text: "by " + b.author }),
        b.format ? el("p", { "class": "small muted", text: b.format }) : null,
        el("div", { "class": "link-row" }, b.links.map(function (l) {
          return el("a", { href: l.url, "class": "btn btn-outline", target: "_blank", rel: "noopener", text: l.label });
        }))
      ]));
    });
  }

  function renderHistory(root, list, now) {
    root.innerHTML = "";
    var past = list.filter(function (s) {
      return s.status === "past" || (s.status === "current" && parseDate(s.endDate) < now);
    }).sort(function (a, b) { return b.endDate.localeCompare(a.endDate); });
    if (!past.length) {
      root.appendChild(el("p", { "class": "muted", text: "Completed studies will be listed here, newest first." }));
      return;
    }
    root.appendChild(el("ul", { "class": "history" }, past.map(function (s) {
      var range = "";
      if (!s.hideDates) {
        var d = parseDate(s.startDate), e = parseDate(s.endDate);
        range = monthYear(d) === monthYear(e) ? monthYear(d) : monthYear(d) + " – " + monthYear(e);
      }
      var hasGuide = s.sessions && s.sessions.length;
      return el("li", { "class": s.hideDates ? "nodate" : "" }, [
        s.hideDates ? null : el("div", { "class": "h-when", text: range }),
        el("div", {}, [
          el("strong", { text: s.title }),
          s.book ? el("span", { "class": "muted", text: " · " + s.book.author }) : null,
          s.summary ? el("p", { "class": "small", text: s.summary }) : null,
          hasGuide ? seriesLink(s, "View the guide", "text-link") : null,
          (s.book && s.book.links && s.book.links.length) && s.status === "past" ? el("a", { href: s.book.links[0].url, "class": "text-link", target: "_blank", rel: "noopener", text: "Order the book" }) : null
        ])
      ]);
    })));
  }

  function home() {
    var now = today();
    loadAll().then(function (list) {
      var current = list.filter(function (s) { return s.status === "current"; })[0] || null;
      renderNext(document.getElementById("next"), current, now);
      renderCurrent(document.getElementById("current-body"), current, now);
      renderBooks(document.getElementById("books-body"), list);
      renderHistory(document.getElementById("history-body"), list, now);
    }).catch(function (err) {
      fail(document.getElementById("current-body"), err);
    });
  }

  /* ---------- Series page ---------- */
  function series() {
    var now = today();
    var m = /[?&]s=([^&]+)/.exec(location.search);
    var root = document.getElementById("series-body");
    if (!m) { fail(root, new Error("No study selected.")); return; }
    getJSON("data/series/" + decodeURIComponent(m[1]) + ".json").then(function (s) {
      document.title = s.title + " · Starting Friday";
      document.getElementById("s-title").textContent = s.title;
      document.getElementById("s-sub").textContent =
        (s.subtitle ? s.subtitle + " · " : "") + dateRange(s) + " · " + s.time;
      root.innerHTML = "";

      root.appendChild(el("p", { "class": "lede", text: s.summary }));

      if (s.book) {
        var b = s.book;
        root.appendChild(el("div", { "class": "card book inline" }, [
          el("div", {}, [
            el("h3", { text: b.title }),
            el("p", { "class": "byline", text: "by " + b.author }),
            b.format ? el("p", { "class": "small muted", text: b.format }) : null
          ]),
          el("div", { "class": "link-row" }, (b.links || []).map(function (l) {
            return el("a", { href: l.url, "class": "btn btn-outline", target: "_blank", rel: "noopener", text: l.label });
          }))
        ]));
      }

      if (s.notes && s.notes.length) {
        root.appendChild(el("div", { "class": "notes" }, [
          el("h2", { text: "Good to know" }),
          el("ul", {}, s.notes.map(function (n) { return el("li", { text: n }); }))
        ]));
      }

      var next = nextSession(s, now);
      root.appendChild(el("div", { "class": "toolbar" }, [
        el("h2", { text: "Week by week" }),
        el("div", {}, [
          el("button", { type: "button", "class": "btn btn-outline", id: "expand", text: "Expand all" }),
          el("button", { type: "button", "class": "btn btn-outline", id: "collapse", text: "Collapse all" }),
          el("button", { type: "button", "class": "btn btn-outline", id: "print", text: "Print" })
        ])
      ]));

      var list = el("div", { "class": "weeks" });
      s.sessions.forEach(function (w) {
        var d = parseDate(w.date);
        var cls = "week" + (d < now ? " past" : "") + (next && next.week === w.week ? " next" : "");
        var det = el("details", { "class": cls, id: "week-" + w.week });
        if (next && next.week === w.week) det.setAttribute("open", "");
        det.appendChild(el("summary", {}, [
          el("span", { "class": "w-num", text: "Week " + w.week }),
          el("span", { "class": "w-date", text: long(d) }),
          el("span", { "class": "w-title", text: w.title }),
          el("span", { "class": "w-leader", text: "Leader: " + w.leader })
        ]));
        var body = el("div", { "class": "w-body" });
        body.appendChild(el("dl", { "class": "facts" }, [
          el("div", {}, [el("dt", { text: "Read" }), el("dd", { text: w.reading.join("; ") + " (pp. " + w.pages + ")" })]),
          el("div", {}, [el("dt", { text: "Scripture" }), el("dd", { text: w.scripture.join("; ") })])
        ]));
        body.appendChild(el("h4", { text: "Discussion questions" }));
        body.appendChild(el("ol", {}, w.questions.map(function (q) { return el("li", { text: q }); })));
        det.appendChild(body);
        list.appendChild(det);
      });
      root.appendChild(list);

      var t = s.leaderTips;
      if (t) {
        root.appendChild(el("section", { "class": "tips" }, [
          el("h2", { text: "Tips for weekly leaders" }),
          el("p", { text: t.intro }),
          el("ul", { "class": "agenda" }, (t.agenda || []).map(function (a) {
            return el("li", {}, [
              el("span", { "class": "a-time", text: a.time }),
              el("span", { "class": "a-what", text: a.what }),
              el("span", { "class": "a-min", text: a.minutes })
            ]);
          })),
          t.note ? el("p", { "class": "muted", text: t.note }) : null
        ]));
      }

      var all = function (open) {
        Array.prototype.forEach.call(document.querySelectorAll("details.week"), function (d) { d.open = open; });
      };
      document.getElementById("expand").addEventListener("click", function () { all(true); });
      document.getElementById("collapse").addEventListener("click", function () { all(false); });
      document.getElementById("print").addEventListener("click", function () { all(true); window.print(); });

      // Open and scroll to a week linked as #week-N
      if (location.hash) {
        var target = document.getElementById(location.hash.slice(1));
        if (target && target.tagName === "DETAILS") {
          target.open = true;
          setTimeout(function () { target.scrollIntoView(); }, 50);
        }
      }
    }).catch(function (err) { fail(root, err); });
  }

  window.StartingFriday = { home: home, series: series };
})();
