import { Seo } from "../../lib/Seo";
import { SettingsPanel } from "../../components/app/SettingsPanel";

export function StudentSettingsPage() {
  return (
    <>
      <Seo title="Settings" description="Manage your HanbeeLms account settings." path="/student/settings" />
      <SettingsPanel fullName="Ava Chen" email="ava@student.edu" role="student" />
    </>
  );
}
