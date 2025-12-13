# LeaderOS Payment & Billing Specifications

**Document Version:** 1.0  
**Last Updated:** December 13, 2025  
**Purpose:** Technical specifications for attorney review to draft Terms of Service

---

## 1. Subscription Plans

### 1.1 Starter Plan - $1/month
**Features included:**
- 1 Strategic Priority
- 4 Projects
- Unlimited Action-Tasks
- 1 Administrator (account holder)

**Restrictions:**
- No additional users allowed (Co-Lead, Viewer, SME roles unavailable)
- SME tagging for capacity planning NOT available
- Options to add users will be displayed but require upgrade prompt

**Billing:**
- Monthly billing only
- No annual option
- No free trial available

---

### 1.2 LeaderPro Plan - $12/month
**Features included:**
- Unlimited Strategic Priorities
- Unlimited Projects
- Unlimited Action-Tasks
- 1 Administrator (account holder)
- SME tagging for capacity planning purposes

**Restrictions:**
- No additional users allowed (Co-Lead, Viewer roles unavailable)
- Administrator cannot invite team members

**Billing:**
- Monthly: $12/month
- Annual: $120/year (Pay for 10 months, get 12 months - 2 months free)
- 7-Day Free Trial available

---

### 1.3 Team Plan - $22/month (Base)
**Features included:**
- Unlimited Strategic Priorities
- Unlimited Projects  
- Unlimited Action-Tasks
- Full system access
- Up to 6 total users included in base price
- Multiple administrators allowed within user limit
- All role types available: Administrator, Co-Lead, Viewer, SME

**Per-Seat Pricing (7th user and beyond):**
- $6 per additional user per month
- Example: 8 users = $22 base + (2 × $6) = $34/month

**Billing:**
- Monthly: $22/month + $6/additional user
- Annual: $220/year base (Pay for 10 months, get 12 months - 2 months free)
- Additional users: $60/year per user (same 10-for-12 discount)
- 7-Day Free Trial available

---

## 2. Free Trial Terms

### 2.1 Eligibility
- Available for LeaderPro and Team plans only
- Starter plan does NOT include free trial
- One free trial per organization
- Credit card required at trial signup

### 2.2 Trial Duration
- 7 calendar days from subscription creation
- Full feature access during trial period
- Automatic conversion to paid subscription if not cancelled

### 2.3 Trial Cancellation
- Users may cancel anytime during trial
- No charge if cancelled before trial expiration
- All data retained for 30 days after cancellation

---

## 3. User Management (Team Plan)

### 3.1 User Limits
- Base Team plan includes 6 total users
- Total users = All active users across all roles (Administrator, Co-Lead, Viewer, SME)
- Multiple administrators permitted within user limit

### 3.2 Adding Users Mid-Cycle
- Users added mid-billing cycle are NOT prorated
- New users receive immediate access
- Billing for additional users (7th+) begins at NEXT billing cycle
- Example: Add 7th user on day 15 of cycle → no charge until next cycle

### 3.3 Removing Users
- Administrators can remove users at any time
- Removed users lose access immediately
- Billing reduction for removed extra users (7th+) takes effect at NEXT billing cycle
- Users removed mid-cycle: access ends immediately, billing continues through current cycle

### 3.4 Administrator Privileges
- Any administrator can add/remove users up to license limit
- Any administrator can add users beyond limit (triggers additional billing)
- All administrators can manage billing and subscription settings

---

## 4. Upgrade Process

### 4.1 Immediate Upgrades
- Upgrades take effect immediately
- New features available instantly
- Prorated billing for upgrade difference (handled by Stripe)

### 4.2 Feature Unlocking
- All existing data preserved on upgrade
- New feature limits apply immediately
- No data migration required

### 4.3 Annual Billing Upgrades
- Mid-cycle upgrades: prorated credit applied
- Annual users can upgrade anytime with prorated adjustment

---

## 5. Downgrade Process

### 5.1 Downgrade Timing
- Downgrades take effect at END of current billing cycle
- Full feature access maintained until cycle ends
- System displays countdown: "Your LeaderOS downgrade will begin in X days"

### 5.2 User Access on Downgrade (Team → Lower Plan)
- Extra users beyond new plan limit lose access at cycle end
- Organization should remove users before downgrade or system will auto-select
- Auto-selection priority: Most recently added users removed first

### 5.3 Content Handling on Downgrade
**Strategic Priorities (LeaderPro/Team → Starter):**
- First strategic priority by creation date remains fully editable
- Excess strategic priorities become READ-ONLY
- Users can view but not edit read-only priorities
- Users can delete excess priorities to regain edit access on remaining ones

**Projects (LeaderPro/Team → Starter):**
- First 4 projects by creation date remain fully editable
- Excess projects become READ-ONLY
- Same view/delete behavior as strategic priorities

**Users (Team → Lower Plans):**
- All non-administrator users lose access
- Administrator retains full access
- User data preserved but inaccessible

### 5.4 Re-Upgrade After Downgrade
- All read-only content immediately editable again
- Previously removed users can be re-invited
- No data loss from downgrade/upgrade cycle

---

## 6. Payment Processing

### 6.1 Payment Methods
- Credit/debit cards accepted (Visa, Mastercard, American Express, Discover)
- Processed through Stripe
- No cryptocurrency, checks, or wire transfers

### 6.2 Billing Cycles
- Monthly subscriptions: 30-day cycles from subscription start date
- Annual subscriptions: 365-day cycles from subscription start date
- Cycle dates do not change on upgrade/downgrade

### 6.3 Invoices
- Electronic invoices sent via email after each successful charge
- Invoice history available in application billing settings
- Invoices include: plan details, user counts, amounts, applicable taxes

---

## 7. Failed Payment Handling

### 7.1 Grace Period
- 30-day grace period after payment failure
- Full feature access maintained during grace period
- Account NOT suspended during grace period

### 7.2 Payment Failure Notifications
- Email notification sent immediately upon payment failure
- Follow-up emails sent every 3 days for 30 days (approximately 10 emails)
- Emails include: update payment method link, grace period remaining

### 7.3 Post-Grace Period Actions
- After 30 days: Account suspended
- Suspended accounts: Login displays payment required message
- Data retained for 90 days after suspension
- After 90 days: Account and data may be permanently deleted

### 7.4 Payment Method Update
- Users can update payment method at any time
- Updated payment method immediately charged for outstanding balance
- Successful payment restores full access immediately

---

## 8. Cancellation

### 8.1 Cancellation Process
- Users can cancel subscription at any time via billing settings
- No cancellation fees
- Access continues until end of current billing cycle

### 8.2 Post-Cancellation
- Data retained for 90 days after subscription ends
- Users can reactivate within 90 days with data intact
- After 90 days: Data may be permanently deleted
- Users receive email reminder at 7 days before data deletion

### 8.3 Refunds
- No refunds for partial billing periods
- Annual subscriptions: No refunds for unused months
- Free trial cancellations: No charge if cancelled before trial ends

---

## 9. Legacy Accounts

### 9.1 Definition
- Organizations created before [Implementation Date]
- Manually flagged as "legacy" in system

### 9.2 Legacy Benefits
- FREE access at Team plan level indefinitely
- All Team features included at no cost
- Up to 6 users included free
- Additional users beyond 6: $6/user/month (standard Team pricing)

### 9.3 Legacy Status
- Legacy status is permanent and non-transferable
- Cannot be applied to new organizations
- Existing legacy organizations retain status if they add users

---

## 10. Pricing Summary Table

| Plan | Monthly | Annual | Users | Strategic Priorities | Projects | Actions |
|------|---------|--------|-------|---------------------|----------|---------|
| Starter | $1 | N/A | 1 | 1 | 4 | Unlimited |
| LeaderPro | $12 | $120 | 1 | Unlimited | Unlimited | Unlimited |
| Team (Base) | $22 | $220 | 6 | Unlimited | Unlimited | Unlimited |
| Team (+User) | +$6/user | +$60/user | 7+ | — | — | — |

---

## 11. Technical Implementation Notes

### 11.1 Payment Processor
- Stripe (stripe.com)
- PCI DSS compliant
- No card data stored on LeaderOS servers

### 11.2 Subscription Management
- All subscription changes handled via Stripe API
- Webhook integration for real-time status updates
- Automatic retry logic for failed payments (Stripe Smart Retries)

### 11.3 Email Notifications
- Sent via Resend email service
- Payment failure notifications: dpgaus@outlook.com as reply-to
- Transactional emails only (no marketing without consent)

---

## 12. Super Admin Visibility

The designated Super Admin account (dpgaus@outlook.com) has access to:

- **Organization Overview:** All organizations with plan levels and status
- **Revenue Metrics:** Monthly Recurring Revenue (MRR), churn rate
- **User Analytics:** User counts per organization, total platform users
- **Billing History:** All invoices and payment history across organizations
- **Usage Statistics:** Feature usage per tier, adoption metrics

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 13, 2025 | Initial specification document |

---

*This document is intended for internal use and attorney review for Terms of Service drafting. All pricing and features subject to change prior to launch.*
