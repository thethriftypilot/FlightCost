# Financial definitions and calculation contract

All estimates are based on explicitly entered assumptions. They are budgeting estimates, not market quotations, tax advice, flight planning, or an assessment of airworthiness.

## Three separate views

**Cash spending:** sums actual payments dated within the selected period. Includes principal and acquisition cash movements in the headline cash total, but separates those from operating cash. Engine overhauls appear here only when a payment is entered. No reserve accrual is added.

**Operating economics:** annualized active fixed plans divided by expected utilization, plus consumption and hourly allowances, plus any expressly configured annual depreciation, interest or opportunity cost divided by utilization. Actual payments are not added to this estimate. Purchase price and principal repayment are excluded.

**Committed cash forecast:** recorded payments across the selected calendar year plus unpaid installments from recurring plans due in that year. Payments reconcile a plan only when linked to its ID and covered YYYY-MM period. A $2,400 installment with a $1,000 linked payment leaves $1,400 unpaid, so the combined figure is $2,400 rather than $3,400. A prepayment in the previous year can cover a next-year installment without becoming next-year cash. Amounts above an installment never create negative unpaid amounts. Unpaid overdue installments remain included. This is not a complete prediction: unscheduled fuel, maintenance and future trips are excluded unless planned explicitly. Partial-year cash is not multiplied by twelve.

## Equations

Annual fixed run rate = sum of fixed plans active on the calculation date, annualized at 12 × monthly, 4 × quarterly, or 1 × annual amount. This is a run rate, not a prorated calendar-year total. Installment forecasts use actual due dates, start/end boundaries, and end-of-month clamping (Jan 31 → Feb 28/29 → Mar 31).

Only Operating plans may be marked as fixed ownership costs. Principal and acquisition plans remain in the cash forecast and are excluded from operating economics. Linked payments must use the same classification as their plans. Fixed/hour = annual fixed run rate / expected annual hours.

Fuel/hour = burn/hour converted into the price unit × price/unit.

1 US gallon = 3.785411784 liters. Imperial gallons are not supported.

Engine reserve/hour = manual rate **or** assumed overhaul budget / assumed remaining hours. The methods are mutually exclusive. Zero remaining hours makes the derived rate unavailable. A reserve is a planning allowance, not an amount held in a bank account or paid to a shop.

Variable/hour = fuel + oil allowance + maintenance allowance + engine reserve + propeller reserve + other use-based allowance.

Fully loaded/hour = variable/hour + fixed/hour + optional annual economic costs / expected hours.

Optional depreciation, interest and opportunity costs are excluded when blank, and identified as optional. Other missing required assumptions remain unknown. Zero annual hours makes allocated hourly costs unavailable. Fixed totals remain unknown until the user confirms their fixed-plan review; a deliberately empty confirmed plan list means zero fixed costs.

## Trips

Hours = sum of leg hours × 2 for a return along the same legs, otherwise × 1.

Consumed quantity = hours × burn/hour + total-trip taxi fuel.

Fuel cost = consumed quantity converted to price units × price/unit.

Incremental estimate = consumed fuel cost + oil allowance × hours + total-trip fees. It excludes maintenance/engine/propeller/other reserves and fixed/economic allocation.

Operating reserves = hourly reserves × trip hours.

Fully loaded trip = incremental estimate + operating reserves + fixed/hour × trip hours + optional economic/hour × trip hours.

Carried reserve fuel is informational and is **not** assumed consumed. Taxi fuel and fees are whole-trip totals, not multiplied again for return. A cost per passenger is informational and does not establish legal permission to charge anyone. Airport names are labels; distance is not used to invent flight time.

## Flights

Manual duration is used only for Manual basis. Hobbs and Tach use their own entered ending minus starting readings. Readings must increase. Meter bases are never implicitly converted. Cash fuel purchases are entered separately in Expenses; fuel burned is not a second cash expense. Flight summaries use current aircraft estimates; linked cash is a separate figure and is not added to estimated fuel/reserves. Measured consumption in the recorded fuel unit replaces assumed burn when available. Only explicitly marked trip-fee payments are added to the flight estimate; fuel purchases cannot be marked as trip fees. Saved trip estimates capture their aircraft and plan assumptions, while flight summaries and general ownership estimates use current assumptions. Editing and saving a trip refreshes its snapshot.

## Precision and currencies

Decimal.js performs monetary sums, multiplication and division using decimal arithmetic. Currency formatting is a display boundary; internal rates retain precision. Recorded payments, recurring-plan amounts, and budgets reject sub-cent values. Display rounding is two decimals with half-up behavior in reference calculations. USD, CAD, EUR and GBP are supported as independent two-decimal currencies. No foreign exchange conversion is performed, and comparisons retain currency labels. Changing units requires reviewing both numeric assumptions and their units.

## Verified reference

Insurance $2,400 + hangar $3,600 = $6,000 fixed annually. At 150 h, fixed/hour = $40. At 9 US gal/h × $6/gal, fuel/hour = $54. Engine $20/h + maintenance $15/h brings variable/hour to $89 and fully loaded/hour to $129.

A 2.5 h trip uses $135 fuel, $87.50 reserves and $100 fixed allocation. Fully loaded = $322.50; incremental excluding reserves and fixed allocation = $135.

Insurance alone allocates to $80/h at 30 hours and $16/h at 150 hours. The bill is unchanged; only the allocation changes.

If financing interest is configured both as a fixed Loan interest plan and as optional annual interest, loaded estimates remain unavailable until the duplicate assumption is resolved. Fuel burn and overhaul budget are aircraft totals; multi-engine aircraft must enter total burn and the intended total reserve budget.
