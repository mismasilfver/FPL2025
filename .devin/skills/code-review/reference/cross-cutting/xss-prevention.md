# XSS Prevention Guide

Language-agnostic Cross-Site Scripting prevention strategies with cross-framework code examples.

> **Related**: [Security Review Guide](../security-review-guide.md) for comprehensive security checklist and decision framework.
>
> **This project**: there is no frontend framework here (no React/Vue/Angular/Svelte auto-escaping). `js/ui-manager.js` builds DOM nodes both via `document.createElement()` + `textContent`/`setAttribute` (safe) and via a few `innerHTML` assignments (e.g. clearing `notesCell.innerHTML = ''`, building the status indicator). When reviewing changes to `ui-manager.js`, check whether any *user-supplied* string (player name, notes, team, status) is ever assigned into `innerHTML`/`outerHTML` — prefer `textContent` or explicit element creation.

## XSS Types

XSS is ranked #3 in the OWASP Top 10 (2021, merged with Injection). Three variants:

| Type | Description | Attack Vector |
|------|-------------|---------------|
| **Reflected** | Malicious script reflected off the server in the response | URL parameters, form submissions |
| **Stored (Persistent)** | Malicious script stored in the database and served to users | Comments, profiles, messages |
| **DOM-based** | Client-side JavaScript modifies the DOM unsafely | `innerHTML`, `document.write()`, `eval()` |

## Universal Prevention Strategy

1. **Output encoding** — encode data for the context it's rendered in (HTML, JS, URL, CSS)
2. **Content Security Policy (CSP)** — restrict which scripts can execute
3. **Input sanitization** — only when rich text is required (DOMPurify)
4. **Framework auto-escaping** — rely on framework defaults, audit escape hatches; **for vanilla DOM code, there is no auto-escaping** — every `textContent` vs `innerHTML` choice matters

> **Key distinction**: Input validation prevents bad data from entering the system. Output encoding prevents bad data from being rendered as code. Both are necessary; neither alone is sufficient.

---

## Vanilla DOM (No Framework)

```javascript
// ❌ innerHTML with unescaped user data
nameCell.innerHTML = player.name;  // player.name = "<img src=x onerror=alert(1)>"

// ✅ textContent — never interpreted as HTML
nameCell.textContent = player.name;

// ❌ Building HTML strings by concatenation
row.innerHTML = `<td>${player.name}</td><td>${player.notes}</td>`;

// ✅ createElement + textContent for each piece of user data
const nameCell = document.createElement('td');
nameCell.textContent = player.name;
row.appendChild(nameCell);

// ⚠️ innerHTML = '' to clear a node is safe (no interpolation),
// but innerHTML = someTemplateString is not, even if most of the
// template is static markup — any interpolated value must be escaped
// or the whole approach should switch to DOM APIs.

// ❌ Setting attributes with unescaped user data via string templates
el.innerHTML = `<div title="${player.notes}">...</div>`;

// ✅ setAttribute (browser handles attribute-context encoding)
el.setAttribute('title', player.notes);
```

**Review checklist for vanilla DOM code:**
- [ ] Every `innerHTML`/`outerHTML` assignment audited — does it ever include a value that ultimately originated from user input (form fields, imported JSON, API responses)?
- [ ] Prefer `textContent` for text, `setAttribute` for attributes, and `createElement` for structure.
- [ ] If rich-text HTML must be rendered, sanitize with DOMPurify first.

## Cross-Framework Examples

### React

```typescript
// ✅ React auto-escapes JSX expressions (default safe)
return <div>{userInput}</div>;

// ❌ dangerouslySetInnerHTML bypasses escaping
return <div dangerouslySetInnerHTML={{ __html: userInput }} />;

// ✅ If HTML is required, sanitize first
import DOMPurify from 'dompurify';
return <div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />;

// ❌ href with javascript: protocol
return <a href={`javascript:void(${userInput})`}>Click</a>;

// ✅ Validate URL protocol
const safeUrl = userInput.startsWith('https://') ? userInput : '#';
return <a href={safeUrl}>Click</a>;

// ❌ eval / new Function with user input
const result = eval(userInput);

// ❌ innerHTML in refs / effects
useEffect(() => {
  ref.current.innerHTML = userInput;
}, [userInput]);
```

### Vue

```html
<!-- ✅ Vue auto-escapes text interpolation -->
<div>{{ userInput }}</div>

<!-- ❌ v-html bypasses escaping -->
<div v-html="userInput"></div>

<!-- ✅ Sanitize before v-html -->
<div v-html="sanitized(userInput)"></div>
```

```typescript
import DOMPurify from 'dompurify';

export default {
  methods: {
    sanitized(input: string): string {
      return DOMPurify.sanitize(input);
    }
  }
};

// ❌ v-bind:href with javascript: protocol
// <a :href="userInput">Click</a>  — userInput could be "javascript:alert(1)"
```

### Angular

```typescript
// ✅ Angular auto-escapes interpolation (default safe)
template: `<div>{{ userInput }}</div>`

// ❌ bypassSecurityTrustHtml disables sanitization
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {
  this.unsafe = this.sanitizer.bypassSecurityTrustHtml(userInput);
}

// ❌ bypassSecurityTrustUrl with javascript: protocol
this.unsafeUrl = this.sanitizer.bypassSecurityTrustUrl(userInput);

// ✅ Only use bypassSecurityTrust* with server-validated content
// and document the reason
```

### Server-Side Rendering

```typescript
// ❌ SSR: injecting raw user data into HTML
const html = `<div>${userInput}</div>`;

// ✅ Always escape server-side rendered content
import escapeHtml from 'escape-html';
const html = `<div>${escapeHtml(userInput)}</div>`;

// ❌ JSON serialization without escaping
const json = JSON.stringify({ name: userInput });
// userInput could contain </script> to break out of script tags

// ✅ JSON in HTML: escape < and >
const safe = JSON.stringify({ name: userInput })
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e');
```

---

## Content Security Policy (CSP)

CSP is defense-in-depth. Even if XSS escapes output encoding, CSP limits what an attacker can do.

```nginx
# ✅ Recommended CSP (strict)
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

```typescript
// ✅ Express middleware
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
}));
```

```html
<!-- ✅ CSP nonce in script tags -->
<script nonce="{random}">
  // Allowed by CSP
</script>

<!-- ❌ Inline event handlers (blocked by CSP without 'unsafe-inline') -->
<button onclick="doSomething()">Click</button>

<!-- ✅ Event listeners in JS with nonce -->
<script nonce="{random}">
  document.getElementById('btn').addEventListener('click', doSomething);
</script>
```

**CSP anti-patterns to avoid:**
- `script-src 'unsafe-inline'` without nonce/hash
- `script-src 'unsafe-eval'` (enables `eval()`)
- `default-src *` (allows loading from any origin)
- `script-src https:` (allows any HTTPS origin, including attacker-controlled)

---

## Input Validation vs Output Encoding

| Layer | What | When | Example |
|-------|------|------|---------|
| **Input validation** | Reject/clean data on entry | At API boundary | Reject `<script>` in a name field |
| **Output encoding** | Encode data for render context | At render time | `&lt;script&gt;` in HTML |

**Rule**: Input validation is a convenience (reject obviously bad data). Output encoding is the security boundary. Never rely on input validation alone.

---

## Detection & Testing

```bash
# Automated scanning
# OWASP ZAP
zap-cli quick-scan --spider https://example.com

# Manual testing payloads
<script>alert(1)</script>
<img src=x onerror=alert(1)>
" onmouseover="alert(1)
javascript:alert(1)
'-alert(1)-'

# Static analysis (code review)
grep -rn "innerHTML\|dangerouslySetInnerHTML\|v-html\|bypassSecurityTrust\|mark_safe\|@html\|{@html}" src/ js/
grep -rn "eval(\|new Function\|document.write\|setTimeout.*string\|setInterval.*string" src/ js/
```

---

## Review Checklist

- [ ] Framework auto-escaping is relied upon by default (no manual escaping) — N/A here (no framework); instead verify `textContent`/`setAttribute` is used for user data
- [ ] `innerHTML`/`outerHTML` assignments are audited for any interpolated user data
- [ ] Any HTML-rendering escape hatch is preceded by `DOMPurify.sanitize()` or equivalent
- [ ] CSP is configured with nonce-based or hash-based script-src
- [ ] No `eval()`, `new Function()`, or `javascript:` URLs with user input
- [ ] No inline event handlers (`onclick="..."`) when CSP is enabled
- [ ] Server-side rendered content is escaped before injection
- [ ] JSON in HTML is properly escaped (`</script>` → `\u003c/script\u003e`)
