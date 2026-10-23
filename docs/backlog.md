# Feature backlog

The MVP features planned in #1 (Spec: JNJ Site App MVP), parked while the platform foundation (#23) is built. #1–#22 were written for the .NET stack (ADR 0004, now superseded) and are closed as "not planned"; their full text, user stories and acceptance criteria are still on GitHub. To pick a feature up, re-issue it as a new ticket (or run it through `/grill-with-docs` → `/to-spec`) using the Supabase stack from ADRs 0006–0008 and the foundation tickets below.

## Where the old tickets went

| Old | Now |
| --- | --- |
| #1 Spec: JNJ Site App MVP | Source of the MVP user stories; its Implementation and Testing Decisions are replaced by ADRs 0006–0008 and #23 |
| #2 Walking skeleton | #27 Walking skeleton: Company sign-up and SMS login |
| #3 Invite people to the Company | #28 Invite people to the Company |
| #4 Log a Job and assign people | #29 Log a Job and assign people |
| #13 Client Portal billing | #30 Client Portal billing |

## Parked features

Blockers are translated to the new ticket numbers.

### Free core

- **#5 Materials requests**: anyone on a Job raises a Materials request; Admins see all open requests, mark Ordered (who and when) and Delivered. Blocked by #29.
- **#6 Internal chat**: a text chat per Job for everyone assigned; Clients never see it. Uses Supabase Realtime over messages stored in Postgres, push when the app is closed. Blocked by #29.
- **#7 Photo log**: take or pick a photo, add a Photo tag, save to the Job; Admins filter and export. Uses private Supabase Storage scoped by Company and Job, short-lived signed links, compression on the phone. Blocked by #29.
- **#8 Issues**: raised privately to Admins and the Job lead with optional photos; marked Resolved with who and when. Blocked by #7.
- **#9 Site attendance**: Sign-in on arrival and sign out on leaving; "On site now" list; Job lead can correct Sign-ins. Blocked by #29.
- **#10 Push notifications and Quiet hours**: push for activity on a User's Jobs, held during Quiet hours unless Urgent; open Sign-ins auto-closed at the start of Quiet hours. Uses Expo push sent from an Edge Function on database events, and pg_cron scheduled jobs for Quiet hours. Blocked by #6, #9.
- **#11 Offline queue**: photos, Sign-ins and Materials requests made without signal are queued and sent later, keeping their original time, never duplicated; chat stays online-only. Blocked by #5, #7, #9.
- **#12 Complete a Job**: an Admin marks a Job Complete and it becomes read-only for everyone; the Company keeps it. Blocked by #5, #6, #7, #8, #9.

### Client Portal

- **#14 Client invite, login and Job overview**: an Admin or Job lead invites a Client by SMS, only with the Client Portal; Clients hold an Assignment, never a Membership. Blocked by #29, #30.
- **#15 Client chat**: between the Client, Admins and the Job lead; Clients can send photos; Quiet hours notice. Blocked by #6, #14.
- **#16 Client suggestions**: a Site team member suggests a photo or note; Admins or the Job lead approve it into Client chat. Blocked by #7, #15.
- **#17 Updates**: text, photos and short videos to the Client, with a push for each. Blocked by #7, #10, #14. _Note: #17 said videos up to 2 minutes; #23 set a 60-second limit. Settle this when the feature is picked up._
- **#18 Choices and Client approval**: the Client confirms one option; a Client approval records who, which option and when. Blocked by #14.
- **#19 Extras and Deductions**: priced by an Admin or Job lead, approved by the Client with the price shown. Blocked by #18.
- **#20 Reminders**: pinned on the Client's overview with an optional due date and one push on that date. Blocked by #10, #14.
- **#21 Client access ending**: on Complete, the Client loses Client chat at once and all access after 12 months; cancelling the Client Portal removes Client access. Blocked by #12, #30, #15.
- **#22 Referral codes**: Referral code on the billing page and at sign-up; a free month for both Companies on the referred Company's first payment, via Stripe coupons (ADR 0008). Blocked by #30.

## Foundation pieces carried by these features

#23 lists push device registration and sending, the Quiet hours scheduled job, the Storage folders and rules, and the realtime channel as foundations. No foundation ticket builds them; they are built with #10, #7 and #6 respectively when those are picked up.
