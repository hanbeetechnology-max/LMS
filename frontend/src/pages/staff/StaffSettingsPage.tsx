import { Seo } from "../../lib/Seo";
import { SettingsPanel } from "../../components/app/SettingsPanel";

export function StaffSettingsPage() {
  return (
    <>
      <Seo title="Settings" description="Manage your HanbeeLms account settings." path="/staff/settings" />
      <SettingsPanel fullName="Jamie Rivera" email="jamie@hanbeelms.edu" role="staff" />
    </>
  );
}
