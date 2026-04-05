/* @flake-safe: Safe usage of Date for setup only */

import { registerFirestoreRulesAccessGroups } from './firestoreRulesAccessGroups';
import { registerFirestoreRulesDomainGroups } from './firestoreRulesDomainGroups';
import { registerFirestoreRulesIdentityGroups } from './firestoreRulesIdentityGroups';
import { registerFirestoreRulesSuite } from './firestoreRulesTestHarness';

registerFirestoreRulesSuite(harness => {
  registerFirestoreRulesAccessGroups(harness);
  registerFirestoreRulesDomainGroups(harness);
  registerFirestoreRulesIdentityGroups(harness);
});
