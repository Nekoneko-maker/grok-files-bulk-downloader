(() => {
  const VERSION = '0.1.0';
  const now = new Date().toISOString();

  const clean = (value) => {
    if (value == null) return null;
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text || null;
  };

  const attr = (el, name) => clean(el?.getAttribute?.(name));
  const text = (el) => clean(el?.textContent);

  const mediaEls = [
    ...document.querySelectorAll('img'),
    ...document.querySelectorAll('video'),
    ...document.querySelectorAll('source'),
    ...document.querySelectorAll('a[href]'),
  ];

  const seen = new Set();
  const items = [];

  const likelyMediaUrl = (url) => {
    if (!url) return false;
    return /\.(png|jpe?g|webp|gif|avif|mp4|mov|webm)(?:[?#].*)?$/i.test(url)
      || /video|image|media|file/i.test(url);
  };

  const getUrl = (el) => {
    if (el.tagName === 'IMG') return el.currentSrc || el.src || attr(el, 'src');
    if (el.tagName === 'VIDEO') return el.currentSrc || el.src || attr(el, 'src');
    if (el.tagName === 'SOURCE') return el.src || attr(el, 'src');
    if (el.tagName === 'A') return el.href || attr(el, 'href');
    return null;
  };

  const nearestCards = (el) => {
    const candidates = [];
    let cur = el;
    for (let i = 0; cur && i < 5; i += 1, cur = cur.parentElement) {
      candidates.push({
        tag: cur.tagName,
        className: clean(cur.className),
        ariaLabel: attr(cur, 'aria-label'),
        title: attr(cur, 'title'),
        text: text(cur)?.slice(0, 500) || null,
        dataset: Object.keys(cur.dataset || {}).length ? { ...cur.dataset } : null,
      });
    }
    return candidates;
  };

  const collectAttrs = (el) => ({
    alt: attr(el, 'alt'),
    title: attr(el, 'title'),
    ariaLabel: attr(el, 'aria-label'),
    download: attr(el, 'download'),
    dataTestid: attr(el, 'data-testid'),
    role: attr(el, 'role'),
    src: attr(el, 'src'),
    href: attr(el, 'href'),
  });

  for (const el of mediaEls) {
    const url = getUrl(el);
    if (!likelyMediaUrl(url)) continue;
    const key = `${el.tagName}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const parentLink = el.closest('a[href]');
    const filenameFromUrl = (() => {
      try {
        const pathname = new URL(url, location.href).pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        return clean(last);
      } catch {
        return null;
      }
    })();

    items.push({
      kind: el.tagName.toLowerCase(),
      url,
      filenameFromUrl,
      ownText: text(el),
      ownAttrs: collectAttrs(el),
      parentLink: parentLink ? {
        href: parentLink.href,
        attrs: collectAttrs(parentLink),
        text: text(parentLink)?.slice(0, 300) || null,
      } : null,
      nearby: nearestCards(el),
    });
  }

  const scripts = [...document.scripts].map((s) => ({
    type: attr(s, 'type'),
    id: attr(s, 'id'),
    src: attr(s, 'src'),
    textSample: s.src ? null : text(s)?.slice(0, 300) || null,
  }));

  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => text(s))
    .filter(Boolean);

  const nextData = document.querySelector('script#__NEXT_DATA__');

  const result = {
    probeVersion: VERSION,
    capturedAt: now,
    page: {
      href: location.href,
      title: document.title,
    },
    summary: {
      mediaLikeCount: items.length,
      hasNextData: Boolean(nextData),
      jsonLdCount: jsonLd.length,
    },
    items,
    pageDataHints: {
      nextDataSample: nextData ? text(nextData)?.slice(0, 2000) || null : null,
      jsonLdSamples: jsonLd.map((x) => x.slice(0, 1000)),
      scriptHints: scripts.filter((s) => s.id || s.type === 'application/json' || s.type === 'application/ld+json'),
    },
  };

  const output = JSON.stringify(result, null, 2);
  console.log('[grok-files-probe] result', result);
  console.log(output);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(output)
      .then(() => console.log('[grok-files-probe] JSON copied to clipboard'))
      .catch(() => console.warn('[grok-files-probe] Could not copy automatically; copy from console output instead.'));
  }

  return result;
})();
