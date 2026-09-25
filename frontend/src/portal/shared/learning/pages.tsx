import { CertificatesView } from "./CertificatesView";
import { ReviewsView } from "./ReviewsView";

export const StaffReviewsPage = () => <ReviewsView />;
export const StaffCertificatesPage = () => <CertificatesView />;
export const ManagerReviewsPage = () => <ReviewsView readOnly />;
export const ManagerCertificatesPage = () => <CertificatesView readOnly />;
