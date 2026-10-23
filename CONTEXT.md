# JNJ Site App

A mobile app that gives each building job one place for team chat, materials, photos, issues and site attendance, replacing per-job WhatsApp groups. Any construction company can sign up; JNJ is the pilot company.

## Language

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
