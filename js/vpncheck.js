/* ============================================================
   IsMyVPNWorking.com — VPN Detection Logic
   ============================================================ */

'use strict';

/* ---- Utility: country code → flag emoji ---- */
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0))
  );
}

/* ---- Utility: format timestamp ---- */
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ---- Known consumer ISP keywords (DNS leak indicator) ---- */
const CONSUMER_ISP_KEYWORDS = [
  'comcast', 'xfinity', 'at&t', 'verizon', 'spectrum', 'cox', 'charter',
  'frontier', 'centurylink', 'lumen', 'bt ', 'british telecom', 'sky broadband',
  'virgin media', 'talk talk', 'plusnet', 'ee limited', 'vodafone',
  'deutsche telekom', 'orange', 'sfr', 'bouygues', 'free sas',
  'telecom italia', 'tim ', 'telefonica', 'movistar', 'o2 ',
  'telstra', 'optus', 'tpg', 'singtel', 'starhub', 'maxis',
  'jio', 'airtel', 'bsnl', 'reliance',
  'shaw', 'rogers', 'telus', 'bell canada',
  'swisscom', 'proximus', 'kpn', 'ziggo', 'telia', 'telenor',
  'kddi', 'ntt', 'softbank', 'docomo',
  'china telecom', 'china unicom', 'china mobile'
];

function isConsumerISP(ispName) {
  if (!ispName) return false;
  const lower = ispName.toLowerCase();
  return CONSUMER_ISP_KEYWORDS.some(k => lower.includes(k));
}

/* ---- Known VPN/hosting provider keywords ---- */
const VPN_KEYWORDS = [
  'vpn', 'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'private internet',
  'protonvpn', 'mullvad', 'pia', 'ipvanish', 'hotspot shield', 'tunnelbear',
  'windscribe', 'ivpn', 'airvpn', 'perfect privacy', 'hide my ass', 'hma',
  'strongvpn', 'vyprvpn', 'purevpn', 'hidemyip', 'torguard',
  'digitalocean', 'linode', 'vultr', 'ovh', 'hetzner', 'leaseweb',
  'choopa', 'peg tech', 'm247', 'datacamp', 'as20473',
  'zscaler', 'cloudflare warp'
];

function detectVPNProvider(org, isp) {
  const text = ((org || '') + ' ' + (isp || '')).toLowerCase();
  if (text.includes('nordvpn')) return 'NordVPN';
  if (text.includes('expressvpn')) return 'ExpressVPN';
  if (text.includes('surfshark')) return 'Surfshark';
  if (text.includes('cyberghost')) return 'CyberGhost';
  if (text.includes('private internet')) return 'Private Internet Access';
  if (text.includes('proton')) return 'ProtonVPN';
  if (text.includes('mullvad')) return 'Mullvad';
  if (text.includes('ipvanish')) return 'IPVanish';
  if (text.includes('windscribe')) return 'Windscribe';
  if (text.includes('tunnelbear')) return 'TunnelBear';
  if (text.includes('vpn')) return 'VPN Service';
  return null;
}

/* ============================================================
   WebRTC Leak Detection
   ============================================================ */
function detectWebRTCIP() {
  return new Promise((resolve) => {
    const ips = new Set();
    let pc;

    try {
      const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      pc = new RTCPeerConnection(config);

      const dc = pc.createDataChannel('leak-test');

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const candidate = e.candidate.candidate;
        const ipRegex = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/g;
        let match;
        while ((match = ipRegex.exec(candidate)) !== null) {
          const ip = match[1];
          if (!ip.startsWith('10.') &&
              !ip.startsWith('192.168.') &&
              !ip.startsWith('172.') &&
              ip !== '0.0.0.0') {
            ips.add(ip);
          }
        }
      };

      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      setTimeout(() => {
        try { pc.close(); } catch (_) {}
        resolve([...ips]);
      }, 2500);

    } catch (err) {
      resolve([]);
    }
  });
}

/* ============================================================
   API Calls
   ============================================================ */
async function fetchIPAPI() {
  const res = await fetch('https://ipapi.co/json/', {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('ipapi.co failed');
  return res.json();
}

async function fetchIPApiCom(ip) {
  const url = `https://ip-api.com/json/${ip || ''}?fields=status,message,country,countryCode,city,isp,org,proxy,hosting,query`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('ip-api.com failed');
  const data = await res.json();
  if (data.status !== 'success') throw new Error(data.message || 'ip-api error');
  return data;
}

async function fetchFallbackIPInfo() {
  const res = await fetch('https://api.ipify.org?format=json');
  if (!res.ok) throw new Error('ipify failed');
  return res.json();
}

/* ============================================================
   UI State Management
   ============================================================ */
const card = document.getElementById('result-card');
const cardContent = document.getElementById('card-content');
const lastCheckedEl = document.getElementById('last-checked');

function setCardState(state) {
  card.classList.remove('state-checking', 'state-protected', 'state-warning', 'state-error');
  card.classList.add('state-' + state);
}

function renderChecking() {
  setCardState('checking');
  cardContent.innerHTML = `
    <div class="spinner" role="status" aria-label="Checking your connection"></div>
    <h2 class="result-card__headline text-yellow">Checking Your Connection…</h2>
    <p class="result-card__subheadline">Analysing your IP address and VPN status</p>
  `;
}

function renderProtected(data) {
  setCardState('protected');
  const { ip, city, country, countryCode, isp, vpnProvider, dnsLeak } = data;
  const flag = countryFlag(countryCode);
  const vpnLabel = vpnProvider ? `Yes — ${vpnProvider}` : 'Yes — VPN Active';

  cardContent.innerHTML = `
    <svg class="check-icon" viewBox="0 0 72 72" aria-label="VPN active checkmark">
      <circle class="check-circle" cx="36" cy="36" r="32"/>
      <polyline class="check-mark" points="20,37 30,47 52,26"/>
    </svg>
    <h2 class="result-card__headline text-green">✓ Your VPN is Active</h2>
    <p class="result-card__subheadline">Your real IP address is hidden</p>
    <div class="data-rows">
      <div class="data-row">
        <span class="data-row__label">Your IP Address</span>
        <span class="data-row__value"><span class="ip-pill">${escapeHtml(ip)}</span></span>
      </div>
      <div class="data-row">
        <span class="data-row__label">Location</span>
        <span class="data-row__value">${flag} ${escapeHtml(city)}, ${escapeHtml(country)}</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">ISP / Provider</span>
        <span class="data-row__value">${escapeHtml(isp)}</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">VPN Detected</span>
        <span class="data-row__value text-green">${escapeHtml(vpnLabel)}</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">DNS Indicator</span>
        <span class="data-row__value ${dnsLeak ? 'text-yellow' : 'text-green'}">
          ${dnsLeak ? '⚠ Review Recommended' : '✓ Looks Good'}
        </span>
      </div>
    </div>
    <span class="badge badge-green">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
      You are protected
    </span>
  `;
}

function renderWarning(data) {
  setCardState('warning');
  const { ip, city, country, countryCode, isp, dnsLeak } = data;
  const flag = countryFlag(countryCode);

  cardContent.innerHTML = `
    <svg class="warn-icon" viewBox="0 0 72 72" aria-label="VPN warning — not protected">
      <path class="warn-shield" d="M36 4L8 16v20c0 16.4 11.7 31.7 28 35.9C52.3 67.7 64 52.4 64 36V16L36 4z" stroke-width="2"/>
      <text x="36" y="46" text-anchor="middle" font-size="28" font-weight="900" fill="#FF4757" font-family="sans-serif">!</text>
    </svg>
    <h2 class="result-card__headline text-red">⚠ Warning: No VPN Detected</h2>
    <p class="result-card__subheadline">Your real IP address is exposed</p>
    <div class="data-rows">
      <div class="data-row">
        <span class="data-row__label">Your IP Address</span>
        <span class="data-row__value"><span class="ip-pill text-red">${escapeHtml(ip)}</span></span>
      </div>
      <div class="data-row">
        <span class="data-row__label">Location</span>
        <span class="data-row__value text-red">${flag} ${escapeHtml(city)}, ${escapeHtml(country)}</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">ISP / Provider</span>
        <span class="data-row__value text-red">${escapeHtml(isp)}</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">VPN Detected</span>
        <span class="data-row__value text-red">✗ None Detected</span>
      </div>
      <div class="data-row">
        <span class="data-row__label">DNS Indicator</span>
        <span class="data-row__value text-red">⚠ ISP DNS Detected</span>
      </div>
    </div>
    <span class="badge badge-red">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
      Your identity is exposed
    </span>
    <br>
    <a href="#vpn-affiliate-link" <!-- REPLACE WITH YOUR AFFILIATE LINK -->
       rel="sponsored noopener" target="_blank" class="btn btn-danger">
      Protect Yourself Now →
    </a>
  `;
}

function renderError() {
  setCardState('error');
  cardContent.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-label="Error icon" style="margin:0 auto 1.5rem">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <h2 class="result-card__headline" style="color:var(--text-secondary)">Check Unavailable</h2>
    <p class="result-card__subheadline">
      Unable to complete the VPN check. Please verify your internet connection and try again.
    </p>
  `;
}

/* Simple HTML escaper to prevent XSS from API data */
function escapeHtml(str) {
  if (!str) return 'Unknown';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   Main VPN Check Orchestrator
   ============================================================ */
async function runVPNCheck() {
  renderChecking();
  if (lastCheckedEl) lastCheckedEl.textContent = '';

  let ipapiData = null;
  let ipApiComData = null;
  let webRTCIPs = [];

  /* Run all checks in parallel */
  const [ipapiResult, webRTCResult] = await Promise.allSettled([
    fetchIPAPI(),
    detectWebRTCIP()
  ]);

  if (ipapiResult.status === 'fulfilled') {
    ipapiData = ipapiResult.value;
  }
  if (webRTCResult.status === 'fulfilled') {
    webRTCIPs = webRTCResult.value;
  }

  /* Try secondary API using IP discovered from first */
  const detectedIP = ipapiData?.ip || null;
  try {
    ipApiComData = await fetchIPApiCom(detectedIP);
  } catch (_) {
    /* fallback: continue without it */
  }

  /* If everything failed, try ipify as last resort */
  if (!ipapiData && !ipApiComData) {
    try {
      const fallback = await fetchFallbackIPInfo();
      ipapiData = { ip: fallback.ip, city: 'Unknown', country_name: 'Unknown', country_code: '', org: '' };
    } catch (_) {
      renderError();
      return;
    }
  }

  /* --- Consolidate data --- */
  const ip          = ipApiComData?.query     || ipapiData?.ip          || 'Unknown';
  const city        = ipApiComData?.city       || ipapiData?.city        || 'Unknown';
  const country     = ipApiComData?.country    || ipapiData?.country_name|| 'Unknown';
  const countryCode = ipApiComData?.countryCode|| ipapiData?.country_code|| '';
  const isp         = ipApiComData?.isp        || ipapiData?.org         || 'Unknown';
  const org         = ipApiComData?.org        || ipapiData?.org         || '';

  /* --- VPN detection logic --- */
  const proxyFlag   = ipApiComData?.proxy   === true;
  const hostingFlag = ipApiComData?.hosting === true;
  const orgText     = (org + ' ' + isp).toLowerCase();
  const hasVPNKeyword = VPN_KEYWORDS.some(k => orgText.includes(k));
  const isVPN = proxyFlag || hostingFlag || hasVPNKeyword;

  /* --- WebRTC leak check --- */
  let webRTCLeak = false;
  if (webRTCIPs.length > 0 && ip !== 'Unknown') {
    webRTCLeak = webRTCIPs.some(wip => wip !== ip);
  }

  /* --- DNS leak indicator --- */
  const dnsLeakIndicator = !isVPN && isConsumerISP(isp);

  /* --- VPN provider name --- */
  const vpnProvider = isVPN ? detectVPNProvider(org, isp) : null;

  /* --- Render result --- */
  const resultData = { ip, city, country, countryCode, isp, vpnProvider, dnsLeak: dnsLeakIndicator || webRTCLeak };

  if (isVPN) {
    renderProtected(resultData);
  } else {
    renderWarning(resultData);
  }

  /* Update timestamp */
  if (lastCheckedEl) {
    lastCheckedEl.textContent = 'Last checked: ' + formatTime(new Date());
  }
}

/* ============================================================
   Re-run button
   ============================================================ */
function initRerunButton() {
  const btn = document.getElementById('rerun-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    runVPNCheck();
  });
}

/* ============================================================
   Mobile hamburger nav
   ============================================================ */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  /* Close on link click */
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ============================================================
   FAQ Accordion
   ============================================================ */
function initAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const trigger = item.querySelector('.faq-item__trigger');
    const body    = item.querySelector('.faq-item__body');
    if (!trigger || !body) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  });
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAccordion();

  /* Only run VPN check if the result card is on the page */
  if (document.getElementById('result-card')) {
    runVPNCheck();
    initRerunButton();
  }
});
