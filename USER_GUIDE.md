# FlightCost user guide

## Start with your aircraft

Choose **Set up my aircraft**, enter a name, and fill in what you know. Blank optional financial values remain unknown. Enter zero only if it is genuinely your assumption. Choose Manual, Hobbs or Tach as your default time basis; each flight records its own selected basis. Fuel burn uses the quantity unit; fuel price uses the separately selected price unit. Review numeric values if changing units.

The setup wizard includes optional initial insurance, monthly hangar, annual maintenance cash, and other fixed costs, followed by a review screen. These plans start January 1 of the current year. After setup, add or adjust plans and their dates in **Expenses → Recurring plans**. A monthly plan annualizes to twelve payments for the hourly estimate; its start/end dates determine forecast installments. Return to **Aircraft → Edit profile & assumptions** and confirm the fixed-plan review once those plans are complete. Expected annual utilization must be positive to calculate allocated hourly costs.

You can explore a **fictional Warrior example** from the welcome screen. It has example assumptions only, no invented actual payment history. The banner marks the profile as fictional. Create your real aircraft from Aircraft; switching profiles never mixes their records. Duplicate assumptions does not copy plans or financial history.

## Record payments and flights

In Expenses, add the date, description, category and actual amount. Categories accept custom names. Choose Operating, Principal or Acquisition. Principal is a cash movement but not an operating expense. Enter a fuel purchase once as a payment; quantity is optional.

To reconcile a recurring plan, select the plan and covered month (YYYY-MM). Partial payments are supported. For an annual plan, use its installment's due month. FlightCost rejects months with no scheduled installment and plan changes that would invalidate linked payments. Unlink or revise affected payments before changing a plan's classification or schedule. Unlinked payments cannot automatically reconcile a plan—FlightCost cannot infer which bill they settle.

Attach a PDF, JPG or PNG receipt (up to 10 MB) to a saved payment. Receipts are included in SQLite backups. Use **Save [receipt name]** to export the file for viewing in your preferred application.

Flights accept manual duration or increasing readings from one selected meter. Airports and intermediate stops are descriptive fields. Link actual fuel and trip-fee payments in Expenses. Measured fuel consumption, with its own recorded unit, replaces assumed burn in the flight estimate when supplied. Mark a linked operating payment as a trip-specific fee to include it in the estimate. Fuel purchases cannot be marked as trip fees. Estimated flight costs and linked actual cash are displayed separately to avoid counting fuel twice.

Use search to filter record text, dates, categories or notes. Ascending/descending sorts records by date or description. Edit updates saved records. Delete asks for confirmation; deleting a payment also removes its receipts. Linked flights/plans must first be unlinked from payments. Archive aircraft to retain their history.

## Understand the dashboard

- Economics uses your assumptions and expected hours. The 30-versus-150-hour comparison explains how fixed expenses spread over utilization.
- Cash spending uses recorded payments. Principal and acquisition movements have their own breakdown.
- Forecast shows recorded full-year payments plus outstanding recurring installments. It does not predict unplanned spending.

Unknown values display **Not available** and the dashboard lists missing assumptions. Monthly and category charts appear only when real payments have been entered for the selected aircraft.

## Plan trips and maintenance

Add a trip, enter each leg and its hours, and choose return if flying the same legs back. Leave burn/price blank to use aircraft assumptions. Taxi fuel and fees are total-trip values. Carried reserve fuel is informational. Save to see the breakdown, then edit or duplicate the scenario to compare alternatives. Each saved trip captures the aircraft and recurring-plan assumptions used at that time. Editing and saving refreshes that snapshot; changing the aircraft profile alone does not change a saved estimate. Use Export trip PDF or Print trip for its itemized summary.

Maintenance entries are user-defined reminders by date or engine-hour threshold. Update current engine hours in the aircraft profile. Enter maintenance payments in Expenses so reminders do not create duplicate cash costs. Reminders are organizational aids, not compliance or airworthiness determinations.

## Budgets and reports

Set year, category, amount and month (0 means full year). Use category **All** for the dashboard's annual cash budget. Category and monthly budgets are independent targets, not additive parts of the annual target. All cash classifications count toward budgets.

Reports accepts covered dates for monthly, annual or multi-year reviews. Choose among ownership, monthly, hourly cost, fuel, maintenance, budget, multi-year and aircraft-comparison reports. PDF and report CSV use the same values as the on-screen preview. PDFs include assumptions, repeat table headers across pages, and carry page numbers. Budget reports evaluate entire configured budget periods within the selected years. Printing opens the Windows print dialog. Expense CSV contains all payments for the selected aircraft; JSON exports all records.

CSV import requires headers `date,description,category,amount`; optional columns are `vendor,notes,payment,kind,fuelQuantity,fuelUnit`. Dates use YYYY-MM-DD and amounts use a decimal point. Imports are validated as a batch and require confirmation. Imported records receive new IDs; aircraft is the current selection. Flight/plan links are cleared. Re-importing duplicates records. Spreadsheet formula-like exported text is prefixed with an apostrophe for safety.

## Protect your records

Use Settings → Create verified backup regularly. Choose a new filename. Restore first validates the backup, asks before replacing data, and makes a recovery backup in the application-data folder. Store an extra copy away from the computer. A JSON or CSV export is useful for portability but does not replace a full SQLite backup with receipts.

Settings also controls theme and the optional support link. Financial data is never uploaded when opening the website or support link.

If startup cannot read a damaged database, choose Recover from backup. FlightCost verifies the selected backup and preserves the original database files in a timestamped recovery folder before replacing the active copy. Canceling leaves the existing files intact.
