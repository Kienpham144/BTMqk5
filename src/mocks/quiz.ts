export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Bộ Tham mưu Quân khu 5 được thành lập vào ngày tháng năm nào?",
    options: ["19/12/1945", "19/12/1946", "22/12/1944", "19/08/1945"],
    answer: 1,
    explanation: "Bộ Tham mưu Quân khu 5 được thành lập ngày 19/12/1946, đánh dấu mốc quan trọng trong quá trình xây dựng và phát triển lực lượng vũ trang Quân khu 5.",
  },
  {
    id: 2,
    question: "Năm 2026 là kỷ niệm bao nhiêu năm thành lập Bộ Tham mưu Quân khu 5?",
    options: ["70 năm", "75 năm", "80 năm", "85 năm"],
    answer: 2,
    explanation: "Từ năm 1946 đến năm 2026 là tròn 80 năm xây dựng, chiến đấu và trưởng thành của Bộ Tham mưu Quân khu 5.",
  },
  {
    id: 3,
    question: "Chức năng chính của Bộ Tham mưu Quân khu là gì?",
    options: ["Tổ chức huấn luyện, sẵn sàng chiến đấu", "Quản lý tài chính đơn vị", "Phụ trách công tác dân vận", "Quản lý quân trang quân dụng"],
    answer: 0,
    explanation: "Bộ Tham mưu là cơ quan tham mưu tác chiến, giúp Tư lệnh Quân khu tổ chức chỉ huy huấn luyện và sẵn sàng chiến đấu.",
  },
  {
    id: 4,
    question: "Nhiệm vụ trọng tâm của lực lượng vũ trang Quân khu 5 hiện nay là gì?",
    options: ["Xây dựng nền quốc phòng toàn dân", "Phát triển kinh tế thị trường", "Đẩy mạnh xuất nhập khẩu", "Xây dựng hạ tầng đô thị"],
    answer: 0,
    explanation: "Xây dựng nền quốc phòng toàn dân, thế trận quốc phòng toàn dân gắn với thế trận an ninh nhân dân là nhiệm vụ trọng tâm.",
  },
  {
    id: 5,
    question: "Điều lệnh quản lý bộ đội quy định quân nhân phải thực hiện tốt điều gì?",
    options: ["Kỷ luật quân đội", "Tự do cá nhân", "Kinh doanh riêng", "Giải trí cá nhân"],
    answer: 0,
    explanation: "Kỷ luật quân đội là sức mạnh của quân đội, quân nhân phải nghiêm chỉnh chấp hành pháp luật và điều lệnh.",
  },
  {
    id: 6,
    question: "Ai là người chỉ huy cao nhất của Quân khu?",
    options: ["Chính ủy Quân khu", "Tư lệnh Quân khu", "Chủ nhiệm Chính trị", "Tham mưu trưởng"],
    answer: 1,
    explanation: "Tư lệnh Quân khu là người chỉ huy cao nhất của Quân khu, chịu trách nhiệm trước Đảng và Nhà nước về lực lượng vũ trang Quân khu.",
  },
  {
    id: 7,
    question: "Truyền thống nổi bật của Quân đội nhân dân Việt Nam là gì?",
    options: ["Trung với Đảng, hiếu với dân", "Mưu lược kinh doanh", "Hợp tác quốc tế", "Thương mại điện tử"],
    answer: 0,
    explanation: "Truyền thống 'Trung với Đảng, hiếu với dân' là truyền thống vẻ vang của Quân đội nhân dân Việt Nam.",
  },
  {
    id: 8,
    question: "Tác phong quân nhân được thể hiện qua điều gì?",
    options: ["Đi đứng, chào hỏi, xưng hô đúng điều lệnh", "Ăn mặc tự do theo sở thích", "Tác phong tùy tiện", "Không cần lễ tiết"],
    answer: 0,
    explanation: "Tác phong quân nhân thể hiện qua việc đi đứng, chào hỏi, xưng hô, mang mặc đúng điều lệnh quân đội.",
  },
  {
    id: 9,
    question: "Quân khu 5 phụ trách địa bàn chủ yếu nào?",
    options: ["Nam Trung Bộ và Tây Nguyên", "Đồng bằng sông Hồng", "Đồng bằng sông Cửu Long", "Trung du miền núi phía Bắc"],
    answer: 0,
    explanation: "Quân khu 5 phụ trách địa bàn các tỉnh Nam Trung Bộ và Tây Nguyên, là địa bàn chiến lược quan trọng.",
  },
  {
    id: 10,
    question: "Ý nghĩa của việc tổ chức cuộc thi tìm hiểu 80 năm Bộ Tham mưu Quân khu 5 là gì?",
    options: ["Giáo dục truyền thống, nâng cao nhận thức", "Giải trí đơn thuần", "Kinh doanh quảng bá", "Thi đấu thể thao"],
    answer: 0,
    explanation: "Cuộc thi nhằm giáo dục truyền thống cách mạng, nâng cao nhận thức cho cán bộ, chiến sĩ toàn Quân khu.",
  },
];