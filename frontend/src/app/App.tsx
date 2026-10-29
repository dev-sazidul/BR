import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "../auth/AuthProvider";
import { AppConfigProvider } from "./ConfigProvider";
import { Layout } from "../components/layout/Layout";
import { AboutPage } from "../pages/AboutPage";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";
import { ContactPage } from "../pages/ContactPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SignInPage } from "../pages/SignInPage";
import { TermsPage } from "../pages/TermsPage";

export default function App() {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </AppConfigProvider>
  );
}
