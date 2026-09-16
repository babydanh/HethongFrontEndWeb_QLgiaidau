'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  MessageSquare,
  Share2,
  Trophy,
  Flame,
  Award,
  Calendar,
  Sparkles,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface SocialActivityItem {
  id: string;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    tierName?: string;
    elo?: number;
    clubName?: string;
  };
  type: 'MATCH_RESULT' | 'RANK_UP' | 'POST' | 'TOURNAMENT_JOIN';
  createdAt: string;
  content: string;
  mediaUrls?: string[];
  matchDetails?: {
    tournamentName?: string;
    score: string;
    opponentName: string;
    isWin: boolean;
    eloChange: number;
    sport: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

const SAMPLE_ACTIVITIES: SocialActivityItem[] = [
  {
    id: 'act-1',
    author: {
      id: 'u-1',
      fullName: 'Nguyễn Minh Danh',
      avatarUrl: null,
      tierName: 'Tier 5',
      elo: 1833,
      clubName: 'VNDC Sport',
    },
    type: 'MATCH_RESULT',
    createdAt: '15 phút trước',
    content: 'Trận bán kết đôi nam Pickleball quá kịch tính! Cảm ơn người anh em Tuấn Hùng đã bọc lót cực kỳ xuất sắc ở set quyết định.',
    matchDetails: {
      tournamentName: 'Giải Pickleball Tranh Cúp Hà Anh Lần 1',
      score: '11-9, 8-11, 11-7',
      opponentName: 'Hải Nam / Văn Toàn',
      isWin: true,
      eloChange: +24,
      sport: 'Pickleball',
    },
    likesCount: 18,
    commentsCount: 5,
    isLiked: true,
  },
  {
    id: 'act-2',
    author: {
      id: 'u-2',
      fullName: 'Hoàng Bách',
      avatarUrl: null,
      tierName: 'NTRP 3.5',
      elo: 1640,
      clubName: 'Lan Anh Tennis',
    },
    type: 'RANK_UP',
    createdAt: '1 giờ trước',
    content: 'Chính thức thăng hạng NTRP 3.5 sau chuỗi 5 trận toàn thắng tuần này! Mục tiêu tiếp theo là giải Lan Anh Autumn Cup 🚀🎾',
    likesCount: 32,
    commentsCount: 9,
    isLiked: false,
  },
  {
    id: 'act-3',
    author: {
      id: 'u-3',
      fullName: 'Vũ Đức',
      avatarUrl: null,
      tierName: 'Hạng B',
      elo: 1520,
      clubName: 'Kỳ Hòa Badminton',
    },
    type: 'POST',
    createdAt: '3 giờ trước',
    content: 'Tối nay 20:00 sân Kỳ Hòa Q10 có ai rảnh vào giao lưu đôi nam không? Bên mình có 2 người rồi, đánh vui vẻ nước non nhé!',
    likesCount: 12,
    commentsCount: 7,
    isLiked: false,
  },
];

export default function HomeSocialFeed() {
  const [activities, setActivities] = useState<SocialActivityItem[]>(SAMPLE_ACTIVITIES);
  const [newPostText, setNewPostText] = useState('');

  const handleLike = (id: string) => {
    setActivities((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextLiked = !item.isLiked;
          return {
            ...item,
            isLiked: nextLiked,
            likesCount: item.likesCount + (nextLiked ? 1 : -1),
          };
        }
        return item;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newPost: SocialActivityItem = {
      id: `act-${Date.now()}`,
      author: {
        id: 'me',
        fullName: 'Tôi',
        avatarUrl: null,
        tierName: 'Thành viên',
        elo: 1500,
      },
      type: 'POST',
      createdAt: 'Vừa xong',
      content: newPostText.trim(),
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
    };

    setActivities([newPost, ...activities]);
    setNewPostText('');
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Quick Post Composer Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              ME
            </div>
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Chia sẻ khoảnh khắc thi đấu, kết quả trận đấu hoặc tìm người giao lưu..."
              rows={2}
              className="w-full text-sm text-slate-800 placeholder:text-slate-400 border-none resize-none focus:outline-none focus:ring-0 bg-transparent py-1.5"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Hoạt động Player</span>
              </span>
            </div>
            <button
              type="submit"
              disabled={!newPostText.trim()}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đăng tin</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Feed Stream */}
      <div className="space-y-3">
        {activities.map((item) => {
          const initials = (item.author.fullName.trim().slice(0, 2) || 'MD').toUpperCase();
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Header: Author + Tier + Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {item.author.avatarUrl ? (
                      <img src={item.author.avatarUrl} alt={item.author.fullName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug hover:text-blue-600 cursor-pointer">
                        {item.author.fullName}
                      </h4>
                      {item.author.tierName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                          {item.author.tierName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span>{item.createdAt}</span>
                      {item.author.clubName && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-600">{item.author.clubName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Content text */}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {item.content}
              </p>

              {/* Match Result Banner if type is MATCH_RESULT */}
              {item.type === 'MATCH_RESULT' && item.matchDetails && (
                <div className="rounded-xl p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-0.5">
                      <Trophy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.matchDetails.tournamentName}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      Đối đầu: <span className="font-bold text-slate-800">{item.matchDetails.opponentName}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Tỷ số set: <span className="font-bold text-blue-700">{item.matchDetails.score}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-extrabold shadow-2xs">
                      +{item.matchDetails.eloChange} ELO
                    </span>
                  </div>
                </div>
              )}

              {/* Rank Up Banner */}
              {item.type === 'RANK_UP' && (
                <div className="rounded-xl p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/70 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Thăng Hạng Thành Tích
                    </h5>
                    <p className="text-xs text-amber-800 font-medium mt-0.5">
                      Đạt mức xếp hạng {item.author.tierName} • ELO {item.author.elo}
                    </p>
                  </div>
                </div>
              )}

              {/* Action row (Like, Comment, Share) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => handleLike(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    item.isLiked ? 'text-rose-600 bg-rose-50 font-bold' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${item.isLiked ? 'fill-rose-600' : ''}`} />
                  <span>{item.likesCount} Thích</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{item.commentsCount} Bình luận</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Chia sẻ</span>
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
