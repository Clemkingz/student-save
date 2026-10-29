# Student Save UI checks

The university snapshot contains 77 Federal, 69 State, and 182 Private universities from the [official NUC directory](https://enuc.nuc.edu.ng/nus), checked on 26 October 2026. Refresh the data when NUC approves more universities.

## Browser checks

- At 320px, 768px, and desktop widths, open Savings Goals → Contribution with at least two goals. Enter different amounts; invalid entries should stay disabled independently. Submit one with your wallet PIN and confirm the other draft remains. Double-clicking Contribute should create only one record.
- Add funds and open Transactions, dashboard activity, Reports, and the receipt. Only the successful added amount should be green and prefixed with `+`. Wallet debits, savings transfers out of the wallet, withdrawals, pending records, and failed records retain their amount styling. Existing local records without a status represent completed records.
- On student verification, search by university name or an abbreviation such as UNILAG or ABUAD. Use arrows, Enter, Escape, and Tab; try the Other option and reopen a saved institution. Submission still stores `institution` as a string.
- Lock savings with a valid PIN: check the open shackle closes before “Savings locked” appears. Enable reduced motion and check the final state appears immediately.
- Collect locked savings. Success should show “Withdrawal successful” at the top; an incorrect PIN should show an error notification. Check manual dismissal and automatic dismissal after roughly 3.5 seconds.
- Review the landing page on mobile, tablet, and desktop, including anchor navigation, focus outlines, section transitions, and reduced motion.

## Automated validation

- `pnpm lint`
- `pnpm check-types`
- `pnpm --filter web test`
- `pnpm exec turbo run build -- --webpack`

The default Turbopack build cannot bind its worker port in this sandbox. The supported Webpack build completes for all three apps. Functional money-flow checks above remain available for manual regression testing.


## Responsive verification

Checked the landing page, dashboard, Add Funds, Transactions, manual contributions, Lock Savings, Reports, Account, and sign-up in headless Chrome at 320, 375, 768, 1024, and 1440 pixels. The student verification form was checked with a pending test account at phone and desktop widths. Additional checks around the 640, 700, 900, 980, and 1100 pixel breakpoints, and at 1920 pixels, found no horizontal page overflow.

Phone and desktop checks also covered bank-transfer dialogs, receipts, contribution settings, and keyboard university selection. Cards now stack according to available content width; long labels and amounts wrap; receipts and dialogs scroll within the viewport; six-month charts fit narrow screens. The browser used isolated local test data.
