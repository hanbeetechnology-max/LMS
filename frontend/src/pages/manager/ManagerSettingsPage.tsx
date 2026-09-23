import { Seo } from "../../lib/Seo";
import { SettingsPanel } from "../../components/app/SettingsPanel";

export function ManagerSettingsPage() {
  return (
    <>
      <Seo title="Settings" description="Manage your HanbeeLms account settings." path="/manager/settings" />
      <SettingsPanel fullName="Morgan Ellis" email="morgan@hanbeelms.edu" role="manager" />
    </>
  );
}
