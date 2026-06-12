# Draft: Stripe third-party privacy section (flips live in Phase 6)

Prepared in Phase 4.5 per the dev plan ("draft the Stripe-as-third-party
privacy section here; it flips live in Phase 6 with the payment links"), so the
trust change ships deliberately, alongside the links, with a dated CHANGELOG
entry — privacy.html's own change-disclosure promise.

**Phase 6, do all three together:**

1. Replace privacy.html's "No billing in v0.2" section with the section below.
2. Add the dated CHANGELOG entry.
3. Only then publish the Stripe payment links on api.html.

---

## Section to replace "No billing in v0.2" in privacy.html

```html
<h2>Payments (Pro early access)</h2>
<p>Pro early access is paid through <a href="https://stripe.com" target="_blank" rel="noopener">Stripe</a> payment links. If you buy, Stripe collects and processes your payment details under <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Stripe's privacy policy</a>; CheapAgent never sees or stores your card details. What we receive from Stripe is the receipt: your email and what you bought, which we use to turn on your Pro allowance by hand and to support you. There is no billing code in this site &mdash; fulfillment is a human reading a Stripe email. Cancelling is an email away, and account deletion (above) covers the Pro record too.</p>
```

## CHANGELOG entry to ship with it

```markdown
### Changed (privacy)

- privacy.html: "No billing in v0.2" replaced with a Payments section — Pro
  early access is paid via Stripe payment links; Stripe processes payment
  details under its own policy; we receive and keep only the receipt (email +
  product) to fulfill the allowance manually. Disclosed the same day the
  payment links went live, per the page's change-disclosure promise.
```
