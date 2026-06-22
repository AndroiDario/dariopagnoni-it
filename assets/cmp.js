(function() {
  'use strict';

  var COOKIE_NAME = 'dp_cookie_consent';
  var CONSENT_VERSION = '2026-06-22-v1';
  var MAX_AGE = 60 * 60 * 24 * 180;
  var banner;
  var modal;
  var analyticsInput;
  var marketingInput;
  var lastFocusedElement = null;

  function getCookie(name) {
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].indexOf(prefix) === 0) {
        return parts[i].slice(prefix.length);
      }
    }
    return '';
  }

  function parseConsent() {
    var raw = getCookie(COOKIE_NAME);
    if (!raw) return null;

    try {
      var parsed = JSON.parse(decodeURIComponent(raw));
      if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.categories) return null;
      return {
        version: parsed.version,
        updatedAt: parsed.updatedAt || '',
        categories: {
          necessary: true,
          statistics: parsed.categories.statistics === true,
          marketing: parsed.categories.marketing === true
        }
      };
    } catch (error) {
      return null;
    }
  }

  function writeConsent(categories) {
    var consent = {
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
      categories: {
        necessary: true,
        statistics: categories.statistics === true,
        marketing: categories.marketing === true
      }
    };
    var secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(consent)) + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + secure;
    return consent;
  }

  function buildConsentPayload(categories) {
    var statistics = categories && categories.statistics === true;
    var marketing = categories && categories.marketing === true;

    return {
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      analytics_storage: statistics ? 'granted' : 'denied'
    };
  }

  function applyConsent(consent) {
    if (!consent || !consent.categories) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', buildConsentPayload(consent.categories));
    window.gtag('set', 'ads_data_redaction', consent.categories.marketing !== true);
    window.gtag('set', 'url_passthrough', false);

    if (consent.categories.statistics !== true) {
      removeAnalyticsCookies();
    }
  }

  function getDomainVariants() {
    var hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
      return [''];
    }

    var parts = hostname.split('.');
    var variants = ['', hostname, '.' + hostname];
    if (parts.length > 2) {
      var root = parts.slice(-2).join('.');
      variants.push(root);
      variants.push('.' + root);
    }
    return variants.filter(function(value, index, list) {
      return list.indexOf(value) === index;
    });
  }

  function expireCookie(name, domain) {
    var domainPart = domain ? '; Domain=' + domain : '';
    document.cookie = name + '=; Max-Age=0; Path=/' + domainPart + '; SameSite=Lax';
    document.cookie = name + '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/' + domainPart + '; SameSite=Lax';
  }

  function removeAnalyticsCookies() {
    var names = [];
    var cookieParts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < cookieParts.length; i += 1) {
      var name = cookieParts[i].split('=')[0];
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid' || name.indexOf('_gat') === 0) {
        names.push(name);
      }
    }

    if (names.indexOf('_ga') === -1) names.push('_ga');
    if (names.indexOf('_gid') === -1) names.push('_gid');

    var domains = getDomainVariants();
    names.forEach(function(name) {
      domains.forEach(function(domain) {
        expireCookie(name, domain);
      });
    });
  }

  function setInputsFromConsent(consent) {
    var categories = consent && consent.categories ? consent.categories : {};
    analyticsInput.checked = categories.statistics === true;
    marketingInput.checked = categories.marketing === true;
  }

  function saveAndApply(categories) {
    var consent = writeConsent(categories);
    applyConsent(consent);
    closeBanner();
    closeModal();
  }

  function acceptAll() {
    saveAndApply({ statistics: true, marketing: true });
  }

  function rejectAll() {
    saveAndApply({ statistics: false, marketing: false });
  }

  function saveCustom() {
    saveAndApply({
      statistics: analyticsInput.checked === true,
      marketing: marketingInput.checked === true
    });
  }

  function closeBanner() {
    if (banner) banner.classList.remove('is-visible');
  }

  function showBanner() {
    if (banner) banner.classList.add('is-visible');
  }

  function getFocusableElements() {
    if (!modal) return [];
    return Array.prototype.slice.call(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function(element) {
        return !element.disabled && element.getClientRects().length > 0;
      });
  }

  function handleModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    var focusable = getFocusableElements();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openPreferences() {
    if (!modal) return;

    lastFocusedElement = document.activeElement;
    setInputsFromConsent(parseConsent());
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('dp-cmp-lock');

    var focusable = getFocusableElements();
    if (focusable.length) focusable[0].focus();
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('dp-cmp-lock');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function categoryMarkup(id, title, text, meta, checked, disabled) {
    return [
      '<section class="dp-cmp-category">',
      '<div>',
      '<h3 class="dp-cmp-category__title" id="' + id + '-title">' + title + '</h3>',
      '<p class="dp-cmp-category__text">' + text + '</p>',
      '<p class="dp-cmp-category__meta">' + meta + '</p>',
      '</div>',
      '<label class="dp-cmp-switch" aria-labelledby="' + id + '-title">',
      '<input id="' + id + '" type="checkbox"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' />',
      '<span class="dp-cmp-switch__track" aria-hidden="true"></span>',
      '</label>',
      '</section>'
    ].join('');
  }

  function createUi() {
    var wrapper = document.createElement('div');
    wrapper.className = 'dp-cmp';
    wrapper.innerHTML = [
      '<div class="dp-cmp-banner" role="region" aria-label="Preferenze cookie">',
      '<div class="dp-cmp-banner__panel">',
      '<button class="dp-cmp-banner__close" type="button" data-cmp-action="reject" aria-label="Chiudi e rifiuta i cookie non necessari">x</button>',
      '<div class="dp-cmp-banner__copy">',
      '<h2 class="dp-cmp-banner__title">Preferenze privacy</h2>',
      '<p class="dp-cmp-banner__text">Usiamo cookie tecnici per far funzionare il sito e, solo con il tuo consenso, strumenti di statistica e marketing tramite Google Tag Manager e Google Analytics 4. Puoi accettare, rifiutare o scegliere in modo granulare. Leggi la <a href="/cookie-policy.html">Cookie Policy</a>.</p>',
      '</div>',
      '<div class="dp-cmp-banner__actions">',
      '<button class="dp-cmp-btn dp-cmp-btn--muted" type="button" data-cmp-action="reject">Rifiuta</button>',
      '<button class="dp-cmp-btn" type="button" data-cmp-action="customize">Personalizza</button>',
      '<button class="dp-cmp-btn dp-cmp-btn--primary" type="button" data-cmp-action="accept">Accetta</button>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="dp-cmp-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="dp-cmp-modal-title">',
      '<div class="dp-cmp-modal__panel">',
      '<div class="dp-cmp-modal__header">',
      '<div>',
      '<h2 class="dp-cmp-modal__title" id="dp-cmp-modal-title">Gestione cookie</h2>',
      '<p class="dp-cmp-modal__text">Puoi modificare il consenso in qualsiasi momento. Le preferenze vengono salvate in un cookie tecnico per 180 giorni.</p>',
      '</div>',
      '<button class="dp-cmp-modal__close" type="button" data-cmp-action="close" aria-label="Chiudi preferenze">x</button>',
      '</div>',
      '<div class="dp-cmp-modal__body">',
      categoryMarkup('dp-cmp-necessary', 'Necessari', 'Servono per sicurezza, preferenze essenziali e corretto funzionamento del sito.', 'Sempre attivi. Includono il cookie tecnico di consenso e la preferenza tema.', true, true),
      categoryMarkup('dp-cmp-statistics', 'Statistiche', 'Consentono di misurare visite e interazioni con Google Analytics 4 tramite Google Tag Manager.', 'Attivi solo se dai consenso. Mappano analytics_storage su granted.', false, false),
      categoryMarkup('dp-cmp-marketing', 'Marketing', 'Consentono segnali pubblicitari e personalizzazione Google o futuri tag marketing.', 'Attivi solo se dai consenso. Mappano ad_storage, ad_user_data e ad_personalization su granted.', false, false),
      '<p class="dp-cmp-modal__text">Maggiori dettagli sono disponibili nella <a href="/cookie-policy.html">Cookie Policy</a>.</p>',
      '</div>',
      '<div class="dp-cmp-modal__footer">',
      '<div class="dp-cmp-modal__actions">',
      '<button class="dp-cmp-btn dp-cmp-btn--muted" type="button" data-cmp-action="reject">Rifiuta tutto</button>',
      '<button class="dp-cmp-btn" type="button" data-cmp-action="save">Salva preferenze</button>',
      '<button class="dp-cmp-btn dp-cmp-btn--primary" type="button" data-cmp-action="accept">Accetta tutto</button>',
      '</div>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(wrapper);
    banner = wrapper.querySelector('.dp-cmp-banner');
    modal = wrapper.querySelector('.dp-cmp-modal');
    analyticsInput = wrapper.querySelector('#dp-cmp-statistics');
    marketingInput = wrapper.querySelector('#dp-cmp-marketing');

    wrapper.addEventListener('click', function(event) {
      var target = event.target && event.target.closest ? event.target : event.target.parentElement;
      var actionElement = target ? target.closest('[data-cmp-action]') : null;
      if (!actionElement) return;
      var action = actionElement.getAttribute('data-cmp-action');

      if (action === 'accept') acceptAll();
      if (action === 'reject') rejectAll();
      if (action === 'customize') openPreferences();
      if (action === 'save') saveCustom();
      if (action === 'close') closeModal();
    });

    modal.addEventListener('click', function(event) {
      if (event.target === modal) closeModal();
    });
    modal.addEventListener('keydown', handleModalKeydown);
  }

  function bindPreferenceLinks() {
    document.addEventListener('click', function(event) {
      var target = event.target && event.target.closest ? event.target : event.target.parentElement;
      var trigger = target ? target.closest('[data-cmp-open]') : null;
      if (!trigger) return;
      event.preventDefault();
      openPreferences();
    });
  }

  function init() {
    createUi();
    bindPreferenceLinks();

    window.DPConsent = {
      openPreferences: openPreferences,
      getConsent: parseConsent,
      acceptAll: acceptAll,
      rejectAll: rejectAll
    };

    var consent = parseConsent();
    if (consent) {
      applyConsent(consent);
    } else {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
