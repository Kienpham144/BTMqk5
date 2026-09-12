import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";

export default function Footer() {
  const { t } = useTranslation();

  const quickLinks = [
    { label: t("nav_home"), path: "/" },
    { label: t("nav_edu"), path: "/competitions" },
    { label: t("nav_hochiminh"), path: "/results" },
    { label: t("nav_emulation"), path: "/thi-dua-khen-thuong" },
    { label: "Thư viện tài liệu", path: "/materials" },
    { label: "Thư viện video", path: "/videos" },
    { label: "Đóng góp ý kiến", path: "/feedback" },
  ];

  const infoLinks = [
    { label: t("nav_news"), path: "/news" },
    { label: t("nav_about"), path: "/about" },
    { label: t("footer_terms"), path: "/terms" },
    { label: t("footer_privacy"), path: "/privacy" },
  ];

  return (
    <footer className="bg-military-red-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/c5f13968d32ad47aae2a7bb23e002a71.png"
                alt="Logo Bộ Tham Mưu Quân Khu 5"
                className="h-12 w-12 object-contain rounded-full"
              />
              <div>
                <h3 className="font-bold text-base">BỘ THAM MƯU QUÂN KHU 5</h3>
                <p className="text-military-gold text-sm">19-12-1946</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Hệ thống thi trực tuyến phục vụ công tác tuyên truyền giáo dục, nâng cao nhận thức cho cán bộ, nhân viên chiến sĩ toàn Bộ Tham mưu Quân khu.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-base mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-military-gold" />
              Liên Kết Nhanh
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-white/70 hover:text-military-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {infoLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-white/70 hover:text-military-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-base mb-4">Thông Tin Liên Hệ</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-military-gold shrink-0 mt-0.5" />
                <span className="text-sm text-white/70">{t("footer_address_value")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-military-gold shrink-0" />
                <span className="text-sm text-white/70">{t("footer_phone_value")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-military-gold shrink-0" />
                <span className="text-sm text-white/70">{t("footer_email_value")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
            <p>{t("footer_rights")}</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-white/70 transition-colors">
                {t("footer_terms")}
              </Link>
              <Link to="/privacy" className="hover:text-white/70 transition-colors">
                {t("footer_privacy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}