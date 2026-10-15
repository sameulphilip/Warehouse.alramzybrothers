# ملف العميل والمورد Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opening a client or supplier name shows their data, invoice summary, invoice list, and account statement.

**Architecture:** One read-only profile request per party type returns the party, invoice summary, one invoice page, and one statement page. The existing name click opens that profile in the current drawer. Invoice clicks still open the invoice and return to the same profile pages.

**Tech Stack:** Express, mssql against SQL Server 2008, the existing Arabic RTL warehouse app.

## Global Constraints

- Read only. No inserts, updates, or test documents.
- Client balance movement is debit minus credit. Supplier balance movement is credit minus debit.
- Invoice due and account balance stay independent.
- Page size is 20. Pages below 1 become 1. A page past the end returns an empty row list and keeps the total.
- Missing account code returns `reason: "no-account"` and does not query the journal.
- An account with no movements returns `reason: "empty"` and balance 0.
- Invalid or negative ids return 400. Missing records return 404. Database failure returns 500 with «تعذر تحميل الملف».
- SQL pagination uses `ROW_NUMBER`, not `OFFSET/FETCH`.
- Do not cache the profile response.

---

### Task 1: Profile API

**Files:**
- Modify: `warehouse-app/server.js`
- Test: live `GET /api/clients/:id/profile` and `GET /api/suppliers/:id/profile`

**Interfaces:**
- Consumes: `tblClients`, `tblSuppliers`, `tblSellingInvoice`, `tblPurchaseInvoice`, `tblJournalEntry`, `tblJournalEntryDetails`
- Produces: `{ party, summary, invoices, statement }` as specified in `docs/superpowers/specs/2026-10-14-party-profile-design.md`

- [ ] **Step 1: Add the read-only profile loader and both routes**

- [ ] **Step 2: Check syntax with `node --check server.js`**

- [ ] **Step 3: On a real client and supplier, match the summary to invoice totals and the statement balance to the signed journal sum**

### Task 2: Profile drawer

**Files:**
- Modify: `warehouse-app/public/app.js`
- Modify: `warehouse-app/public/styles.css`
- Modify: `warehouse-app/public/index.html`

**Interfaces:**
- Consumes: `GET /api/clients/:id/profile` and `GET /api/suppliers/:id/profile`
- Produces: `openPartyProfile(kind, id, invoicePage, statementPage)`

- [ ] **Step 1: Replace the client and supplier invoice drawers with the profile**

- [ ] **Step 2: Keep invoice open and close returning to the same two page numbers**

- [ ] **Step 3: Publish the app and confirm the cache query is `20261014a`**
