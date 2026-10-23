# JNJ Site App

An app that gives each building job one place for team chat, materials, photos, issues and site attendance, replacing per-job WhatsApp groups. Any construction company can sign up; JNJ is the pilot company.

## Language

### Product

**Mobile app**:
The app on iOS and Android that everyone uses: Site team, Subcontractors, Job leads, Clients, and Admins when away from a desk.
_Avoid_: Builder app, site app

**Admin app**:
The web app where Admins run their Company; it has features the Mobile app does not.
_Avoid_: Back office, dashboard, portal

### Organisation

**Company**:
A business that signs up and runs its Jobs in the app; the unit that pays for add-ons.
_Avoid_: Tenant, account, organisation, builder

**User**:
One real person with one login, who can belong to any number of Companies.
_Avoid_: Account, profile

**Membership**:
A User's place in one Company, carrying their Role in that Company.
_Avoid_: Employment, seat, licence

**Role**:
What a Member is in their Company: Admin, Site team or Subcontractor.
_Avoid_: Permission level, user type

**Admin**:
A Member who runs the Company: sets it up, manages people and Jobs, and orders materials.
_Avoid_: Owner, office

**Site team**:
A Member employed by the Company who works on its Jobs.
_Avoid_: The lads, operative, worker

**Subcontractor**:
A Member from another business, working on the Company's Jobs in one trade.
_Avoid_: Subbie, contractor, trade

**Client**:
A User who has commissioned a Job and sees only that Job; a Client never holds a Membership.
_Avoid_: Customer, homeowner

### Work

**Job**:
A piece of building work a Company carries out for a client at one address.
_Avoid_: Project, site, contract

**Assignment**:
A User's link to one Job, which is what lets them see it. Members and Clients both reach Jobs only through Assignments.
_Avoid_: Allocation, access

**Job lead**:
The Site team member marked on an Assignment as running that Job day to day.
_Avoid_: Foreman, site manager

**Client chat**:
The conversation on a Job between its Client and the Company, seen only by the Client, Admins and the Job lead.
_Avoid_: Client group, WhatsApp group

**Client suggestion**:
A photo or note a Site team member puts forward for the Client; it reaches Client chat only once an Admin or the Job lead approves it.
_Avoid_: Draft, pending post

**Materials request**:
A request from someone on a Job for materials, moving from Requested to Ordered to Delivered; it records who ordered it and when.
_Avoid_: Order, shopping list

**Quiet hours**:
The Company's overnight window in which notifications are held until morning; messages still arrive.
_Avoid_: Do not disturb, out of hours

**Urgent**:
A flag an Admin puts on a message so its notification is sent during Quiet hours.
_Avoid_: Priority, emergency

**Photo tag**:
One of a fixed set of labels on a Job photo: Progress, Delivery, Protection, Building control or Issue.
_Avoid_: Category, folder, section

**Sign-in**:
A record that a Site team member or Subcontractor is On site at a Job, from arrival until they sign out. A Sign-in still open when Quiet hours begin is closed automatically and marked "auto signed out".
_Avoid_: Check-in, clock-in, attendance

**Issue**:
A problem on a Job raised privately to the Admins and Job lead, either Open or Resolved; never seen by the Client or other Subcontractors.
_Avoid_: Snag, defect, ticket

**Extra**:
Work added to a Job at the Client's request, priced by an Admin or the Job lead.
_Avoid_: Variation, change order

**Deduction**:
Work removed from a Job, reducing its price.
_Avoid_: Credit, omission

**Choice**:
A decision the Company puts to the Client as a set of options, which the Client confirms.
_Avoid_: Selection, poll

**Client approval**:
A record that the Client accepted an Extra, Deduction or Choice: who accepted it, the price shown, and when. It is not a signature.
_Avoid_: Sign-off, signature, agreement

**Complete**:
The state of a finished Job. It becomes read-only for everyone; the Client loses Client chat at once and loses all access 12 months later, while the Company keeps the Job and its photos.
_Avoid_: Closed, archived, done

**Invite**:
An SMS link that brings a User into a Company (sent by an Admin) or onto a Job as its Client (sent by an Admin or the Job lead, only when the Company has the Client Portal).
_Avoid_: Sign-up link, onboarding

**Update**:
A post to the Client about the Job's progress, made of text, photos and short videos; posted by Admins or the Job lead.
_Avoid_: Report, newsletter, weekly video

**Reminder**:
A note pinned on the Client's view of a Job asking them to do something, with an optional due date, until the Client marks it done.
_Avoid_: Nudge, task, alert

**On site**:
Physically present at a Job's address. "Site" is only ever used this way, never as a name for the Job itself.
_Avoid_: Using "site" as a noun for a Job

### Billing

**Add-on**:
A paid feature a Company switches on for all its Jobs, priced per Company per month.
_Avoid_: Module, plan, tier, plugin

**Client Portal**:
The Add-on that gives Clients access to their Job: updates, Client chat, choices, and extras and deductions.
_Avoid_: Client side, customer app

**Referral code**:
A Company's code that a new Company enters at sign-up; when the new Company first pays for an Add-on, both earn a free month.
_Avoid_: Promo code, voucher
