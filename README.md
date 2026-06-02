# IsMyVPNWorking.com

A free, production-ready single-page VPN checking tool. Detects IP address, VPN status, DNS leaks, and WebRTC leaks instantly in the browser. No backend required — fully deployable on GitHub Pages or Cloudflare Pages.

---

## File Structure

```
ismyvpnworking/
├── index.html                          # Main VPN check tool
├── blog.html                           # Blog index
├── about.html                          # About page
├── privacy.html                        # Privacy policy (AdSense required)
├── contact.html                        # Contact page (AdSense required)
├── 404.html                            # Custom 404 page
├── sitemap.xml                         # SEO sitemap
├── robots.txt                          # SEO robots file
├── README.md                           # This file
├── css/
│   └── style.css                       # All shared styles
├── js/
│   └── vpncheck.js                     # VPN detection logic
└── blog/
    ├── vpn-leak-test.html
    ├── signs-vpn-leaking.html
    ├── vpn-vs-no-vpn.html
    ├── best-ways-to-test-vpn.html
    ├── what-is-dns-leak.html
    ├── vpn-connected-not-working.html
    ├── check-vpn-iphone-android-pc.html
    ├── beginners-guide-vpn-security.html
    ├── nordvpn-vs-expressvpn.html
    └── vpn-myths-2025.html
```

---

## 1. Deploy to GitHub Pages

1. Create a new GitHub repository named `ismyvpnworking` (or any name you prefer)
2. Push all files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy"
   git remote add origin https://github.com/YOUR_USERNAME/ismyvpnworking.git
   git push -u origin main
   ```
3. Go to your repository on GitHub → **Settings** → **Pages**
4. Under "Build and deployment", set Source to **Deploy from a branch**
5. Select branch: **main**, folder: **/ (root)**
6. Click **Save**
7. Your site will be live at `https://YOUR_USERNAME.github.io/ismyvpnworking` within a few minutes

---

## 2. Deploy to Cloudflare Pages (Alternative)

1. Push your files to a GitHub repository (as above)
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project**
3. Connect your GitHub account and select the repository
4. Build settings: leave blank (this is a static site with no build step)
5. Click **Save and Deploy**
6. Your site deploys instantly at `https://your-project.pages.dev`

---

## 3. Connect a Custom Domain

### GitHub Pages

1. Buy a domain from [Namecheap](https://namecheap.com) or [Porkbun](https://porkbun.com) (~$12/year for a .com)
2. In GitHub: **Settings** → **Pages** → enter your custom domain (e.g. `www.ismyvpnworking.com`)
3. In your domain registrar's DNS settings, add these **A records** pointing to GitHub Pages:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |

4. Add a **CNAME record** for `www`:

   | Type | Name | Value |
   |------|------|-------|
   | CNAME | www | YOUR_USERNAME.github.io |

5. Wait 24–48 hours for DNS propagation
6. HTTPS will be enabled automatically via Let's Encrypt — tick "Enforce HTTPS" in GitHub Pages settings once the certificate is issued

### Cloudflare Pages

1. Add your domain to Cloudflare (free plan works)
2. In Cloudflare Pages project settings → **Custom domains** → Add domain
3. Cloudflare handles DNS and HTTPS automatically

---

## 4. Before Going Live: Update URLs

Search the codebase for `https://www.ismyvpnworking.com` and replace with your actual domain in:
- All `<link rel="canonical">` tags
- All Open Graph `og:url` tags
- `sitemap.xml` — all `<loc>` entries
- `robots.txt` — the Sitemap line

---

## 5. Apply for Google AdSense

1. Ensure the site has been live for at least a few days with real content indexed
2. Create an account at [adsense.google.com](https://adsense.google.com)
3. Add your site URL and follow the verification steps
4. Paste the AdSense **site verification code** into the `<head>` of `index.html` (and optionally all pages)
5. Wait for approval — typically 1–4 weeks for new sites
6. Once approved, create ad units in the AdSense dashboard
7. Replace every instance of this comment block in the HTML files:
   ```html
   <!-- ADSENSE AD UNIT: Replace with your AdSense ad code -->
   <div class="ad-container" aria-label="Advertisement">
     <p class="ad-label">Advertisement</p>
     <!-- INSERT ADSENSE CODE HERE -->
   </div>
   ```
   With your actual AdSense ad unit code. The `.ad-container` wrapper and `.ad-label` paragraph should be kept for compliance.

Ad placement locations across the site:
- `index.html` — below result card, below FAQ section
- `blog.html` — below hero, between blog post rows
- Each blog post — below introduction, mid-article, end of article
- Blog sidebar — one unit per post

---

## 6. Set Up VPN Affiliate Links

Replace every `href="#vpn-affiliate-link"` in the HTML with your real affiliate tracking URLs. Each link also has a comment `<!-- REPLACE WITH YOUR AFFILIATE LINK -->` to make them easy to find.

Sign up for affiliate programmes at:

| Provider | Affiliate Programme URL |
|----------|------------------------|
| NordVPN | https://partners.nordvpn.com |
| ExpressVPN | https://www.expressvpn.com/affiliates |
| Surfshark | https://surfshark.com/affiliates |
| CyberGhost | https://www.cyberghostvpn.com/affiliates |
| Private Internet Access | https://www.privateinternetaccess.com/pages/affiliates |
| ProtonVPN | https://proton.me/affiliate-program |

Once approved, you will receive unique tracking URLs. Replace the placeholder `#vpn-affiliate-link` values with these URLs throughout the site.

To find all affiliate link placeholders quickly:
```bash
grep -r "vpn-affiliate-link" --include="*.html" .
```

---

## 7. How the VPN Check Works

The detection logic in `js/vpncheck.js` runs three checks in parallel on page load:

1. **IP &amp; ISP Detection** — calls `ipapi.co/json/` to get your public IP, city, country, and ISP
2. **VPN/Proxy Detection** — calls `ip-api.com` with proxy and hosting flags to determine if the IP belongs to a VPN or data centre
3. **WebRTC Leak Detection** — uses `RTCPeerConnection` with a Google STUN server to gather ICE candidates and check if any real IPs are being leaked by the browser

Results are combined and displayed as one of three states:
- **Protected** (green) — VPN detected based on proxy flag, hosting flag, or known VPN provider in ISP name
- **Warning** (red) — No VPN detected; real consumer ISP identified
- **Error** (grey) — All API calls failed; user advised to check connection

No data is stored. All processing happens in the user's browser.

---

## 8. Customisation Notes

- **Colour scheme** — all colours are CSS custom properties in `css/style.css` under `:root`. Edit the values there to retheme the entire site at once.
- **Adding new VPN providers** — add a new `.vpn-card` block in the affiliate section of `index.html` and update the `detectVPNProvider()` function in `vpncheck.js`
- **Adding blog posts** — create a new HTML file in the `blog/` directory following the same structure as existing posts, then add a card to `blog.html` and update `sitemap.xml`
- **Contact form** — currently uses a front-end-only success message. To make it functional, connect it to a service like Formspree (`action="https://formspree.io/f/YOUR_ID"`) or Netlify Forms

---

## 9. SEO Checklist Before Launch

- [ ] Replace all canonical URLs with your real domain
- [ ] Update sitemap.xml with your real domain
- [ ] Update robots.txt sitemap URL
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify Open Graph tags render correctly using Facebook's Sharing Debugger
- [ ] Test mobile responsiveness on real devices
- [ ] Run Lighthouse audit (target: Performance 90+, Accessibility 90+, SEO 100)
- [ ] Ensure all pages are indexed after DNS propagation

---

## 10. Technical Requirements

- No build tools, no npm, no dependencies
- Pure HTML, CSS, and vanilla JavaScript
- Works on any static hosting platform
- All external resources: Google Fonts (CSS), ipapi.co (API), ip-api.com (API), Google STUN (WebRTC)
- Tested in: Chrome, Firefox, Safari, Edge (latest versions), iOS Safari, Android Chrome
