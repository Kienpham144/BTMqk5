import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-military-cream px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-military-red/10 flex items-center justify-center mb-4">
            <i className="ri-error-warning-line text-5xl text-military-red" />
          </div>
          <h1 className="text-6xl font-extrabold text-military-red-dark mb-2">404</h1>
          <h2 className="text-2xl font-bold text-military-red-dark mb-4">{t("not_found_title")}</h2>
          <p className="text-foreground-700 max-w-md mx-auto">{t("not_found_desc")}</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors"
        >
          <Home className="w-5 h-5" />
          {t("not_found_back")}
        </Link>
      </div>
    </div>
  );
}