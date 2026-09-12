import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { submitFeedback } from "@/lib/supabase";

export default function Feedback() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [websiteAlt, setWebsiteAlt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setSubject("");
    setContent("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Honeypot: nếu bot điền trường này thì bỏ qua mà vẫn hiện thông báo thành công.
    if (websiteAlt.trim() !== "") {
      setSuccess("Cảm ơn bạn! Ý kiến của bạn đã được ghi nhận.");
      return;
    }

    if (!content.trim()) {
      setError("Vui lòng nhập nội dung ý kiến.");
      return;
    }
    if (content.length > 500) {
      setError("Nội dung ý kiến không được vượt quá 500 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        full_name: fullName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        content: content.trim(),
      });
      setSuccess("Cảm ơn bạn! Ý kiến của bạn đã được gửi đến ban quản trị.");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi ý kiến thất bại, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-military-red to-military-red-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <MessageSquare className="w-4 h-4 text-military-gold" />
            Phản hồi
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
            Đóng Góp Ý Kiến
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Gửi góp ý, phản ánh của bạn đến ban quản trị để góp phần hoàn thiện hệ thống.
          </p>
        </div>
      </section>

      {/* Form góp ý */}
      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-military-cream-dark p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-military-red-dark">Gửi ý kiến của bạn</h2>
                <p className="text-sm text-foreground-600">
                  Các trường có dấu (*) là bắt buộc
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm mb-4">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 text-sm mb-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot chống spam - người dùng thật sẽ không thấy/nhập trường này */}
              <div className="field-aux" aria-hidden="true">
                <label htmlFor="website_alt">Website</label>
                <input
                  id="website_alt"
                  type="text"
                  name="website_alt"
                  value={websiteAlt}
                  onChange={(e) => setWebsiteAlt(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  readOnly={false}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-military-cream-dark" />
                  <input
                    type="text"
                    name="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Email liên hệ
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-military-cream-dark" />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: ban@donvi.qk5"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Nhập tiêu đề ngắn cho ý kiến"
                  className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Nội dung ý kiến <span className="text-military-red">*</span>
                </label>
                <textarea
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung góp ý, phản ánh của bạn..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-foreground-500">{content.length}/500</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Gửi ý kiến
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-military-red text-military-red font-bold rounded-lg hover:bg-military-red hover:text-white transition-all whitespace-nowrap"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}