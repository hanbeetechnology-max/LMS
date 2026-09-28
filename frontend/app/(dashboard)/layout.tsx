import { ThemeProvider } from "./ThemeProvider";
import { ModeProvider } from "./ModeContext";
import ClientLayout from "./ClientLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ModeProvider>
        <ClientLayout>
          {children}
        </ClientLayout>
      </ModeProvider>
    </ThemeProvider>
  );
}
