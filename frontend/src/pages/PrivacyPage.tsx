import { Seo } from "../lib/Seo";
import { StaticContentPage } from "../components/StaticContentPage";

export function PrivacyPage() {
  return (
    <>
      <Seo title="Privacy Policy" description="How HanbeeLms handles your data." path="/privacy" />
      <StaticContentPage title="Privacy Policy">
        <p>
          This is a placeholder privacy policy for HanbeeLms, a project currently in active development. A full
          policy covering data collection, storage, and retention will be published before any real user data is
          processed.
        </p>
        <p>
          Today, HanbeeLms runs entirely on mock, local data for demonstration purposes — no personal information is
          collected, stored, or transmitted to any server.
        </p>
      </StaticContentPage>
    </>
  );
}
