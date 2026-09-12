import { Link } from "react-router-dom";
import { Play, Calendar, Clock, Eye, Flame, Lock } from "lucide-react";
import type { Competition } from "@/lib/supabase";

const STATUS_LABEL: Record<string, string> = {
  open: "Đang Mở",
  coming: "Sắp Diễn Ra",
  closed: "Đã Kết Thúc",
};

function getStatusStyle(status: string) {
  switch (status) {
    case "open":
      return "bg-military-green text-white";
    case "coming":
      return "bg-military-gold text-military-red-dark";
    case "closed":
      return "bg-military-cream-dark text-foreground-700";
    default:
      return "bg-gray-200 text-gray-700";
  }
}

const FALLBACK_IMAGE =
  "https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/94a28b807ae05919136bec56b7af93af.png";

export default function CompetitionCard({ comp }: { comp: Competition }) {
  const isOpen = comp.status === "open";
  const isComing = comp.status === "coming";

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-military-cream-dark hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <img
          src={comp.image_url || FALLBACK_IMAGE}
          alt={comp.title}
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(comp.status)}`}>
            {STATUS_LABEL[comp.status] || comp.status}
          </span>
          {comp.featured && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-red text-white flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Nổi bật
            </span>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-military-red-dark mb-2 group-hover:text-military-red transition-colors line-clamp-2">
          {comp.title}
        </h3>
        <p className="text-foreground-700 text-sm mb-4 line-clamp-2">
          {comp.description || "Tham gia cuộc thi để ôn tập, kiểm tra kiến thức."}
        </p>
        {comp.require_login && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-military-gold-dark bg-military-gold/15 border border-military-gold/40 rounded-full px-3 py-1 mb-4">
            <Lock className="w-3.5 h-3.5" />
            Cần đăng nhập tài khoản cán bộ
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600 mb-4">
          {comp.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{comp.start_date}{comp.end_date ? ` - ${comp.end_date}` : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{comp.time_limit_minutes} phút</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isOpen ? (
            <Link
              to={`/competition/${comp.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              Tham gia
            </Link>
          ) : isComing ? (
            <span className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-military-cream-dark text-military-red-dark text-sm font-bold rounded-lg cursor-default whitespace-nowrap">
              Sắp mở
            </span>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-military-cream-dark text-foreground-700 text-sm font-bold rounded-lg cursor-default whitespace-nowrap">
              Đã kết thúc
            </span>
          )}
          <Link
            to={`/competition/${comp.id}`}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-military-cream-dark text-sm font-bold rounded-lg hover:bg-military-red/5 text-military-red-dark transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}