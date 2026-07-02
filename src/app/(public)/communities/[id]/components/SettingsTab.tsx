'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Save, Check, X, Users, Globe, Lock, ShieldAlert, 
  Plus, Search, Image as ImageIcon, Loader2, Mail, UserPlus, 
  Trash2, ShieldCheck, MapPin, AlignLeft, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Community, communitiesApi, CommunityMemberRecord } from '@/features/communities/api';
import { uploadApi } from '@/features/upload/api';
import { usersApi } from '@/features/users/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface JoinRequest {
  id: string;
  joinedAt: string;
  joinAnswers?: Record<string, string>;
  user?: {
    email?: string;
    profile?: { fullName?: string };
  };
}



interface UserSearchResult {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export default function SettingsTab({ community }: { community: Community }) {
  // General Form States
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [rules, setRules] = useState(community.rules || '');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'RESTRICTED' | 'PRIVATE'>(community.visibility || 'PUBLIC');
  const [joinMode, setJoinMode] = useState<'OPEN' | 'APPROVAL' | 'INVITE_ONLY'>(community.joinMode || 'OPEN');
  const [maxMembers, setMaxMembers] = useState(community.maxMembers || '');
  const [locationAddress, setLocationAddress] = useState(community.locationAddress || '');
  
  // Cascade Regions States
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  
  const [provinceCode, setProvinceCode] = useState(community.provinceCode || '');
  const [districtCode, setDistrictCode] = useState(community.districtCode || '');
  const [wardCode, setWardCode] = useState(community.wardCode || '');

  // Categories Selection
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    community.categories?.map(c => c.id) || []
  );

  // Logo & Banner
  const [logoUrl, setLogoUrl] = useState(community.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(community.bannerUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Join Questions
  const [joinQuestions, setJoinQuestions] = useState<string[]>(community.joinQuestions || []);
  const [newQuestion, setNewQuestion] = useState('');

  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(community.socialLinks || {});
  const [newSocialType, setNewSocialType] = useState('facebook');
  const [newSocialLabel, setNewSocialLabel] = useState('');
  const [newSocialValue, setNewSocialValue] = useState('');

  const handleAddSocialLink = () => {
    if (!newSocialValue.trim()) {
      toast.error('Vui lòng nhập giá trị liên kết.');
      return;
    }
    const finalKey = newSocialType === 'custom' ? newSocialLabel.trim() : newSocialType;
    if (!finalKey) {
      toast.error('Vui lòng nhập nhãn liên kết.');
      return;
    }
    setSocialLinks({
      ...socialLinks,
      [finalKey]: newSocialValue.trim()
    });
    setNewSocialValue('');
    setNewSocialLabel('');
    toast.success('Đã thêm liên hệ mới!');
  };

  const handleRemoveSocialLink = (key: string) => {
    const next = { ...socialLinks };
    delete next[key];
    setSocialLinks(next);
    toast.success('Đã xóa liên hệ!');
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteCommunity = async () => {
    const confirmName = prompt(`Để xác nhận xoá, vui lòng nhập chính xác tên câu lạc bộ: "${community.name}"`);
    if (confirmName !== community.name) {
      if (confirmName !== null) {
        toast.error('Tên câu lạc bộ nhập vào không khớp. Huỷ thao tác xoá.');
      }
      return;
    }
    
    try {
      setIsDeleting(true);
      await communitiesApi.deleteCommunity(community.id);
      toast.success('Đã xoá câu lạc bộ thành công.');
      router.push('/communities');
    } catch (error) {
      console.error('Delete community error', error);
      toast.error('Lỗi khi thực hiện xoá câu lạc bộ.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch cascade regions and categories on mount
  useEffect(() => {
    // Categories
    categoriesApi.getCategories()
      .then(res => setAllCategories(res.data || res || []))
      .catch(err => console.error('Failed to load categories', err));

    // Provinces
    regionsApi.getProvinces()
      .then(setProvinces)
      .catch(err => console.error('Failed to load provinces', err));
  }, []);

  // Fetch districts when provinceCode changes
  useEffect(() => {
    if (provinceCode) {
      regionsApi.getDistricts(provinceCode)
        .then(setDistricts)
        .catch(err => console.error('Failed to load districts', err));
    } else {
      if (districts.length > 0) {
        Promise.resolve().then(() => {
          setDistricts([]);
        });
      }
      if (wards.length > 0) {
        Promise.resolve().then(() => {
          setWards([]);
        });
      }
    }
  }, [provinceCode]);

  // Fetch wards when districtCode changes
  useEffect(() => {
    if (districtCode) {
      regionsApi.getWards(districtCode)
        .then(setWards)
        .catch(err => console.error('Failed to load wards', err));
    } else {
      if (wards.length > 0) {
        Promise.resolve().then(() => {
          setWards([]);
        });
      }
    }
  }, [districtCode]);

  // Image Upload handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'logo') setIsUploadingLogo(true);
      else setIsUploadingBanner(true);

      const res = await uploadApi.uploadImage(file);
      if (type === 'logo') {
        setLogoUrl(res.url);
        toast.success('Tải ảnh Logo thành công!');
      } else {
        setBannerUrl(res.url);
        toast.success('Tải ảnh Bìa thành công!');
      }
    } catch (error) {
      console.error('Failed to upload image', error);
      toast.error('Lỗi tải ảnh lên.');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingBanner(false);
    }
  };

  // Add/Remove Questions
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setJoinQuestions([...joinQuestions, newQuestion.trim()]);
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    setJoinQuestions(joinQuestions.filter((_, idx) => idx !== index));
  };

  // Toggle Category
  const handleToggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên câu lạc bộ.');
      return;
    }
    if (!provinceCode) {
      toast.error('Vui lòng chọn tỉnh/thành phố.');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 môn thể thao.');
      return;
    }

    try {
      setIsSaving(true);
      const provinceName = provinces.find(p => p.code === provinceCode)?.name || '';
      const districtName = districts.find(d => d.code === districtCode)?.name || '';
      const combinedAddress = [districtName, provinceName].filter(Boolean).join(', ');

      const updateData = {
        name,
        description,
        rules,
        visibility,
        joinMode,
        maxMembers: maxMembers ? Number(maxMembers) : null,
        locationAddress: combinedAddress,
        provinceCode,
        districtCode: districtCode || null,
        wardCode: null,
        categoryIds: selectedCategoryIds,
        logoUrl,
        bannerUrl,
        joinQuestions,
        socialLinks,
      };

      await communitiesApi.updateCommunity(community.id, updateData);
      toast.success('Cập nhật cài đặt câu lạc bộ thành công!');
      
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Save settings error', error);
      toast.error('Lỗi khi lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT & CENTER: Form Settings */}
      <div className="lg:col-span-2 space-y-8">
        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
            <Settings className="w-5 h-5 text-emerald-600" />
            Cài đặt chung
          </h3>
          
          <div className="space-y-6">
            {/* Tên & Mô tả */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên câu lạc bộ *</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                  placeholder="Tên nhóm của bạn..." 
                  type="text" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
                <RichTextEditor 
                  value={description}
                  onChange={(data) => setDescription(data)}
                  placeholder="Giới thiệu về mục đích hoạt động, lịch sinh hoạt..." 
                />
              </div>
            </div>

            {/* Logo & Banner Custom styling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ảnh đại diện / Logo của câu lạc bộ</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={logoInputRef} 
                      onChange={(e) => handleUploadFile(e, 'logo')} 
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="border-slate-200 text-slate-700 text-xs py-1.5 px-3 h-auto"
                    >
                      Chọn ảnh
                    </Button>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ảnh bìa nhóm (Cover)</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/30 to-teal-800/30 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={bannerInputRef} 
                      onChange={(e) => handleUploadFile(e, 'banner')} 
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="border-slate-200 text-slate-700 text-xs py-1.5 px-3 h-auto"
                    >
                      Chọn ảnh
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Môn thể thao (Categories) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Môn thể thao hoạt động *</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isSelected 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Liên kết mạng xã hội & Liên hệ khác */}
            <div className="border-t pt-5 mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Liên kết mạng xã hội & Liên hệ khác</label>
              
              {/* Current list */}
              <div className="space-y-2">
                {Object.entries(socialLinks).map(([key, val]) => {
                  const displayLabel = key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div key={key} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-650 min-w-[100px]">{displayLabel}:</span>
                      <span className="text-sm text-slate-800 flex-grow truncate">{val}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(key)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {Object.keys(socialLinks).length === 0 && (
                  <p className="text-xs text-slate-400 italic">Chưa có liên kết liên hệ nào.</p>
                )}
              </div>

              {/* Add Form */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Loại liên kết</label>
                  <select
                    value={newSocialType}
                    onChange={(e) => {
                      setNewSocialType(e.target.value);
                      if (e.target.value !== 'custom') {
                        setNewSocialLabel('');
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-750 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-11"
                  >
                    <option value="facebook">Facebook</option>
                    <option value="zalo">Zalo</option>
                    <option value="website">Website</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">Tiktok</option>
                    <option value="custom">Khác (Tự nhập nhãn)...</option>
                  </select>
                </div>

                {newSocialType === 'custom' && (
                  <div className="flex-1 w-full space-y-1 animate-in fade-in slide-in-from-left-2 duration-150">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nhãn liên kết</label>
                    <input
                      type="text"
                      placeholder="Telegram, Viber,..."
                      value={newSocialLabel}
                      onChange={(e) => setNewSocialLabel(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-755 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-11"
                    />
                  </div>
                )}

                <div className="flex-[2] w-full space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Đường dẫn / Giá trị</label>
                  <input
                    type="text"
                    placeholder="Link liên kết hoặc giá trị"
                    value={newSocialValue}
                    onChange={(e) => setNewSocialValue(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-755 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 h-11"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 w-full sm:w-auto text-xs shrink-0 rounded-lg"
                >
                  Thêm
                </Button>
              </div>
            </div>

            {/* Khu vực hoạt động */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Khu vực hoạt động *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <select
                  value={provinceCode}
                  onChange={(e) => {
                    setProvinceCode(e.target.value);
                    setDistrictCode('');
                    setWardCode('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">-- Tỉnh/Thành --</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>

                <select
                  value={districtCode}
                  onChange={(e) => {
                    setDistrictCode(e.target.value);
                    setWardCode('');
                  }}
                  disabled={!provinceCode}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:opacity-50"
                >
                  <option value="">-- Quận/Huyện --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Quyền riêng tư & Cách thức tham gia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Visibility */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Quyền riêng tư</label>
                <div className="space-y-2">
                  {[
                    { val: 'PUBLIC', label: 'Công khai', desc: 'Ai cũng có thể tìm thấy nhóm và xem bài viết.', icon: Globe },
                    { val: 'RESTRICTED', label: 'Hạn chế', desc: 'Có thể tìm thấy nhóm, nhưng bài viết chỉ cho thành viên.', icon: ShieldAlert },
                    { val: 'PRIVATE', label: 'Riêng tư', desc: 'Ẩn khỏi danh sách tìm kiếm công cộng, chỉ vào qua link mời.', icon: Lock }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <label 
                        key={item.val} 
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          visibility === item.val 
                            ? 'bg-emerald-50/50 border-emerald-300' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="visibility" 
                          value={item.val} 
                          checked={visibility === item.val}
                          onChange={() => setVisibility(item.val as 'PUBLIC' | 'RESTRICTED' | 'PRIVATE')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500" 
                        />
                        <div>
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                            {item.label}
                          </span>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Join Mode */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cách thức tham gia</label>
                <div className="space-y-2">
                  {[
                    { val: 'OPEN', label: 'Mở tự do', desc: 'Thành viên nhấn nút tham gia sẽ vào ngay lập tức.' },
                    { val: 'APPROVAL', label: 'Cần phê duyệt đơn', desc: 'Người tham gia cần trả lời câu hỏi và chờ chủ nhóm duyệt.' },
                    { val: 'INVITE_ONLY', label: 'Chỉ nhận qua lời mời', desc: 'Chỉ những thành viên được quản trị viên mời mới có thể vào.' }
                  ].map(item => (
                    <label 
                      key={item.val} 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        joinMode === item.val 
                          ? 'bg-emerald-50/50 border-emerald-300' 
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="joinMode" 
                        value={item.val} 
                        checked={joinMode === item.val}
                        onChange={() => setJoinMode(item.val as 'OPEN' | 'APPROVAL' | 'INVITE_ONLY')}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">{item.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Giới hạn số lượng thành viên & Nội quy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số thành viên tối đa</label>
                <input 
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                  placeholder="Không giới hạn" 
                  type="number" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4 text-emerald-600" />
                  Nội quy câu lạc bộ
                </label>
                <textarea 
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                  placeholder="Quy định ứng xử, thời gian sinh hoạt, đóng phí..." 
                />
              </div>
            </div>

            {/* Câu hỏi tuyển thành viên (Chỉ hiện khi chọn APPROVAL) */}
            {joinMode === 'APPROVAL' && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
                  Câu hỏi dành cho người muốn tham gia
                </label>
                <p className="text-xs text-slate-500 -mt-2">Giúp lọc thành viên phù hợp bằng cách yêu cầu họ trả lời khi nhấn nút xin vào nhóm.</p>
                
                <div className="space-y-2">
                  {joinQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                      <span className="text-sm text-slate-700 flex-grow">{q}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Xoá câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="flex-grow px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                    placeholder="Nhập câu hỏi mới..." 
                    type="text" 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion(); } }}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddQuestion}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Thêm
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-6 border-t flex justify-end gap-4">
              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Lưu cài đặt
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-6 md:p-8">
          <h3 className="text-xl font-bold text-red-950 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-700" />
            Vùng nguy hiểm
          </h3>
          <p className="text-sm text-red-700 mb-6 leading-relaxed">
            Hành động này sẽ xóa vĩnh viễn Câu lạc bộ này khỏi hệ thống cùng với toàn bộ thành viên, hình ảnh và lịch sử giải đấu. Hành động này không thể hoàn tác.
          </p>
          <Button 
            onClick={handleDeleteCommunity}
            disabled={isSaving || isDeleting}
            className="bg-red-650 hover:bg-red-700 text-white border-0 shadow-sm"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Xoá Câu lạc bộ
          </Button>
        </div>
      </div>

      <div className="lg:col-span-1" />
    </div>
  );
}
