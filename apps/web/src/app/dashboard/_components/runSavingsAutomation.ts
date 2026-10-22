import { getMockTransactions, localDateValue } from "./mockFinance";
import {
  readFinanceList,
  saveFinance,
  withFinanceLock,
} from "./financeStorage";
import {
  applyDueContributions,
  type SavingsContribution,
  type SavingsGoal,
} from "./savingsAutomation";

export function runSavingsAutomation(email: string) {
  return withFinanceLock(email, () => {
    const transactions = getMockTransactions(email);
    const goalsKey = `studentsave:savings-goals:${email}`;
    const contributionsKey = `studentsave:savings-contributions:${email}`;
    const result = applyDueContributions(
      readFinanceList<SavingsGoal>(goalsKey),
      readFinanceList<SavingsContribution>(contributionsKey),
      transactions,
      localDateValue(),
    );
    if (result.changed)
      saveFinance(email, {
        [goalsKey]: result.goals,
        [contributionsKey]: result.contributions,
        [`studentsave:transactions:${email}`]: result.transactions,
      });
    return result;
  });
}
