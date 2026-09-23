import { Seo } from "../lib/Seo";
import { StaticContentPage } from "../components/StaticContentPage";

export function TermsPage() {
  return (
    <>
      <Seo title="Terms of Service" description="Terms for using HanbeeLms." path="/terms" />
      <StaticContentPage title="Terms of Service">
        <p>
          This is a placeholder terms of service for HanbeeLms, a project currently in active development. Full
          terms will be published before any production launch.
        </p>
        <p>
          By using this preview, you understand it runs entirely on mock, local data — nothing you do here is
          persisted to a real database or shared with anyone.
        </p>
      </StaticContentPage>
    </>
  );
}
