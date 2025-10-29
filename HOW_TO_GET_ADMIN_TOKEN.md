# Shopify Admin API Token Kaise Generate Kare

## ⚠️ Important Note
**Admin API Token** Partner Dashboard se nahi, **Shopify Admin** (merchant store) se banaya jata hai.

## Method 1: Private App se Admin Token (Easy Way)

### Steps:

1. **Shopify Admin mein jao**
   - Apni store open karo: `https://h1e4vg-m3.myshopify.com/admin`
   - Login karo

2. **Settings → Apps and sales channels**
   - Left sidebar se "Settings" click karo
   - Phir "Apps and sales channels" click karo

3. **Develop apps section**
   - Page ke bottom par "Develop apps" section dekho
   - "Allow custom app development" enable karo (agar disabled hai)

4. **New custom app create karo**
   - "Create an app" button click karo
   - App name dene karo (e.g., "Health Report Activation")
   - "Create app" click karo

5. **Admin API access configure karo**
   - App page par "Configure Admin API scopes" click karo
   - Required scopes select karo:
     - ✅ `write_customers` (Customer metafields ke liye)
     - ✅ `read_customers` (optional, but recommended)
   - "Save" click karo

6. **Install app karo**
   - "Install app" button click karo
   - Confirm karo

7. **Admin API access token copy karo**
   - App page par "API credentials" tab par jao
   - "Admin API access token" section mein token dikhega
   - "Reveal token once" click karo
   - Token copy karo (ye `shpat_...` format mein hoga)

8. **Token ko environment variable mein add karo**
   ```
   SHOPIFY_ADMIN_API_TOKEN=shpat_your_token_here
   ```

---

## Method 2: OAuth-based App (Recommended - Current Setup)

Agar aap Partners Dashboard se app banaye hain, to OAuth tokens automatically generate hote hain. Admin API token ki zarurat nahi!

### Current Code Problem:
Aapka code direct Admin API token use kar raha hai, lekin:
- ✅ OAuth-based apps ke liye session-based auth use karna chahiye
- ✅ Token automatically generate hota hai jab store app install karta hai

### Better Approach (OAuth):

Agar aap OAuth-based app use kar rahe hain (jo Partner Dashboard se create hui hai), to:

1. **App ko store par install karo**
   - App installation ke baad session automatically database mein save hota hai
   - Access token session object mein hota hai

2. **Code update karo** - Session-based auth use karo (pehle wala approach)

Ya phir **Private App token** use karo (Method 1 se token leke)

---

## Quick Summary

### Private App Token (Method 1):
- ✅ Shopify Admin mein banaya jata hai
- ✅ Direct access token milta hai
- ✅ Simple - directly use kar sakte ho
- ❌ Store owner ko manually create karna padta hai

### OAuth App Token (Method 2):
- ✅ Partner Dashboard se app create hota hai
- ✅ Automatic installation
- ✅ Store owner easily install kar sakta hai
- ❌ Code mein session-based auth use karna padta hai

---

## For Your Code:

Agar **Method 1 (Private App)** use kar rahe ho:
1. Shopify Admin se token generate karo (steps above)
2. Token ko `.env` aur Vercel environment variables mein add karo
3. Current code kaam karega! ✅

Agar **OAuth App** use kar rahe ho:
1. Store owner ko app install karni hogi
2. Code update karna padega to use session-based auth
3. Ya phir Private App token use karo for simplicity

---

## Current Recommendation:

Aapke case mein, **Private App token use karo**:
1. Store admin: `https://h1e4vg-m3.myshopify.com/admin`
2. Settings → Apps → Develop apps
3. Custom app banao
4. `write_customers` scope diyo
5. Install karo
6. Token copy karo
7. Environment variable mein add karo

**Ye sabse simple approach hai!** 🎯

