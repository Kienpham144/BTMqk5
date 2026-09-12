import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Phone, Building2, Award, Briefcase, ChevronRight, HelpCircle, Clock, Trophy, AlertCircle, X, Info, Layers } from "lucide-react";
import type { Competition } from "@/lib/supabase";
import type { GuestInfo } from "@/lib/supabase";

interface ProfileLike {
  full_name?: string | null;
  unit?: string | null;
  phone?: string | null;
}

interface ExamIntroProps {
  comp: Competition;
  total: number;
  maxScore: number;
  requireLogin?: boolean;
  profile?: ProfileLike | null;
  blockedMessage?: string;
  questionSets?: string[];
  selectedSet?: string;
  onSelectSet?: (set: string) => void;
  onStart: (guest: GuestInfo | null) => void;
}

export default function ExamIntro({ comp, total, maxScore, requireLogin, profile, blockedMessage, questionSets, selectedSet, onSelectSet, onStart }: ExamIntroProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [unit, setUnit] = useState(profile?.unit ?? "");
  const [rank, setRank] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState("");
  const [showNotice, setShowNotice] = useState(!requireLogin && comp.status === "open");
  const [startAfterNotice, setStartAfterNotice] = useState(false);

  const isOpen = comp.status === "open";

  const dismissNotice = () => {
    setShowNotice(false);
    if (startAfterNotice) {
      setStartAfterNotice(false);
      onStart(null);
    }
  };

  useEffect(() => {
    if (!showNotice) return undefined;
    const timer = setTimeout(() => {
      setShowNotice(false);
      setStartAfterNotice((prev) => {
        if (prev) onStart(null);
        return false;
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, [showNotice, startAfterNotice, onStart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!unit.trim()) {
      setError("Vui lòng nhập đơn vị.");
      return;
    }
    setError("");
    onStart({
      fullName: fullName.trim(),
      phone: phone.trim(),
      unit: unit.trim(),
      rank: rank.trim(),
      position: position.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-military-cream-dark overflow-hidden">
            <div className="bg-military-red text-white px-6 md:px-10 py-5">
              <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Clock className="w-3.5 h-3.5" />
                Phòng thi trực tuyến
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{comp.title}</h1>
              <p className="text-white/85 text-sm mt-1 leading-relaxed">
                {comp.description || "Cuộc thi trắc nghiệm trực tuyến nhằm ôn tập, kiểm tra kiến thức."}
              </p>
            </div>

            <div className="p-6 md:p-10">
              {questionSets && questionSets.length > 1 && (
                <div className="mb-8">
                  <h2 className="text-base font-extrabold text-military-red-dark mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-military-red" />
                    Chọn bộ đề thi
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {questionSets.map((set) => {
                      const active = selectedSet === set;
                      return (
                        <button
                          key={set}
                          type="button"
                          onClick={() => onSelectSet?.(set)}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? "border-military-red bg-military-red text-white"
                              : "border-military-cream-dark bg-white text-military-red-dark hover:border-military-red"
                          }`}
                        >
                          <Layers className={`w-4 h-4 ${active ? "text-white" : "text-military-red"}`} />
                          {set}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-military-cream rounded-xl border border-military-cream-dark p-4 text-center">
                  <HelpCircle className="w-6 h-6 text-military-red mx-auto mb-1.5" />
                  <div className="text-2xl font-extrabold text-military-red-dark">{total}</div>
                  <div className="text-xs text-foreground-600">Câu hỏi</div>
                </div>
                <div className="bg-military-cream rounded-xl border border-military-cream-dark p-4 text-center">
                  <Clock className="w-6 h-6 text-military-red mx-auto mb-1.5" />
                  <div className="text-2xl font-extrabold text-military-red-dark">{comp.time_limit_minutes}</div>
                  <div className="text-xs text-foreground-600">Phút làm bài</div>
                </div>
                <div className="bg-military-cream rounded-xl border border-military-cream-dark p-4 text-center">
                  <Trophy className="w-6 h-6 text-military-red mx-auto mb-1.5" />
                  <div className="text-2xl font-extrabold text-military-red-dark">{maxScore}</div>
                  <div className="text-xs text-foreground-600">Điểm tối đa</div>
                </div>
              </div>

              {blockedMessage && (
                <div className="inline-flex items-start gap-2 bg-military-red/5 border border-military-red/40 text-military-red rounded-lg p-4 text-sm text-left mb-6 w-full">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{blockedMessage}</span>
                </div>
              )}

              {!isOpen ? (
                <div className="inline-flex items-start gap-2 bg-military-gold/20 border border-military-gold text-military-red-dark rounded-lg p-4 text-sm text-left mb-6 w-full">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    {comp.status === "coming"
                      ? "Cuộc thi chưa mở. Vui lòng quay lại khi cuộc thi bắt đầu."
                      : "Cuộc thi đã kết thúc."}
                  </span>
                </div>
              ) : (
                <>
                  {requireLogin ? (
                    <div>
                      <h2 className="text-lg font-extrabold text-military-red-dark mb-1">
                        Tài khoản dự thi
                      </h2>
                      <p className="text-sm text-foreground-600 mb-5">
                        Cuộc thi yêu cầu đăng nhập tài khoản cán bộ. Bạn đang đăng nhập với tài khoản dưới đây.
                      </p>

                      <div className="space-y-3 bg-military-cream rounded-xl border border-military-cream-dark p-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-foreground-500">Họ và tên</div>
                            <div className="text-sm font-bold text-military-red-dark truncate">
                              {profile?.full_name || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-foreground-500">Đơn vị</div>
                            <div className="text-sm font-bold text-military-red-dark truncate">
                              {profile?.unit || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setStartAfterNotice(true);
                          setShowNotice(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Vào phòng thi
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <p className="text-xs text-foreground-500 text-center mt-3">
                        Bấm vào phòng thi nghĩa là bạn đã sẵn sàng và đồng ý bắt đầu tính giờ.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <h2 className="text-lg font-extrabold text-military-red-dark mb-1">
                        Nhập thông tin người dự thi
                      </h2>
                      <p className="text-sm text-foreground-600 mb-5">
                        Không cần đăng nhập — chỉ cần điền đầy đủ thông tin bên dưới để vào thi.
                      </p>

                      <div className="bg-military-cream border border-military-cream-dark rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-md bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                            <Info className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-extrabold text-military-red-dark">
                            Hướng dẫn nhập thông tin
                          </h3>
                        </div>
                        <ul className="space-y-1.5 text-xs md:text-sm text-foreground-700 leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-military-red shrink-0 mt-1.5"></span>
                            <span>
                              <strong className="text-military-red-dark">Họ và Tên:</strong> ghi đầy đủ họ và tên.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-military-red shrink-0 mt-1.5"></span>
                            <span>
                              Ghi rõ <strong className="text-military-red-dark">cấp bậc</strong> (không viết ký hiệu) và ghi rõ <strong className="text-military-red-dark">chức vụ</strong>.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-military-red shrink-0 mt-1.5"></span>
                            <span>
                              <strong className="text-military-red-dark">Đơn vị:</strong> ví dụ Cơ quan ghi là <em>Phòng Chính trị</em>, Đơn vị ghi là <em>Tiểu đoàn PTKNL</em>. Ghi cấp cơ quan, đơn vị cao nhất trực thuộc Bộ Tham mưu.
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-foreground-800 mb-1.5">Họ và Tên</label>
                          <div className="relative">
                            <User className="w-4 h-4 text-foreground-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-military-cream-dark bg-white focus:border-military-red focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground-800 mb-1.5">Cấp bậc</label>
                          <div className="relative">
                            <Award className="w-4 h-4 text-foreground-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={rank}
                              onChange={(e) => setRank(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-military-cream-dark bg-white focus:border-military-red focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground-800 mb-1.5">Chức vụ</label>
                          <div className="relative">
                            <Briefcase className="w-4 h-4 text-foreground-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={position}
                              onChange={(e) => setPosition(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-military-cream-dark bg-white focus:border-military-red focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground-800 mb-1.5">Đơn vị</label>
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-foreground-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={unit}
                              onChange={(e) => setUnit(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-military-cream-dark bg-white focus:border-military-red focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground-800 mb-1.5">Số điện thoại</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-foreground-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border-2 border-military-cream-dark bg-white focus:border-military-red focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div className="inline-flex items-start gap-2 bg-military-red/5 border border-military-red/40 text-military-red rounded-lg p-3 text-sm mt-4 w-full">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 mt-6 px-8 py-4 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Vào phòng thi
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <p className="text-xs text-foreground-500 text-center mt-3">
                        Bấm vào phòng thi nghĩa là bạn đã sẵn sàng và đồng ý bắt đầu tính giờ.
                      </p>
                    </form>
                  )}
                </>
              )}

              <div className="flex justify-center mt-6">
                <Link
                  to="/competitions"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-military-red-dark font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap"
                >
                  Về danh sách cuộc thi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="relative bg-white rounded-2xl w-full max-w-md border-2 border-military-red/30 overflow-hidden">
            <div className="bg-military-red px-6 py-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
              <h3 className="text-white font-extrabold text-base flex-1">Lưu ý</h3>
              <button
                type="button"
                onClick={dismissNotice}
                aria-label="Đóng"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-foreground-800 leading-relaxed">
                Đề nghị các đồng chí điền đúng thông tin để cơ quan tổ chức đánh giá chính xác nhất.
                <span className="block mt-2 font-bold text-military-red-dark">Trân trọng!</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}