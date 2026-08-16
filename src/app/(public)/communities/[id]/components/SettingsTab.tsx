'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Save, Globe, Lock, ShieldAlert,
  Plus, Image as ImageIcon, Loader2,
  Trash2, AlignLeft, ListChecks,
  Users, Activity, ShieldCheck, HelpCircle,
  Share2, MapPin, CheckCircle2, ChevronRight,
  Sliders, MessageSquare, Tag, Eye, Award, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Community, communitiesApi } from '@/features/communities/api';
import type { CommunitySocialSettings } from '@/types/community-social';
import { uploadApi } from '@/features/upload/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import RichTextEditor from '@/components/ui/RichTextEditor';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SettingsTab({ community }: { community: Community }) {
  // General Form States
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [rules, setRules] = useState(community.rules || '');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'RESTRICTED' | 'PRIVATE'>(community.visibility || 'PUBLIC');
  const [joinMode, setJoinMode] = useState<'OPEN' | 'APPROVAL' | 'INVITE_ONLY'>(community.joinMode || 'OPEN');
  const [maxMembers, setMaxMembers] = useState(community.maxMembers || '');
  
  // Cascade Regions States
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  
  const [provinceCode, setProvinceCode] = useState(community.provinceCode || '');
  const [districtCode, setDistrictCode] = useState(community.districtCode || '');
  const [wardCode, setWardCode] = useState(community.wardCode || '');
  const [locationAddress, setLocationAddress] = useState(community.locationAddress || '');

  // Categories Selection
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    community.categories?.map(c => c.id).slice(0, 1) || []
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
  const [socialSettings, setSocialSettings] = useState<CommunitySocialSettings>({ postingPolicy: 'MEMBERS', postApprovalRequired: false, commentsEnabled: true, chatEnabled: true, publicFeed: true, memberTaggingPolicy: 'MEMBERS' });
  const [tagPresets, setTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#E2E8F0');
  const [isTagLibraryOpen, setIsTagLibraryOpen] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const router = useRouter();

  const handleDeleteCommunity = async () => {
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

  useEffect(() => {
    communitiesApi.getSocialSettings(community.id).then((response) => setSocialSettings(response.data)).catch(() => undefined);
  }, [community.id]);

  useEffect(() => {
    void communitiesApi.getTagPresets(community.id).then((response) => setTagPresets(response.data ?? [])).catch(() => undefined);
  }, [community.id]);

  const handleCreateTagPreset = async () => {
    const nameValue = newTagName.trim();
    if (!nameValue) return;
    try {
      const response = await communitiesApi.createTagPreset(community.id, { name: nameValue, color: newTagColor });
      if (response.data) setTagPresets((current) => [...current, response.data!]);
      setNewTagName('');
      toast.success('Đã tạo tag preset.');
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const handleDeleteTagPreset = async (presetId: string) => {
    try {
      await communitiesApi.deleteTagPreset(community.id, presetId);
      setTagPresets((current) => current.filter((preset) => preset.id !== presetId));
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const saveSocialSettings = async () => {
    try {
      setIsSavingSocial(true);
      const response = await communitiesApi.updateSocialSettings(community.id, socialSettings);
      setSocialSettings(response.data);
      toast.success('Đã lưu cài đặt sinh hoạt CLB.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể lưu cài đặt social.'));
    } finally {
      setIsSavingSocial(false);
    }
  };

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
    setSelectedCategoryIds([id]);
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
    if (selectedCategoryIds.length !== 1) {
      toast.error('Câu lạc bộ phải có đúng 1 môn thể thao chính.');
      return;
    }

    try {
      setIsSaving(true);
      const provinceName = provinces.find(p => p.code === provinceCode)?.name || '';
      const districtName = districts.find(d => d.code === districtCode)?.name || '';
      const wardName = wards.find(w => w.code === wardCode)?.name || '';
      
      const adminPart = [wardName, districtName, provinceName].filter(Boolean).join(', ');
      const detail = locationAddress.trim();
      let combinedAddress = '';
      if (detail) {
        // Nếu người dùng nhập tên sân/số nhà riêng chưa có tên quận/tỉnh thì ghép kèm vào
        if (adminPart && !detail.includes(provinceName) && !detail.includes(districtName)) {
          combinedAddress = `${detail}, ${adminPart}`;
        } else {
          combinedAddress = detail;
        }
      } else {
        combinedAddress = adminPart;
      }

      const updateData = {
        name,
        description,
        rules,
        visibility,
        joinMode,
        maxMembers: maxMembers ? Number(maxMembers) : null,
        locationAddress: combinedAddress || null,
        provinceCode,
        districtCode: districtCode || null,
        wardCode: wardCode || null,
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
    <div className="space-y-8">
      {/* SECTION 1: Cài đặt Sinh hoạt & Tương tác CLB */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sinh hoạt & Tương tác CLB</h3>
              <p className="text-xs text-slate-500">Thiết lập quyền đăng bài, phê duyệt bài viết, tính năng chat và tag thành viên.</p>
            </div>
          </div>
          <Button 
            type="button" 
            onClick={() => void saveSocialSettings()} 
            disabled={isSavingSocial} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSavingSocial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu cài đặt sinh hoạt
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cột 1: Quyền hạn */}
          <div className="space-y-4 rounded-xl border border-slate-150 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sliders className="h-3.5 w-3.5" />
              Quyền hạn & Chính sách
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quyền đăng bài</label>
                <select 
                  value={socialSettings.postingPolicy} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, postingPolicy: event.target.value as CommunitySocialSettings['postingPolicy'] }))} 
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="MEMBERS">Tất cả thành viên</option>
                  <option value="ADMINS">Chỉ Ban quản trị (BQT)</option>
                  <option value="OFF">Tắt tính năng đăng bài</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quyền gắn thẻ (Tag)</label>
                <select 
                  value={socialSettings.memberTaggingPolicy} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, memberTaggingPolicy: event.target.value as CommunitySocialSettings['memberTaggingPolicy'] }))} 
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="MEMBERS">Thành viên có thể tag</option>
                  <option value="ADMINS">Chỉ Ban quản trị (BQT)</option>
                  <option value="OFF">Tắt gắn thẻ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cột 2: Bật/Tắt tính năng */}
          <div className="space-y-3 rounded-xl border border-slate-150 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              Tính năng cộng đồng
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={socialSettings.postApprovalRequired} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, postApprovalRequired: event.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" 
                />
                <span>Kiểm duyệt bài viết thành viên</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={socialSettings.commentsEnabled} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, commentsEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" 
                />
                <span>Cho phép bình luận bài viết</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={socialSettings.chatEnabled} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, chatEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" 
                />
                <span>Mở phòng Chat nội bộ CLB</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={socialSettings.publicFeed} 
                  onChange={(event) => setSocialSettings((current) => ({ ...current, publicFeed: event.target.checked }))}
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" 
                />
                <span>Công khai bảng tin cho khách vãng lai</span>
              </label>
            </div>
          </div>

          {/* Cột 3: Tag Danh hiệu Thành viên */}
          <div className="space-y-3 rounded-xl border border-slate-150 bg-slate-50/50 p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Tag className="h-3.5 w-3.5 text-blue-600" />
                  Tag danh hiệu thành viên
                </div>
                <button
                  type="button"
                  onClick={() => setIsTagLibraryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition shadow-2xs cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5 text-blue-600" />
                  Kho danh hiệu mẫu
                </button>
              </div>
              
              <p className="text-xs text-slate-500">Tạo nhãn vinh danh (MVP tuần, Đội trưởng, Thủ môn xuất sắc...).</p>

              <div className="flex gap-2">
                <input 
                  value={newTagName} 
                  onChange={(event) => setNewTagName(event.target.value)} 
                  maxLength={24} 
                  placeholder="VD: MVP tuần" 
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
                <input 
                  type="color" 
                  value={newTagColor} 
                  onChange={(event) => setNewTagColor(event.target.value)} 
                  aria-label="Màu tag" 
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5 shadow-sm" 
                />
                <Button 
                  type="button" 
                  onClick={handleCreateTagPreset} 
                  aria-label="Tạo tag" 
                  className="bg-blue-600 hover:bg-blue-700 px-3 text-white h-8 text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto">
                {tagPresets.length === 0 ? (
                  <span className="text-[11px] italic text-slate-400">Chưa tạo tag nào. Nhấn "Kho danh hiệu mẫu" hoặc tự nhập tên để tạo tag mới.</span>
                ) : (
                  tagPresets.map((preset) => (
                    <span 
                      key={preset.id} 
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm border border-slate-200/60" 
                      style={{ backgroundColor: preset.color, color: '#1e293b' }}
                    >
                      {preset.name}
                      <button 
                        type="button" 
                        onClick={() => handleDeleteTagPreset(preset.id)} 
                        aria-label={`Xóa ${preset.name}`}
                        className="text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Grid Form Cài Đặt Chung + Sidebar Gợi Ý */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* MAIN: Form Cài Đặt Chính (Chiếm 2 cột) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Thông tin cơ bản CLB</h3>
                  <p className="text-xs text-slate-500">Tùy chỉnh thông tin nhận diện, vị trí, quyền riêng tư và quy chế tham gia.</p>
                </div>
              </div>
            </div>

            {/* Block 1: Tên, Mô tả, Môn thể thao */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên câu lạc bộ <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                  placeholder="Nhập tên câu lạc bộ..." 
                  type="text" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mô tả & Giới thiệu chi tiết
                </label>
                <RichTextEditor 
                  value={description}
                  onChange={(data) => setDescription(data)}
                  placeholder="Giới thiệu về mục đích hoạt động, lịch sinh hoạt cố định..." 
                />
              </div>

              {/* Logo & Banner Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Logo */}
                <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Ảnh đại diện (Logo)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden bg-white flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-slate-300" />
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
                        className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-1.5 px-3 h-auto shadow-sm"
                      >
                        {isUploadingLogo ? 'Đang tải...' : 'Thay đổi logo'}
                      </Button>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPG tỉ lệ 1:1</p>
                    </div>
                  </div>
                </div>

                {/* Banner */}
                <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Ảnh bìa CLB (Cover Banner)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-28 h-16 rounded-lg border-2 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                      {bannerUrl ? (
                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
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
                        className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-1.5 px-3 h-auto shadow-sm"
                      >
                        {isUploadingBanner ? 'Đang tải...' : 'Thay đổi ảnh bìa'}
                      </Button>
                      <p className="text-[10px] text-slate-400 mt-1">Khuyên dùng 1200x400 px</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Môn thể thao chính */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Môn thể thao chính <span className="text-rose-500">*</span>
                </label>
                <p className="mb-2.5 text-xs text-slate-500">Mỗi CLB gắn liền với một môn thể thao trọng tâm.</p>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(cat => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-sm ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Block 2: Khu vực hoạt động */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Địa điểm & Khu vực hoạt động <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={provinceCode}
                  onChange={(e) => {
                    setProvinceCode(e.target.value);
                    setDistrictCode('');
                    setWardCode('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-sm focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Tỉnh / Thành phố --</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>

                <select
                  value={districtCode}
                  onChange={(e) => {
                    setDistrictCode(e.target.value);
                    setWardCode('');
                  }}
                  disabled={!provinceCode}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">-- Quận / Huyện --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>

                <select
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                  disabled={!districtCode}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">-- Phường / Xã --</option>
                  {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Địa chỉ sân nhà / địa điểm sinh hoạt cụ thể (VD: Sân Thể Thao Tuổi Trẻ, Số 123 Lê Lợi...)"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Block 3: Quyền riêng tư & Cách tham gia */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quyền riêng tư */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    Quyền riêng tư
                  </label>
                  <div className="space-y-2">
                    {[
                      { val: 'PUBLIC', label: 'Công khai', desc: 'Mọi người đều tìm thấy và xem được thông tin.', icon: Globe },
                      { val: 'RESTRICTED', label: 'Hạn chế', desc: 'Tìm thấy CLB nhưng nội dung chỉ dành cho thành viên.', icon: ShieldAlert },
                      { val: 'PRIVATE', label: 'Riêng tư', desc: 'Ẩn khỏi tìm kiếm, chỉ tham gia qua đường link mời.', icon: Lock }
                    ].map(item => {
                      const Icon = item.icon;
                      const isChecked = visibility === item.val;
                      return (
                        <label 
                          key={item.val} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${
                            isChecked 
                              ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-300' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="visibility" 
                            value={item.val} 
                            checked={isChecked}
                            onChange={() => setVisibility(item.val as 'PUBLIC' | 'RESTRICTED' | 'PRIVATE')}
                            className="mt-1 text-blue-600 focus:ring-blue-500" 
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              {item.label}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Cách thức tham gia */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Cách thức tham gia
                  </label>
                  <div className="space-y-2">
                    {[
                      { val: 'OPEN', label: 'Mở tự do', desc: 'Thành viên nhấn tham gia là vào nhóm ngay.' },
                      { val: 'APPROVAL', label: 'Cần phê duyệt đơn', desc: 'Phải trả lời câu hỏi và chờ BQT chấp thuận.' },
                      { val: 'INVITE_ONLY', label: 'Chỉ nhận lời mời', desc: 'Chỉ thành viên được mời mới có thể tham gia.' }
                    ].map(item => {
                      const isChecked = joinMode === item.val;
                      return (
                        <label 
                          key={item.val} 
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${
                            isChecked 
                              ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-300' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="joinMode" 
                            value={item.val} 
                            checked={isChecked}
                            onChange={() => setJoinMode(item.val as 'OPEN' | 'APPROVAL' | 'INVITE_ONLY')}
                            className="mt-1 text-blue-600 focus:ring-blue-500" 
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900">{item.label}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Giới hạn thành viên & Nội quy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên tối đa</label>
                  <input 
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 shadow-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                    placeholder="Không giới hạn" 
                    type="number" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
                    Nội quy câu lạc bộ
                  </label>
                  <textarea 
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={6}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none leading-relaxed resize-y" 
                    placeholder="Nhập chi tiết quy định ứng xử, thời gian sinh hoạt, thể lệ đóng quỹ, quy định điểm danh..." 
                  />
                </div>
              </div>

              {/* Câu hỏi tuyển thành viên khi chọn APPROVAL */}
              {joinMode === 'APPROVAL' && (
                <div className="rounded-xl border border-blue-150 bg-blue-50/40 p-4 space-y-3 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-blue-600" />
                    Câu hỏi xét duyệt thành viên
                  </label>
                  <p className="text-xs text-slate-600">Thành viên bắt buộc phải trả lời những câu hỏi này khi gửi đơn xin vào CLB.</p>
                  
                  <div className="space-y-2">
                    {joinQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-blue-600 w-5 text-center">{idx + 1}</span>
                        <span className="text-xs font-medium text-slate-800 flex-grow">{q}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                          title="Xoá câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input 
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-grow px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 bg-white shadow-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                      placeholder="Nhập câu hỏi (VD: Trình độ ELO / DUPR hiện tại của bạn là bao nhiêu?)..." 
                      type="text" 
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion(); } }}
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddQuestion}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-8 text-xs font-semibold shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Block 4: Liên kết mạng xã hội */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                Mạng xã hội & Kênh liên hệ
              </label>
              
              {/* Danh sách link hiện có */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(socialLinks).map(([key, val]) => {
                  const displayLabel = key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div key={key} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 min-w-[70px]">{displayLabel}:</span>
                      <span className="text-xs text-slate-600 flex-grow truncate">{val}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(key)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Form thêm link */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-center">
                <select
                  value={newSocialType}
                  onChange={(e) => {
                    setNewSocialType(e.target.value);
                    if (e.target.value !== 'custom') setNewSocialLabel('');
                  }}
                  className="w-full sm:w-36 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium text-slate-800 shadow-sm outline-none focus:border-blue-500 h-9"
                >
                  <option value="facebook">Facebook</option>
                  <option value="zalo">Zalo</option>
                  <option value="website">Website</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">Tiktok</option>
                  <option value="custom">Khác...</option>
                </select>

                {newSocialType === 'custom' && (
                  <input
                    type="text"
                    placeholder="Tên kênh (Telegram, Viber...)"
                    value={newSocialLabel}
                    onChange={(e) => setNewSocialLabel(e.target.value)}
                    className="w-full sm:w-36 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 h-9"
                  />
                )}

                <input
                  type="text"
                  placeholder="Đường dẫn liên kết hoặc số điện thoại..."
                  value={newSocialValue}
                  onChange={(e) => setNewSocialValue(e.target.value)}
                  className="flex-1 w-full border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-xs font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 h-9"
                />

                <Button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 h-9 w-full sm:w-auto shrink-0 rounded-lg shadow-sm"
                >
                  Thêm liên kết
                </Button>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Lưu toàn bộ cài đặt
              </Button>
            </div>
          </div>

          {/* Vùng nguy hiểm */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 text-rose-900">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-bold">Vùng nguy hiểm</h3>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Hành động này sẽ xóa vĩnh viễn Câu lạc bộ này cùng toàn bộ bài viết, bảng xếp hạng và lịch sử giải đấu. Không thể hoàn tác sau khi xác nhận.
            </p>
            <div>
              <Button 
                onClick={() => {
                  setDeleteConfirmName('');
                  setIsDeleteConfirmOpen(true);
                }}
                disabled={isSaving || isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Xoá vĩnh viễn Câu lạc bộ
              </Button>
            </div>
          </div>
        </div>

        {/* SIDEBAR: Sticky Gợi Ý Thiết Lập & Tiện Ích CLB (Chiếm 1 cột, bám theo khi cuộn trang) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-24 space-y-6">
            {/* Card 1: Gợi ý tối ưu hồ sơ CLB */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 p-6 shadow-sm">
              <div className="mb-4">
                <h4 className="font-bold text-sm text-slate-900">Gợi ý thiết lập CLB</h4>
                <p className="text-[11px] text-slate-500">Mẹo thu hút thêm nhiều thành viên</p>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Hình ảnh bắt mắt</strong>
                    <span>Logo sắc nét và ảnh bìa chụp sân tập hoặc giải đấu sẽ giúp CLB trông uy tín và chuyên nghiệp hơn.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Mô tả rõ ràng</strong>
                    <span>Nêu rõ trình độ người chơi, khung giờ sinh hoạt cố định trong tuần và chi phí tham gia (nếu có).</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-semibold block mb-0.5">Duyệt thành viên</strong>
                    <span>Bật chế độ phê duyệt đơn kèm câu hỏi phân loại nếu CLB giới hạn trình độ kỹ năng hoặc số lượng người.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Trạng thái & Tóm tắt nhanh */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Trạng thái hoạt động</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between text-slate-600">
                  <span>Quyền riêng tư:</span>
                  <strong className="text-slate-900">{visibility === 'PUBLIC' ? 'Công khai' : visibility === 'RESTRICTED' ? 'Hạn chế' : 'Riêng tư'}</strong>
                </div>
                <div className="py-2 flex justify-between text-slate-600">
                  <span>Gia nhập:</span>
                  <strong className="text-slate-900">{joinMode === 'OPEN' ? 'Tự do' : joinMode === 'APPROVAL' ? 'Duyệt đơn' : 'Lời mời'}</strong>
                </div>
                <div className="py-2 flex justify-between text-slate-600">
                  <span>Phòng Chat CLB:</span>
                  <strong className={socialSettings.chatEnabled ? 'text-blue-600' : 'text-slate-400'}>{socialSettings.chatEnabled ? 'Đang mở' : 'Đang tắt'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tag Library Modal Popup */}
      {isTagLibraryOpen && (
        <div 
          onClick={() => setIsTagLibraryOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kho danh hiệu & Nhãn thành viên mẫu</h3>
                  <p className="text-xs text-slate-500">Chọn danh hiệu mẫu để tự động điền vào ô tạo tag nhanh chóng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTagLibraryOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Categories List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {[
                {
                  category: '⚽ Bóng đá & Thể thao sân cỏ',
                  desc: 'Vinh danh kỹ năng, vị trí và đóng góp trong trận đấu',
                  tags: [
                    { name: '🔥 Vua phá lưới', color: '#bbf7d0' },
                    { name: '🧤 Bàn tay vàng', color: '#bfdbfe' },
                    { name: '⚡ Chân chuyền ma thuật', color: '#ddd6fe' },
                    { name: '🛡️ Lá chắn thép', color: '#cbd5e1' },
                    { name: '🎯 Thợ săn siêu phẩm', color: '#fed7aa' },
                    { name: '🦿 Bác sĩ cột dọc', color: '#fbcfe8' },
                  ]
                },
                {
                  category: '🏓 Pickleball, Cầu lông & Tennis',
                  desc: 'Danh hiệu chuyên môn cho các tay vợt xuất sắc',
                  tags: [
                    { name: '🏓 Vua Dinking', color: '#fed7aa' },
                    { name: '💥 Smash sấm sét', color: '#fef08a' },
                    { name: '🎾 Bậc thầy bỏ nhỏ', color: '#bbf7d0' },
                    { name: '🚀 Giao bóng Ace', color: '#bfdbfe' },
                    { name: '🧱 Tường thành lưới', color: '#e2e8f0' },
                  ]
                },
                {
                  category: '🤣 Hài hước & Giao lưu phong trào (Meme)',
                  desc: 'Tăng tính gắn kết, tạo tiếng cười và phong trào sôi nổi trong CLB',
                  tags: [
                    { name: '🤣 Chúa hề CLB', color: '#fbcfe8' },
                    { name: '🍻 Vua bàn nhậu', color: '#fde68a' },
                    { name: '⏰ Chiến thần cao su', color: '#fed7aa' },
                    { name: '🗣️ Bình luận viên dạo', color: '#ddd6fe' },
                    { name: '📸 Idol sống ảo', color: '#fce7f3' },
                    { name: '💸 Chúa tể quên tiền quỹ', color: '#fecdd3' },
                    { name: '🏃‍♂️ Chạy bằng niềm tin', color: '#e0e7ff' },
                  ]
                },
                {
                  category: '👑 Vinh danh & Cống hiến',
                  desc: 'Dành tặng cho ban cán sự, thành viên kỳ cựu và gương mẫu',
                  tags: [
                    { name: '👑 Đội trưởng gương mẫu', color: '#fed7aa' },
                    { name: '🔥 MVP của tuần', color: '#fef08a' },
                    { name: '🍀 Thần tài may mắn', color: '#a7f3d0' },
                    { name: '🌟 Chiến binh bền bỉ', color: '#fed7aa' },
                    { name: '🤝 Cây hài gắn kết', color: '#bfdbfe' },
                    { name: '💎 Thành viên kỳ cựu', color: '#c7d2fe' },
                  ]
                }
              ].map((group) => (
                <div key={group.category} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {group.category}
                    </h4>
                    <span className="text-[11px] text-slate-400">{group.desc}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {group.tags.map((sug) => {
                      const isExisting = tagPresets.some((p) => p.name === sug.name);
                      return (
                        <button
                          key={sug.name}
                          type="button"
                          disabled={isExisting}
                          onClick={() => {
                            setNewTagName(sug.name);
                            setNewTagColor(sug.color);
                            setIsTagLibraryOpen(false);
                            toast.success(`Đã chọn "${sug.name}"! Nhấn dấu "+" để tạo tag.`);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border shadow-2xs cursor-pointer ${
                            isExisting
                              ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 active:scale-95'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: sug.color }} />
                          {sug.name}
                          {isExisting && <span className="text-[10px] text-slate-400 font-normal">(Đã có)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-150 px-6 py-3.5 bg-slate-50/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTagLibraryOpen(false)}
                className="text-xs font-semibold px-4 cursor-pointer"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Community Confirmation Modal */}
      <ConfirmModal
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setDeleteConfirmName('');
        }}
        title="Xoá vĩnh viễn câu lạc bộ"
        description={`Bạn có chắc chắn muốn xoá câu lạc bộ "${community.name}"? Toàn bộ dữ liệu thành viên, bài viết và hoạt động sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá vĩnh viễn"
        variant="danger"
        confirmDisabled={deleteConfirmName.trim() !== community.name.trim()}
        isLoading={isDeleting}
        onConfirm={handleDeleteCommunity}
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Nhập tên câu lạc bộ <span className="text-rose-600 font-bold">{community.name}</span> để xác nhận:
          </label>
          <input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder="Nhập chính xác tên câu lạc bộ..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
