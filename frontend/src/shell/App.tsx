"use client";

import { AuthProvider } from "../auth/AuthProvider";
import { Layout } from "../components/layout/Layout";
import { useLocation } from "../lib/navigation";
import { AboutPage } from "../views/AboutPage";
import { AccountSettingsPage } from "../views/AccountSettingsPage";
import { ContactPage } from "../views/ContactPage";
import { ForgotPasswordPage } from "../views/ForgotPasswordPage";
import { HomePage } from "../views/HomePage";
import { NotFoundPage } from "../views/NotFoundPage";
import { PortraitPage } from "../views/PortraitPage";
import { PrivacyPage } from "../views/PrivacyPage";
import { ProfilePage } from "../views/ProfilePage";
import { RegisterPage } from "../views/RegisterPage";
import { ResetPasswordPage } from "../views/ResetPasswordPage";
import { SignInPage } from "../views/SignInPage";
import { TermsPage } from "../views/TermsPage";
import { AppConfigProvider } from "./ConfigProvider";

function pageFor(pathname: string) {
  switch (pathname) {
    case "/":
      return <HomePage />;
    case "/portrait":
      return <PortraitPage />;
    case "/about":
      return <AboutPage />;
    case "/contact":
      return <ContactPage />;
    case "/privacy":
      return <PrivacyPage />;
    case "/terms":
      return <TermsPage />;
    case "/sign-in":
      return <SignInPage />;
    case "/register":
      return <RegisterPage />;
    case "/forgot-password":
      return <ForgotPasswordPage />;
    case "/reset-password":
      return <ResetPasswordPage />;
    case "/profile":
      return <ProfilePage />;
    case "/account":
      return <AccountSettingsPage />;
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <AppConfigProvider>
      <AuthProvider>
        <Layout>{pageFor(pathname)}</Layout>
      </AuthProvider>
    </AppConfigProvider>
  );
}
