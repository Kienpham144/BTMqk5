import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Image as ImageIcon } from "lucide-react";
import type { NewsPost } from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

interface NewsCardProps {
  item: NewsPost;
  tagLabel?: string;
  onOpen?: (item: NewsPost) => void;
}

export default function NewsCard({ item, tagLabel, onOpen }: NewsCardProps) {
  const tag = tagLabel || item.category;

  const content = (
    <>
      <div className="relative h-48 overflow-hidden bg-military-cream">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-military-gold-dark bg-military-cream">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-green text-white">
            {tag}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-military-red-dark mb-3 group-hover:text-military-red transition-colors line-clamp-2 uppercase leading-snug">
          {item.title}
        </h3>
        {item.content && (
          <p className="text-sm text-foreground-700 mb-4 line-clamp-2">{item.content}</p>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-military-cream-dark pt-3">
          <div className="flex items-center gap-1 text-xs text-foreground-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(item.created_at)}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-military-green hover:text-military-green-dark transition-colors whitespace-nowrap">
            Xem
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </>
  );

  const cardClass =
    "group bg-white rounded-xl overflow-hidden border border-military-cream-dark hover:shadow-xl transition-all duration-300 hover:-translate-y-1";

  if (onOpen) {
    return (
      <button
        onClick={() => onOpen(item)}
        className={`${cardClass} block w-full text-left h-full cursor-pointer`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cardClass}>
      <Link to={`/news/${item.id}`} className="block h-full">
        {content}
      </Link>
    </div>
  );
}