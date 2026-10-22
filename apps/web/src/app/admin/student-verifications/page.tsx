// Keep mock review on the student app origin so both views share browser storage.
import "../../../../../admin/src/app/globals.css";

import { StudentVerificationReview } from "../../../../../admin/src/components/StudentVerificationReview";

export default function MockAdminReviewPage() {
  return <StudentVerificationReview reviewPath="/admin/student-verifications" studentOrigin="" />;
}
