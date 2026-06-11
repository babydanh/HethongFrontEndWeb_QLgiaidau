import { TournamentSeries, SeriesLeg, SeriesStanding, Category } from '@/types/series';

export const mockCategories: Category[] = [
  {
    id: 'cat-doi-nam',
    name: 'Đôi Nam 5.5',
    slug: 'doi-nam-5-5',
    description: 'Tổng điểm DUPR 2 VĐV ≤ 5.5'
  },
  {
    id: 'cat-doi-nam-nu',
    name: 'Đôi Nam Nữ 4.8',
    slug: 'doi-nam-nu-4-8',
    description: 'Tổng điểm DUPR 2 VĐV ≤ 4.8'
  },
  {
    id: 'cat-doi-nu',
    name: 'Đôi Nữ 4.3',
    slug: 'doi-nu-4-3',
    description: 'Tổng điểm DUPR 2 VĐV ≤ 4.3'
  },
  {
    id: 'cat-don-nam',
    name: 'Đơn Nam 2.9',
    slug: 'don-nam-2-9',
    description: 'Điểm DUPR VĐV ≤ 2.9'
  },
  {
    id: 'cat-team-pcl',
    name: 'Đồng Đội PCL 10.0',
    slug: 'dong-doi-pcl-10-0',
    description: 'Đồng đội 4 người (2 Nam, 2 Nữ), tổng DUPR ≤ 10.0'
  }
];

export const mockSeriesList: TournamentSeries[] = [
  {
    id: 'series-1',
    slug: 'superstars-cup-2026',
    name: 'Đường đến Superstars Cup 2026',
    description: `
      <p>Hệ thống giải đấu "Đường đến Superstars Cup 2026" trên TournaHub được vận hành theo mô hình <strong>Chuỗi giải đấu vòng loại tích điểm (League/Tour)</strong> giống như các giải tennis chuyên nghiệp ATP hoặc giải Pickleball hàng đầu MLP, nhưng được áp dụng cho cộng đồng Pickleball phong trào tại Việt Nam.</p>
      <p>Thay vì chỉ tổ chức 1 giải đấu đơn lẻ, Ban tổ chức CLB <strong>Pickleball Superstar</strong> phối hợp cùng các nhà tài trợ tạo ra một hệ thống giải chạy qua nhiều tỉnh thành khác nhau từ Nam ra Bắc (Lâm Đồng, Đà Nẵng, Thanh Hóa, Bình Dương, TP.HCM...).</p>
      <h3>Cơ chế Vận hành cốt lõi:</h3>
      <ul>
        <li><strong>Phân chia theo Chặng (Legs):</strong> Gồm Chặng 1 (Tháng 5-7), Chặng 2 (Tháng 8-10) và Vòng Chung Kết (Tháng 12).</li>
        <li><strong>Vé Thẳng (Direct Entry):</strong> Đội vô địch và Á quân (Top 2) tại mỗi giải đấu thành viên sẽ nhận vé thẳng vào Vòng Chung Kết.</li>
        <li><strong>Luật Khóa Suất (Exclusion Rule):</strong> VĐV đã đạt vé thẳng sẽ bị khóa, không được đăng ký thi đấu các giải tiếp theo thuộc chặng đó nhằm tạo cơ hội bình đẳng cho các VĐV khác.</li>
        <li><strong>Vé Vớt (Wildcards):</strong> Top 16 VĐV có tổng điểm tích lũy PSR cao nhất cuối chặng (chưa có vé thẳng) sẽ được trao suất tham dự Vòng Chung Kết.</li>
      </ul>
    `,
    bannerUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200&auto=format&fit=crop', // Realistic green tennis/pickleball court banner
    logoUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=150&auto=format&fit=crop',
    organizerId: 'org-1',
    status: 'ACTIVE',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    totalPrize: 500000000,
    rules: {
      pointsByRank: {
        1: 100,
        2: 75,
        3: 50,
        5: 30,
        9: 15,
        17: 5
      },
      directEntryThreshold: 2,
      wildcardCount: 16,
      exclusionRule: true,
      exclusionScope: 'CATEGORY',
      description: 'Top 2 nhận vé thẳng & bị khóa đăng ký chặng đó. Top 16 PSR nhận vé vớt.'
    },
    visibility: 'PUBLIC',
    createdAt: '2026-04-15T08:00:00Z',
    updatedAt: '2026-04-15T08:00:00Z',
    organizer: {
      id: 'org-1',
      email: 'contact@superstars.vn',
      fullName: 'CLB Pickleball Superstar',
      avatarUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=80&auto=format&fit=crop',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    _count: {
      legs: 3,
      events: 8
    }
  },
  {
    id: 'series-2',
    slug: 'vietnam-tennis-tour-2026',
    name: 'Vietnam Tennis Tour 2026',
    description: '<p>Chuỗi giải đấu quần vợt phong trào lớn nhất Việt Nam đi qua 5 tỉnh thành miền Trung và miền Nam.</p>',
    bannerUrl: 'https://images.unsplash.com/photo-1592919505780-303950717480?q=80&w=1200&auto=format&fit=crop',
    logoUrl: null,
    organizerId: 'org-2',
    status: 'DRAFT',
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    totalPrize: 200000000,
    rules: {
      pointsByRank: { 1: 100, 2: 60, 3: 40, 5: 20 },
      directEntryThreshold: 1,
      wildcardCount: 8,
      exclusionRule: false,
      exclusionScope: 'CATEGORY',
      description: 'Vô địch nhận vé thẳng. Top 8 PSR nhận vé vớt.'
    },
    visibility: 'PUBLIC',
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: '2026-05-10T09:00:00Z',
    organizer: {
      id: 'org-2',
      email: 'info@vntennistour.vn',
      fullName: 'Diễn đàn Quần vợt Việt Nam',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    _count: {
      legs: 2,
      events: 6
    }
  },
  {
    id: 'series-3',
    slug: 'hanoi-badminton-league-2026',
    name: 'Hanoi Badminton League 2026',
    description: '<p>Giải vô địch cầu lông đồng đội Hà Nội mùa giải 2026 đã khép lại thành công tốt đẹp.</p>',
    bannerUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200&auto=format&fit=crop',
    logoUrl: null,
    organizerId: 'org-3',
    status: 'COMPLETED',
    startDate: '2026-01-01',
    endDate: '2026-04-30',
    totalPrize: 1000000000,
    rules: {
      pointsByRank: { 1: 200, 2: 150, 3: 100 },
      directEntryThreshold: 0,
      wildcardCount: 0,
      exclusionRule: false,
      exclusionScope: 'ALL',
      description: 'Xếp hạng tính điểm theo mùa giải truyền thống.'
    },
    visibility: 'PUBLIC',
    createdAt: '2025-11-20T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    organizer: {
      id: 'org-3',
      email: 'hnbl@badminton.vn',
      fullName: 'Liên đoàn Cầu lông Hà Nội',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    _count: {
      legs: 1,
      events: 12
    }
  }
];

export const mockLegs: Record<string, SeriesLeg[]> = {
  'series-1': [
    {
      id: 'leg-1-1',
      seriesId: 'series-1',
      name: 'Chặng 1: Vòng Tìm Kiếm Tài Năng',
      order: 1,
      startDate: '2026-05-01',
      endDate: '2026-07-31',
      status: 'ONGOING',
      directEntrySlots: 2,
      wildcardSlots: 16,
      rulesOverride: null,
      createdAt: '2026-04-15T08:00:00Z',
      events: [
        {
          id: 'event-1',
          legId: 'leg-1-1',
          tournamentId: 'tour-dalat',
          region: 'Tây Nguyên',
          order: 1,
          pointMultiplier: 1.0,
          createdAt: '2026-04-20T08:00:00Z',
          tournament: {
            id: 'tour-dalat',
            name: 'ĐÀ LẠT - ĐƯỜNG ĐẾN SUPERSTARS CUP - KHU VỰC TÂY NGUYÊN',
            bannerUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=300&auto=format&fit=crop',
            startDate: '2026-05-30',
            endDate: '2026-05-31',
            status: 'COMPLETED',
            format: 'ROUND_ROBIN',
            currency: 'VND',
            categoryId: 'cat-doi-nam',
            organizerId: 'org-1'
          }
        },
        {
          id: 'event-2',
          legId: 'leg-1-1',
          tournamentId: 'tour-danang',
          region: 'Miền Trung',
          order: 2,
          pointMultiplier: 1.0,
          createdAt: '2026-04-20T08:00:00Z',
          tournament: {
            id: 'tour-danang',
            name: 'ĐÀ NẴNG - ĐƯỜNG ĐẾN SUPERSTARS CUP - KHU VỰC MIỀN TRUNG',
            bannerUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=300&auto=format&fit=crop',
            startDate: '2026-06-06',
            endDate: '2026-06-07',
            status: 'COMPLETED',
            format: 'SINGLE_ELIMINATION',
            currency: 'VND',
            categoryId: 'cat-doi-nam',
            organizerId: 'org-1'
          }
        },
        {
          id: 'event-3',
          legId: 'leg-1-1',
          tournamentId: 'tour-baoloc',
          region: 'Tây Nguyên',
          order: 3,
          pointMultiplier: 1.2, // Premium Event
          createdAt: '2026-04-20T08:00:00Z',
          tournament: {
            id: 'tour-baoloc',
            name: 'BẢO LỘC - ĐƯỜNG ĐẾN SUPERSTARS CUP - KHU VỰC TÂY NGUYÊN',
            bannerUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=300&auto=format&fit=crop',
            startDate: '2026-06-13',
            endDate: '2026-06-14',
            status: 'REGISTRATION_OPEN',
            format: 'SINGLE_ELIMINATION',
            currency: 'VND',
            categoryId: 'cat-doi-nam',
            organizerId: 'org-1'
          }
        },
        {
          id: 'event-4',
          legId: 'leg-1-1',
          tournamentId: 'tour-ductrong',
          region: 'Tây Nguyên',
          order: 4,
          pointMultiplier: 1.0,
          createdAt: '2026-04-20T08:00:00Z',
          tournament: {
            id: 'tour-ductrong',
            name: 'ĐỨC TRỌNG - ĐƯỜNG ĐẾN SUPERSTARS CUP - KHU VỰC TÂY NGUYÊN',
            bannerUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=300&auto=format&fit=crop',
            startDate: '2026-06-27',
            endDate: '2026-06-28',
            status: 'UPCOMING',
            format: 'SINGLE_ELIMINATION',
            currency: 'VND',
            categoryId: 'cat-doi-nam',
            organizerId: 'org-1'
          }
        }
      ],
      _count: { events: 4 }
    },
    {
      id: 'leg-1-2',
      seriesId: 'series-1',
      name: 'Chặng 2: Bứt Phá',
      order: 2,
      startDate: '2026-08-01',
      endDate: '2026-10-31',
      status: 'UPCOMING',
      directEntrySlots: 2,
      wildcardSlots: 16,
      rulesOverride: null,
      createdAt: '2026-04-15T08:00:00Z',
      events: [],
      _count: { events: 0 }
    },
    {
      id: 'leg-1-3',
      seriesId: 'series-1',
      name: 'Vòng Chung Kết: Superstars Cup Finals',
      order: 3,
      startDate: '2026-12-10',
      endDate: '2026-12-15',
      status: 'UPCOMING',
      directEntrySlots: 0,
      wildcardSlots: 0,
      rulesOverride: null,
      createdAt: '2026-04-15T08:00:00Z',
      events: [],
      _count: { events: 0 }
    }
  ]
};

export const mockStandings: Record<string, Record<string, SeriesStanding[]>> = {
  // leg-1-1 standings
  'leg-1-1': {
    'cat-doi-nam': [
      {
        id: 'st-1',
        legId: 'leg-1-1',
        userId: 'user-a',
        categoryId: 'cat-doi-nam',
        totalPsrPoints: 175,
        eventsPlayed: 2,
        bestRank: 1,
        directEntry: true,
        wildcardEntry: false,
        lockedOut: true,
        qualifiedEventId: 'event-1',
        updatedAt: '2026-06-08T10:00:00Z',
        user: {
          id: 'user-a',
          email: 'nguyenvana@gmail.com',
          fullName: 'Nguyễn Văn An',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80&auto=format&fit=crop',
          role: 'PLAYER',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        pointLogs: [
          {
            id: 'log-1',
            standingId: 'st-1',
            eventId: 'event-1',
            participantId: 'p-1',
            rankAchieved: 1,
            basePoints: 100,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 100,
            isDirectEntry: true,
            createdAt: '2026-05-31T17:00:00Z'
          },
          {
            id: 'log-2',
            standingId: 'st-1',
            eventId: 'event-2',
            participantId: 'p-2',
            rankAchieved: 2,
            basePoints: 75,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 75,
            isDirectEntry: false,
            createdAt: '2026-06-07T17:00:00Z'
          }
        ]
      },
      {
        id: 'st-2',
        legId: 'leg-1-1',
        userId: 'user-b',
        categoryId: 'cat-doi-nam',
        totalPsrPoints: 150,
        eventsPlayed: 2,
        bestRank: 2,
        directEntry: true,
        wildcardEntry: false,
        lockedOut: true,
        qualifiedEventId: 'event-1',
        updatedAt: '2026-06-08T10:00:00Z',
        user: {
          id: 'user-b',
          email: 'tranb@gmail.com',
          fullName: 'Trần Minh Bình',
          avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80&auto=format&fit=crop',
          role: 'PLAYER',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        pointLogs: [
          {
            id: 'log-3',
            standingId: 'st-2',
            eventId: 'event-1',
            participantId: 'p-3',
            rankAchieved: 2,
            basePoints: 75,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 75,
            isDirectEntry: true,
            createdAt: '2026-05-31T17:00:00Z'
          },
          {
            id: 'log-4',
            standingId: 'st-2',
            eventId: 'event-2',
            participantId: 'p-4',
            rankAchieved: 2,
            basePoints: 75,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 75,
            isDirectEntry: false,
            createdAt: '2026-06-07T17:00:00Z'
          }
        ]
      },
      {
        id: 'st-3',
        legId: 'leg-1-1',
        userId: 'user-c',
        categoryId: 'cat-doi-nam',
        totalPsrPoints: 100,
        eventsPlayed: 2,
        bestRank: 3,
        directEntry: false,
        wildcardEntry: false,
        lockedOut: false,
        qualifiedEventId: null,
        updatedAt: '2026-06-08T10:00:00Z',
        user: {
          id: 'user-c',
          email: 'levanc@gmail.com',
          fullName: 'Lê Văn Cường',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=80&auto=format&fit=crop',
          role: 'PLAYER',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        pointLogs: [
          {
            id: 'log-5',
            standingId: 'st-3',
            eventId: 'event-1',
            participantId: 'p-5',
            rankAchieved: 3,
            basePoints: 50,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 50,
            isDirectEntry: false,
            createdAt: '2026-05-31T17:00:00Z'
          },
          {
            id: 'log-6',
            standingId: 'st-3',
            eventId: 'event-2',
            participantId: 'p-6',
            rankAchieved: 3,
            basePoints: 50,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 50,
            isDirectEntry: false,
            createdAt: '2026-06-07T17:00:00Z'
          }
        ]
      },
      {
        id: 'st-4',
        legId: 'leg-1-1',
        userId: 'user-d',
        categoryId: 'cat-doi-nam',
        totalPsrPoints: 80,
        eventsPlayed: 2,
        bestRank: 5,
        directEntry: false,
        wildcardEntry: false,
        lockedOut: false,
        qualifiedEventId: null,
        updatedAt: '2026-06-08T10:00:00Z',
        user: {
          id: 'user-d',
          email: 'phamd@gmail.com',
          fullName: 'Phạm Hải Dũng',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=80&auto=format&fit=crop',
          role: 'PLAYER',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        pointLogs: [
          {
            id: 'log-7',
            standingId: 'st-4',
            eventId: 'event-1',
            participantId: 'p-7',
            rankAchieved: 5,
            basePoints: 30,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 30,
            isDirectEntry: false,
            createdAt: '2026-05-31T17:00:00Z'
          },
          {
            id: 'log-8',
            standingId: 'st-4',
            eventId: 'event-2',
            participantId: 'p-8',
            rankAchieved: 3,
            basePoints: 50,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 50,
            isDirectEntry: false,
            createdAt: '2026-06-07T17:00:00Z'
          }
        ]
      },
      {
        id: 'st-5',
        legId: 'leg-1-1',
        userId: 'user-e',
        categoryId: 'cat-doi-nam',
        totalPsrPoints: 35,
        eventsPlayed: 2,
        bestRank: 9,
        directEntry: false,
        wildcardEntry: false,
        lockedOut: false,
        qualifiedEventId: null,
        updatedAt: '2026-06-08T10:00:00Z',
        user: {
          id: 'user-e',
          email: 'hoangg@gmail.com',
          fullName: 'Hoàng Quốc Giang',
          avatarUrl: null,
          role: 'PLAYER',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: ''
        },
        pointLogs: [
          {
            id: 'log-9',
            standingId: 'st-5',
            eventId: 'event-1',
            participantId: 'p-9',
            rankAchieved: 9,
            basePoints: 15,
            bonusPoints: 0,
            multiplier: 1.0,
            totalPoints: 15,
            isDirectEntry: false,
            createdAt: '2026-05-31T17:00:00Z'
          },
          {
            id: 'log-10',
            standingId: 'st-5',
            eventId: 'event-2',
            participantId: 'p-10',
            rankAchieved: 9,
            basePoints: 15,
            bonusPoints: 5, // 5 points attendance bonus
            multiplier: 1.0,
            totalPoints: 20,
            isDirectEntry: false,
            createdAt: '2026-06-07T17:00:00Z'
          }
        ]
      }
    ],
    'cat-doi-nam-nu': []
  }
};
