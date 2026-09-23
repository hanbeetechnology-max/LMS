import { Seo } from "../lib/Seo";
import { StaticContentPage } from "../components/StaticContentPage";

export function ContactPage() {
  return (
    <>
      <Seo title="Contact" description="Get in touch with the HanbeeLms team." path="/contact" />
      <StaticContentPage title="Contact us">
        <p>Have a question about HanbeeLms, or need help with your account? Reach out and we'll get back to you.</p>
        <a
          href="mailto:support@hanbeelms.edu"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
        >
          support@hanbeelms.edu
        </a>
      </StaticContentPage>
    </>
  );
}
