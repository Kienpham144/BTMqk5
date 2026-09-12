import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Competition from "../pages/competition/page";
import CompetitionList from "../pages/competition/CompetitionList";
import Login from "../pages/login/page";
import Admin from "../pages/admin/page";
import NewsDetail from "../pages/news/NewsDetail";
import NewsListPage from "../pages/news/NewsListPage";
import Materials from "../pages/materials/page";
import Videos from "../pages/videos/page";
import Feedback from "../pages/feedback/page";
import ProfilePage from "../pages/profile/page";
import ChatPage from "../pages/chat/page";
import RankingPage from "../pages/ranking/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/party-building",
    element: <NewsListPage category="Công tác xây dựng Đảng" title="Công Tác Xây Dựng Đảng" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/mass-work",
    element: <NewsListPage category="Công tác quần chúng, dân vận, chính sách" title="Công Tác Quần Chúng, Dân Vận, Chính Sách" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/competitions",
    element: <CompetitionList />,
  },
  {
    path: "/materials",
    element: <Materials />,
  },
  {
    path: "/videos",
    element: <Videos />,
  },
  {
    path: "/feedback",
    element: <Feedback />,
  },
  {
    path: "/results",
    element: <NewsListPage category="Học tập và làm theo Bác" title="Học Tập Và Làm Theo Bác" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/news",
    element: <NewsListPage title="Bản Tin Thời Sự" subtitle="Các hoạt động, sự kiện nổi bật của Bộ Tham mưu Quân khu 5" />,
  },
  {
    path: "/pho-bien-phap-luat",
    element: <NewsListPage category="Phổ biến pháp luật tuyên truyền" title="Phổ Biến Pháp Luật Tuyên Truyền" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/loi-bac-day",
    element: <NewsListPage category="Lời Bác dạy" title="Lời Bác Dạy" subtitle="Tuyên truyền giáo dục - Pháp luật" thumbnail="https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/4a87df9f2b66bd7fef2950a3cb8893e1.png" />,
  },
  {
    path: "/moi-tuan-mot-dieu-luat",
    element: <NewsListPage category="Mỗi tuần một điều luật" title="Mỗi Tuần Một Điều Luật" subtitle="Tuyên truyền giáo dục - Pháp luật" />,
  },
  {
    path: "/bao-ve-nen-tang-tu-tuong",
    element: <NewsListPage category="Bảo vệ nền tảng tư tưởng của Đảng" title="Bảo Vệ Nền Tảng Tư Tưởng Của Đảng" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/about",
    element: <NewsListPage category="Văn hóa, câu lạc bộ" title="Văn Hóa, Câu Lạc Bộ" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/thi-dua-khen-thuong",
    element: <NewsListPage category="Thi đua khen thưởng" title="Thi Đua Khen Thưởng" subtitle="Tin tức - Sự kiện" />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
  {
    path: "/chat",
    element: <ChatPage />,
  },
  {
    path: "/bang-xep-hang",
    element: <RankingPage />,
  },
  {
    path: "/terms",
    element: <Home />,
  },
  {
    path: "/privacy",
    element: <Home />,
  },
  {
    path: "/news/:id",
    element: <NewsDetail />,
  },
  {
    path: "/competition/:id",
    element: <Competition />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;